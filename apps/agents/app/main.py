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
from app.services.whatsapp_templates import sync_whatsapp_templates
from app.workers.tasks import (
    process_knowledge_task,
    process_whatsapp_event_task,
    process_instagram_event_task,
    process_whatsapp_event_media_task,
    run_agent_task,
    sync_whatsapp_templates_task,
)
from app.clients.supabase import get_supabase_client

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


@app.post("/agents/{agent_id}/run", response_model=AgentRunResponse)
def run_agent_endpoint(
    agent_id: str,
    body: AgentRunRequest,
    background: bool = True,
    x_agents_key: str | None = Header(default=None, alias="X-Agents-Key"),
):
    _require_api_key(x_agents_key)
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
    result = process_whatsapp_event(body.event_id, process_media=False)
    conversation_ids = result.get("conversation_ids") or []
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
