import json
import logging

from fastapi import FastAPI, Header, HTTPException, Request, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.config import settings
from app.schemas import (
    AgentRunRequest,
    AgentRunResponse,
    AgentSandboxRequest,
    AgentSandboxResponse,
    BaileysNotifyRequest,
    BaileysNotifyResponse,
    BaileysGroupsResponse,
    KnowledgeProcessRequest,
    KnowledgeProcessResponse,
    WhatsappTemplateSyncRequest,
    WhatsappTemplateSyncResponse,
    UazapiHistorySyncRequest,
    UazapiHistorySyncResponse,
    WebhookProcessRequest,
    WebhookProcessResponse,
)
from app.services.agent_runner import run_agent, run_agent_sandbox
from app.services.media import extract_upload_text_bytes
from app.services.knowledge import process_knowledge_file
from app.services.whatsapp_ingestion import process_whatsapp_event
from app.services.whatsapp_templates import sync_whatsapp_templates
from app.workers.tasks import (
    process_knowledge_task,
    process_whatsapp_event_task,
    process_instagram_event_task,
    process_whatsapp_event_media_task,
    run_agent_buffered_task,
    run_agent_task,
    sync_whatsapp_templates_task,
)
from app.clients.supabase import get_supabase_client
from app.clients.redis_client import get_redis_client
from app.services.realtime import (
    emit_attachment_created,
    emit_conversation_updated,
    emit_message_created,
)
from app.clients.baileys_client import BaileysClient

logging.basicConfig(level=logging.INFO)
# Reuse uvicorn logger so logs always surface in the dev server output.
logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)

app = FastAPI(title="VP CRM Agents", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


def _require_api_key(x_agents_key: str | None) -> None:
    if settings.agents_api_key and x_agents_key != settings.agents_api_key:
        logger.warning(
            "agents_auth_failed has_key=%s",
            bool(x_agents_key),
        )
        raise HTTPException(status_code=401, detail="Unauthorized")


def _find_active_agent(workspace_id: str, integration_account_id: str) -> str | None:
    supabase = get_supabase_client()
    response = (
        supabase.table("agents")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("integration_account_id", integration_account_id)
        .eq("status", "ativo")
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0]["id"] if data else None


def _enqueue_agents(workspace_id: str | None, integration_account_id: str | None, conversation_ids: list[str]) -> None:
    if not workspace_id or not integration_account_id or not conversation_ids:
        return
    agent_id = _find_active_agent(workspace_id, integration_account_id)
    if not agent_id:
        return
    for conversation_id in conversation_ids:
        run_agent_task.delay(agent_id, conversation_id)


def _load_agent_dispatch_config(workspace_id: str, integration_account_id: str) -> dict | None:
    supabase = get_supabase_client()
    response = (
        supabase.table("agents")
        .select("id, tempo_resposta_segundos, configuracao")
        .eq("workspace_id", workspace_id)
        .eq("integration_account_id", integration_account_id)
        .eq("status", "ativo")
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0] if data else None


def _agent_allows_groups(agent: dict | None) -> bool:
    if not agent:
        return False
    cfg = agent.get("configuracao") or {}
    try:
        return bool(cfg.get("enviar_para_grupos", False))
    except Exception:
        return False


def _agent_group_allowlist(agent: dict | None) -> set[str] | None:
    if not agent:
        return None
    cfg = agent.get("configuracao") or {}
    if not isinstance(cfg, dict) or "grupos_permitidos" not in cfg:
        return None
    raw = cfg.get("grupos_permitidos")
    if not isinstance(raw, list):
        return set()
    values = {str(item).strip() for item in raw if isinstance(item, str) and item.strip()}
    return values


def _resolve_conversation_phone(conversation_id: str) -> str | None:
    supabase = get_supabase_client()
    conversation = (
        supabase.table("conversations")
        .select("id, lead_id, contact_id, canal")
        .eq("id", conversation_id)
        .single()
        .execute()
        .data
    )
    if not conversation:
        return None
    if conversation.get("canal") == "instagram":
        if conversation.get("lead_id"):
            lead = (
                supabase.table("leads")
                .select("whatsapp_wa_id, telefone")
                .eq("id", conversation["lead_id"])
                .single()
                .execute()
                .data
            )
            if lead:
                return lead.get("whatsapp_wa_id") or lead.get("telefone")
        return None
    if conversation.get("contact_id"):
        contact = (
            supabase.table("contacts")
            .select("telefone")
            .eq("id", conversation["contact_id"])
            .single()
            .execute()
            .data
        )
        return contact.get("telefone") if contact else None
    if conversation.get("lead_id"):
        lead = (
            supabase.table("leads")
            .select("telefone")
            .eq("id", conversation["lead_id"])
            .single()
            .execute()
            .data
        )
        return lead.get("telefone") if lead else None
    return None


@app.post(
    "/integrations/whatsapp-baileys/notify",
    response_model=BaileysNotifyResponse,
)
def notify_baileys_message(
    body: BaileysNotifyRequest,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    logger.info(
        "baileys_notify_received workspace_id=%s integration_account_id=%s conversation_id=%s is_group=%s text_chars=%s",
        body.workspace_id,
        body.integration_account_id,
        body.conversation_id,
        bool(body.is_group) if body.is_group is not None else False,
        len((body.text or "").strip()),
    )

    if body.message_row_id:
        supabase = get_supabase_client()
        message = (
            supabase.table("messages")
            .select(
                "id, conversation_id, autor, tipo, conteudo, created_at, interno, sender_id, sender_nome, sender_avatar_url, quoted_message_id, quoted_autor, quoted_sender_id, quoted_sender_nome, quoted_tipo, quoted_conteudo"
            )
            .eq("id", body.message_row_id)
            .single()
            .execute()
            .data
        )
        if message:
            emit_message_created(
                body.workspace_id,
                message.get("conversation_id") or body.conversation_id,
                {
                    "id": message.get("id"),
                    "autor": message.get("autor"),
                    "tipo": message.get("tipo"),
                    "conteudo": message.get("conteudo"),
                    "created_at": message.get("created_at"),
                    "interno": message.get("interno"),
                    "sender_id": message.get("sender_id"),
                    "sender_nome": message.get("sender_nome"),
                    "sender_avatar_url": message.get("sender_avatar_url"),
                    "quoted_message_id": message.get("quoted_message_id"),
                    "quoted_autor": message.get("quoted_autor"),
                    "quoted_sender_id": message.get("quoted_sender_id"),
                    "quoted_sender_nome": message.get("quoted_sender_nome"),
                    "quoted_tipo": message.get("quoted_tipo"),
                    "quoted_conteudo": message.get("quoted_conteudo"),
                },
            )
            emit_conversation_updated(
                body.workspace_id,
                message.get("conversation_id") or body.conversation_id,
                {
                    "ultima_mensagem": message.get("conteudo") or body.text or "",
                    "ultima_mensagem_em": message.get("created_at"),
                },
            )

            attachments = (
                supabase.table("attachments")
                .select("id, storage_path, tipo, tamanho_bytes")
                .eq("message_id", body.message_row_id)
                .execute()
                .data
            )
            for attachment in attachments or []:
                emit_attachment_created(
                    body.workspace_id,
                    message.get("conversation_id") or body.conversation_id,
                    body.message_row_id,
                    {
                        "id": attachment.get("id"),
                        "storage_path": attachment.get("storage_path"),
                        "tipo": attachment.get("tipo"),
                        "tamanho_bytes": attachment.get("tamanho_bytes"),
                    },
                )

    agent = _load_agent_dispatch_config(body.workspace_id, body.integration_account_id)
    if not agent:
        logger.info(
            "baileys_notify_skipped workspace_id=%s integration_account_id=%s conversation_id=%s reason=no_agent",
            body.workspace_id,
            body.integration_account_id,
            body.conversation_id,
        )
        return {"status": "no_agent", "agent_id": None, "conversation_id": body.conversation_id}

    is_group = bool(body.is_group) if body.is_group is not None else False
    if is_group and not _agent_allows_groups(agent):
        logger.info(
            "baileys_notify_skipped agent_id=%s conversation_id=%s reason=group_disabled",
            agent.get("id"),
            body.conversation_id,
        )
        return {
            "status": "skipped_group",
            "agent_id": agent.get("id"),
            "conversation_id": body.conversation_id,
        }
    if is_group:
        allowlist = _agent_group_allowlist(agent)
        if allowlist is not None:
            phone = _resolve_conversation_phone(body.conversation_id)
            if not phone or phone not in allowlist:
                logger.info(
                    "baileys_notify_skipped agent_id=%s conversation_id=%s reason=group_not_allowed",
                    agent.get("id"),
                    body.conversation_id,
                )
                return {
                    "status": "skipped_group",
                    "agent_id": agent.get("id"),
                    "conversation_id": body.conversation_id,
                }

    delay_seconds = int(agent.get("tempo_resposta_segundos") or 30)
    delay_seconds = max(1, min(delay_seconds, 180))

    redis = get_redis_client()
    version_key = f"baileys:buffer:v:{agent['id']}:{body.conversation_id}"
    list_key = f"baileys:buffer:l:{agent['id']}:{body.conversation_id}"

    version = int(redis.incr(version_key))
    redis.expire(version_key, delay_seconds + 300)
    payload = {
        "message_row_id": body.message_row_id,
        "message_external_id": body.message_external_id,
        "text": body.text,
    }
    redis.rpush(list_key, json.dumps(payload, ensure_ascii=False))
    redis.expire(list_key, delay_seconds + 300)

    logger.info(
        "baileys_buffered agent_id=%s conversation_id=%s version=%s delay_seconds=%s",
        agent.get("id"),
        body.conversation_id,
        version,
        delay_seconds,
    )
    run_agent_buffered_task.apply_async(
        args=[agent["id"], body.conversation_id, version, delay_seconds],
        countdown=delay_seconds,
    )

    return {
        "status": "buffered",
        "agent_id": agent.get("id"),
        "conversation_id": body.conversation_id,
    }


@app.get(
    "/integrations/whatsapp-baileys/groups",
    response_model=BaileysGroupsResponse,
)
def list_baileys_groups(
    integration_account_id: str,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    supabase = get_supabase_client()
    provider = (
        supabase.table("integration_accounts")
        .select("provider")
        .eq("id", integration_account_id)
        .limit(1)
        .execute()
        .data
    )
    provider_value = provider[0].get("provider") if provider else None
    if provider_value != "whatsapp_baileys":
        raise HTTPException(status_code=400, detail="Integration account is not Baileys")
    client = BaileysClient(integration_account_id)
    try:
        data = client.list_groups()
    except Exception:
        raise HTTPException(status_code=502, detail="Baileys service error")
    total = int(data.get("total") or 0) if isinstance(data, dict) else 0
    groups = data.get("groups") if isinstance(data, dict) else []
    return {"total": total, "groups": groups or []}


@app.post("/agents/{agent_id}/run", response_model=AgentRunResponse)
def run_agent_endpoint(
    agent_id: str,
    body: AgentRunRequest,
    background: bool = True,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    logger.info(
        "agent_run_request agent_id=%s conversation_id=%s background=%s input_chars=%s",
        agent_id,
        body.conversation_id,
        background,
        len((body.input_text or "").strip()),
    )
    if background:
        task = run_agent_task.delay(agent_id, body.conversation_id, body.input_text)
        return {"run_id": task.id, "status": "queued"}

    result = run_agent(agent_id, body.conversation_id, body.input_text)
    if result.get("status") == "failed":
        raise HTTPException(status_code=500, detail="Agent run failed")

    return {"run_id": result.get("run_id") or "", "status": result.get("status", "ok")}


@app.post("/agents/{agent_id}/knowledge/process", response_model=KnowledgeProcessResponse)
def process_knowledge_endpoint(
    agent_id: str,
    body: KnowledgeProcessRequest,
    background: bool = True,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    if background:
        task = process_knowledge_task.delay(body.file_id)
        return {"file_id": body.file_id, "status": f"queued:{task.id}"}

    result = process_knowledge_file(body.file_id)
    if not result:
        raise HTTPException(status_code=500, detail="Knowledge processing failed")
    return {"file_id": body.file_id, "status": "processed"}


@app.post("/agents/{agent_id}/sandbox", response_model=AgentSandboxResponse)
async def sandbox_agent_endpoint(
    agent_id: str,
    request: Request,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    messages: list[dict] = []
    input_text = ""

    content_type = request.headers.get("content-type") or ""
    logger.info("sandbox_request content_type=%s", content_type)
    if "multipart/form-data" in content_type:
        form = await request.form()
        input_text = (form.get("message") or form.get("input_text") or "").strip()
        messages_raw = form.get("messages")
        if messages_raw:
            try:
                parsed = json.loads(messages_raw)
                if isinstance(parsed, list):
                    messages = parsed
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid messages payload")

        form_items = list(form.multi_items())
        arquivos: list[UploadFile] = [
            item for _, item in form_items if isinstance(item, StarletteUploadFile)
        ]
        if not arquivos:
            logger.info(
                "sandbox_form_items=%s",
                [(key, type(value).__name__) for key, value in form_items],
            )
        logger.info("sandbox_files_total=%s", len(arquivos))
        textos_arquivos: list[str] = []
        for arquivo in arquivos:
            data = await arquivo.read()
            try:
                texto = extract_upload_text_bytes(
                    data,
                    arquivo.filename,
                    arquivo.content_type,
                )
            except Exception:
                texto = ""
            texto = texto.strip() or f"Arquivo recebido: {arquivo.filename or 'arquivo'}"
            textos_arquivos.append(f"[{arquivo.filename or 'arquivo'}]\n{texto}")

        if textos_arquivos:
            bloco = "\n\n".join(textos_arquivos)
            if messages and messages[-1].get("role") == "user":
                messages[-1]["content"] = (
                    f"{messages[-1].get('content', '')}\n\n{bloco}".strip()
                )
            elif input_text:
                messages.append({"role": "user", "content": f"{input_text}\n\n{bloco}"})
            else:
                messages.append({"role": "user", "content": bloco})
    else:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        body = AgentSandboxRequest.model_validate(payload) if payload else None
        if body:
            messages = [{"role": msg.role, "content": msg.content} for msg in body.messages]
            input_text = body.input_text or ""

    if not messages and input_text:
        messages = [{"role": "user", "content": input_text}]
    if not messages:
        raise HTTPException(status_code=400, detail="Sandbox requires messages")

    result = run_agent_sandbox(agent_id, messages)
    if result.get("status") != "ok":
        raise HTTPException(status_code=500, detail="Sandbox failed")
    return result


@app.post("/webhooks/whatsapp/process", response_model=WebhookProcessResponse)
def process_whatsapp_webhook(
    body: WebhookProcessRequest,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    logger.info("webhook_whatsapp_process event_id=%s", body.event_id)
    result = process_whatsapp_event(body.event_id, process_media=False)
    conversation_ids = result.get("conversation_ids") or []
    logger.info(
        "webhook_whatsapp_processed event_id=%s workspace_id=%s integration_account_id=%s conversations=%s blocked=%s",
        body.event_id,
        result.get("workspace_id"),
        result.get("integration_account_id"),
        len(conversation_ids),
        len(conversation_ids) == 0,
    )
    _enqueue_agents(
        result.get("workspace_id"),
        result.get("integration_account_id"),
        conversation_ids,
    )
    process_whatsapp_event_media_task.delay(body.event_id)
    return {"event_id": body.event_id, "status": "processed_inline"}


@app.post("/webhooks/instagram/process", response_model=WebhookProcessResponse)
def process_instagram_webhook(
    body: WebhookProcessRequest,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    task = process_instagram_event_task.delay(body.event_id)
    return {"event_id": body.event_id, "status": f"queued:{task.id}"}


@app.post("/webhooks/whatsapp-nao-oficial/process", response_model=WebhookProcessResponse)
def process_uazapi_webhook(
    body: WebhookProcessRequest,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    raise HTTPException(status_code=410, detail="UAZAPI desativado.")


@app.post(
    "/integrations/whatsapp/templates/sync",
    response_model=WhatsappTemplateSyncResponse,
)
def sync_whatsapp_templates_endpoint(
    body: WhatsappTemplateSyncRequest,
    background: bool = True,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    if background:
        task = sync_whatsapp_templates_task.delay(
            body.workspace_id, body.integration_account_id
        )
        return {"status": f"queued:{task.id}", "templates": 0}

    result = sync_whatsapp_templates(body.workspace_id, body.integration_account_id)
    return {
        "status": result.get("status", "ok"),
        "templates": int(result.get("templates") or 0),
    }


@app.post(
    "/integrations/uazapi/sync",
    response_model=UazapiHistorySyncResponse,
)
def sync_uazapi_history_endpoint(
    body: UazapiHistorySyncRequest,
    background: bool = True,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
    raise HTTPException(status_code=410, detail="UAZAPI desativado.")
