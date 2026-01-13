from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from langdetect import detect
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from app.clients.supabase import get_supabase_client
from app.services.conversation import (
    get_conversation,
    get_messages,
    should_pause,
    update_conversation_state,
)
from app.services.consent import has_agent_consent
from app.services.credits import consume_credits, get_remaining_credits
from app.services.knowledge import ingest_conversation_text, retrieve_knowledge
from app.services.metrics import increment_agent_metrics
from app.services.llm import get_last_fallback_llm, get_primary_llm, get_secondary_llm
from app.services.media import extract_message_media_text
from app.services.workspaces import is_workspace_not_expired
from app.tools.calendar import create_calendar_event, delete_calendar_event, get_calendar_event, update_calendar_event
from app.tools.crm import (
    apply_tag,
    create_contact,
    create_deal,
    create_lead,
    update_deal,
    move_deal_stage,
    set_custom_field_value,
    update_contact,
    update_lead,
)
from app.tools.inbox import (
    create_agent_message,
    send_instagram_text,
    send_whatsapp_template,
    send_whatsapp_text,
    update_conversation_status,
)


@dataclass
class AgentContext:
    agent_id: str
    workspace_id: str
    conversation_id: str
    lead_id: str | None
    contact_id: str | None
    phone: str | None
    canal: str
    provider: str
    sent_by_tool: bool = False
    outside_window: bool = False
    default_pipeline_id: str | None = None
    default_stage_id: str | None = None
    blocked_fields: set[str] = field(default_factory=set)
    tool_calls: list[dict] = field(default_factory=list)
    credits_used: int = 0


def load_agent(agent_id: str) -> dict:
    supabase = get_supabase_client()
    response = (
        supabase.table("agents")
        .select(
            "id, workspace_id, nome, tipo, status, detectar_idioma, idioma_padrao, configuracao, "
            "integration_account_id, pipeline_id, etapa_inicial_id, pausar_em_tags, pausar_em_etapas, "
            "pausar_ao_responder_humano, campos_bloqueados, timezone, tempo_resposta_segundos"
        )
        .eq("id", agent_id)
        .single()
        .execute()
    )
    return response.data


def _resolve_provider(agent: dict) -> str:
    integration_account_id = agent.get("integration_account_id")
    if not integration_account_id:
        return "whatsapp_oficial"
    supabase = get_supabase_client()
    account = (
        supabase.table("integration_accounts")
        .select("provider")
        .eq("id", integration_account_id)
        .single()
        .execute()
        .data
    )
    return account.get("provider") if account and account.get("provider") else "whatsapp_oficial"


def _get_default_template(workspace_id: str) -> dict | None:
    supabase = get_supabase_client()
    response = (
        supabase.table("whatsapp_templates")
        .select("nome, idioma, categoria, status")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    templates = response.data or []
    approved = [
        item
        for item in templates
        if (item.get("status") or "").lower() == "approved"
    ]
    if not approved:
        return None
    prioridades = [
        "utility",
        "transactional",
        "authentication",
        "marketing",
        "service",
    ]
    for categoria in prioridades:
        match = next(
            (
                item
                for item in approved
                if (item.get("categoria") or "").lower() == categoria
            ),
            None,
        )
        if match:
            return match
    return approved[0]


def _load_permissions(agent_id: str) -> set[str]:
    supabase = get_supabase_client()
    response = (
        supabase.table("agent_permissions")
        .select("acao, habilitado")
        .eq("agent_id", agent_id)
        .execute()
    )
    data = response.data or []
    if not data:
        return set()
    return {item["acao"] for item in data if item.get("habilitado")}


def _resolve_phone(conversation: dict) -> str | None:
    supabase = get_supabase_client()
    canal = conversation.get("canal")
    if canal == "instagram":
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


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _get_last_contact_message(messages: list[dict]) -> dict | None:
    return next((m for m in reversed(messages) if m.get("autor") == "contato"), None)


def _is_outside_window(last_contact_message: dict | None) -> bool:
    last_at = _parse_datetime(last_contact_message.get("created_at")) if last_contact_message else None
    if not last_at:
        return False
    return datetime.now(timezone.utc) - last_at > timedelta(hours=24)


def _ingest_text_messages(
    agent_id: str,
    conversation_id: str,
    messages: list[dict],
) -> None:
    for message in messages:
        if message.get("tipo") != "texto":
            continue
        if message.get("interno"):
            continue
        content = message.get("conteudo") or ""
        if not content.strip():
            continue
        message_id = message.get("id")
        if not message_id:
            continue
        try:
            ingest_conversation_text(
                agent_id,
                conversation_id,
                message_id,
                content,
                source="message",
                metadata={"autor": message.get("autor")},
            )
        except Exception:
            continue


def _resolve_pipeline_defaults(agent: dict) -> tuple[str | None, str | None]:
    supabase = get_supabase_client()
    pipeline_id = agent.get("pipeline_id")
    stage_id = agent.get("etapa_inicial_id")

    if not pipeline_id:
        pipeline = (
            supabase.table("pipelines")
            .select("id")
            .eq("workspace_id", agent["workspace_id"])
            .order("created_at", desc=False)
            .limit(1)
            .execute()
            .data
        )
        if pipeline:
            pipeline_id = pipeline[0]["id"]

    if pipeline_id and not stage_id:
        stage = (
            supabase.table("pipeline_stages")
            .select("id")
            .eq("pipeline_id", pipeline_id)
            .order("ordem", desc=False)
            .limit(1)
            .execute()
            .data
        )
        if stage:
            stage_id = stage[0]["id"]

    return pipeline_id, stage_id


def _load_workspace_context(agent: dict, pipeline_id: str | None) -> dict:
    supabase = get_supabase_client()
    tags = (
        supabase.table("tags")
        .select("id, nome")
        .eq("workspace_id", agent["workspace_id"])
        .execute()
        .data
        or []
    )
    pipelines = (
        supabase.table("pipelines")
        .select("id, nome")
        .eq("workspace_id", agent["workspace_id"])
        .execute()
        .data
        or []
    )
    stages = []
    if pipeline_id:
        stages = (
            supabase.table("pipeline_stages")
            .select("id, nome, ordem")
            .eq("pipeline_id", pipeline_id)
            .order("ordem", desc=False)
            .execute()
            .data
            or []
        )

    blocked_fields = set(agent.get("campos_bloqueados") or [])
    lead_fields = (
        supabase.table("custom_fields_lead")
        .select("id, nome, tipo")
        .eq("workspace_id", agent["workspace_id"])
        .execute()
        .data
        or []
    )
    deal_fields = (
        supabase.table("custom_fields_deal")
        .select("id, nome, tipo")
        .eq("workspace_id", agent["workspace_id"])
        .execute()
        .data
        or []
    )

    lead_fields = [field for field in lead_fields if field["id"] not in blocked_fields]
    deal_fields = [field for field in deal_fields if field["id"] not in blocked_fields]

    return {
        "tags": tags,
        "pipelines": pipelines,
        "stages": stages,
        "lead_fields": lead_fields,
        "deal_fields": deal_fields,
    }


def _format_lookup(items: list[dict], label: str = "nome") -> str:
    if not items:
        return ""
    return "\n".join([f"- {item.get(label)} ({item.get('id')})" for item in items])


def _format_ids(ids: list[str], items: list[dict]) -> str:
    if not ids:
        return ""
    mapping = {item.get("id"): item.get("nome") for item in items}
    formatted = []
    for item_id in ids:
        nome = mapping.get(item_id)
        if nome:
            formatted.append(f"{nome} ({item_id})")
        else:
            formatted.append(str(item_id))
    return ", ".join(formatted)


def _log_tool_call(ctx: AgentContext, action: str, payload: dict, result: str | None = None) -> None:
    ctx.tool_calls.append(
        {
            "acao": action,
            "payload": payload,
            "resultado": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


def _ensure_contact_and_deal(
    agent: dict,
    conversation: dict,
    default_pipeline_id: str | None,
    default_stage_id: str | None,
) -> tuple[dict, bool]:
    lead_id = conversation.get("lead_id")
    if not lead_id:
        return conversation, False

    supabase = get_supabase_client()
    lead = (
        supabase.table("leads")
        .select("id, nome, telefone, email, contato_id")
        .eq("id", lead_id)
        .single()
        .execute()
        .data
    )
    if not lead:
        return conversation, False
    lead_convertido = False

    contact_id = conversation.get("contact_id") or lead.get("contato_id")
    if not contact_id:
        contact_match = None
        if lead.get("telefone"):
            contact_match = (
                supabase.table("contacts")
                .select("id")
                .eq("workspace_id", conversation["workspace_id"])
                .eq("telefone", lead["telefone"])
                .limit(1)
                .execute()
                .data
            )
        if not contact_match and lead.get("email"):
            contact_match = (
                supabase.table("contacts")
                .select("id")
                .eq("workspace_id", conversation["workspace_id"])
                .eq("email", lead["email"])
                .limit(1)
                .execute()
                .data
            )
        if contact_match:
            contact_id = contact_match[0]["id"]
        else:
            contact = create_contact(
                conversation["workspace_id"],
                lead.get("nome"),
                lead.get("telefone"),
                lead.get("email"),
                pipeline_id=default_pipeline_id,
                pipeline_stage_id=default_stage_id,
            )
            contact_id = contact.get("id") if contact else None

    if contact_id:
        if lead.get("contato_id") != contact_id:
            supabase.table("leads").update({"contato_id": contact_id}).eq("id", lead_id).execute()
            lead_convertido = True
        if conversation.get("contact_id") != contact_id:
            supabase.table("conversations").update({"contact_id": contact_id}).eq("id", conversation["id"]).execute()
            conversation["contact_id"] = contact_id

    if contact_id and default_pipeline_id:
        existing_deal = (
            supabase.table("deals")
            .select("id")
            .eq("contact_id", contact_id)
            .eq("pipeline_id", default_pipeline_id)
            .limit(1)
            .execute()
            .data
        )
        if not existing_deal:
            create_deal(conversation["workspace_id"], contact_id, default_pipeline_id, default_stage_id)

    return conversation, lead_convertido


def _build_system_prompt(
    agent: dict,
    knowledge: list[dict],
    workspace_context: dict,
    allowed_actions: set[str],
    language: str | None,
    ctx: AgentContext,
) -> str:
    configuracao = agent.get("configuracao") or {}
    tom = configuracao.get("tom") or "consultivo"
    tom_custom = configuracao.get("tom_custom") or ""
    horario = configuracao.get("horario") or "comercial"
    horario_customizado = configuracao.get("horario_customizado") or ""
    canais = configuracao.get("canais") or []
    faq = configuracao.get("faq") or ""
    prompt_extra = configuracao.get("prompt") or ""
    knowledge_text = "\n".join([item.get("content", "") for item in knowledge if item.get("content")])

    actions_text = ", ".join(sorted(allowed_actions)) if allowed_actions else "todas"
    pause_tags = agent.get("pausar_em_tags") or []
    pause_stages = agent.get("pausar_em_etapas") or []

    tipo = agent.get("tipo") or "sdr"
    tipo_label = {
        "sdr": "SDR",
        "atendimento": "Atendimento",
        "suporte": "Suporte",
        "copiloto": "Copiloto",
        "propostas": "Vendas",
        "voice": "Voice",
    }.get(tipo, str(tipo))
    tom_label = tom_custom if tom == "outro" and tom_custom else ("Outro" if tom == "outro" else tom)

    prompt_lines: list[str] = []
    if prompt_extra:
        prompt_lines.append(prompt_extra)
    prompt_lines.append(
        "\n".join(
            [
                f"nome: {agent.get('nome')}",
                f"funcao: {tipo_label}",
                f"tom: {tom_label}",
                f"horario: {horario}",
                f"timezone: {agent.get('timezone')}",
                f"tempo_resposta_segundos: {agent.get('tempo_resposta_segundos')}",
                f"canais: {', '.join(canais) if canais else 'whatsapp'}",
                f"permissoes: {actions_text}",
            ]
        )
    )
    if not canais or "whatsapp" in canais:
        if ctx.provider == "whatsapp_oficial":
            prompt_lines.append(
                "Regra WhatsApp: se a janela de 24h expirou, use template para responder."
            )
        elif ctx.provider == "whatsapp_baileys":
            prompt_lines.append(
                "Regra WhatsApp Baileys: sem janela de 24h."
            )
        else:
            prompt_lines.append("Regra WhatsApp: provider desativado.")
    if "instagram" in canais:
        prompt_lines.append("Regra Instagram: respeite a janela de 24h para respostas.")
    if ctx.lead_id:
        prompt_lines.append(f"Lead atual: {ctx.lead_id}")
    if ctx.contact_id:
        prompt_lines.append(f"Contato atual: {ctx.contact_id}")

    if ctx.outside_window:
        prompt_lines.append("ATENCAO: a janela de 24h para respostas expirou nesta conversa.")
    if ctx.default_pipeline_id:
        prompt_lines.append(
            f"Pipeline padrao: {ctx.default_pipeline_id} (etapa inicial {ctx.default_stage_id})"
        )
    if horario_customizado:
        prompt_lines.append(f"Horario personalizado: {horario_customizado}")
    if pause_tags:
        prompt_lines.append(
            f"Tags que pausam o agente: {_format_ids(pause_tags, workspace_context.get('tags') or [])}"
        )
    if pause_stages:
        prompt_lines.append(
            f"Etapas que pausam o agente: {_format_ids(pause_stages, workspace_context.get('stages') or [])}"
        )
    if faq:
        prompt_lines.append(f"faq:\n{faq}")
    if knowledge_text:
        prompt_lines.append(f"conhecimento:\n{knowledge_text}")

    tags = _format_lookup(workspace_context.get("tags") or [])
    if tags:
        prompt_lines.append(f"tags_disponiveis:\n{tags}")

    stages = _format_lookup(workspace_context.get("stages") or [])
    if stages:
        prompt_lines.append(f"etapas_pipeline:\n{stages}")

    lead_fields = _format_lookup(workspace_context.get("lead_fields") or [])
    if lead_fields:
        prompt_lines.append(f"campos_customizados_lead:\n{lead_fields}")

    deal_fields = _format_lookup(workspace_context.get("deal_fields") or [])
    if deal_fields:
        prompt_lines.append(f"campos_customizados_deal:\n{deal_fields}")

    return "\n".join(prompt_lines) + "\n"


def _build_messages(messages: list[dict]) -> list:
    output = []
    for msg in messages:
        autor = msg.get("autor")
        content = msg.get("conteudo") or ""
        if autor == "contato":
            output.append(HumanMessage(content=content))
        elif autor == "agente":
            output.append(AIMessage(content=content))
        else:
            output.append(AIMessage(content=f"[Humano] {content}"))
    return output


def _build_sandbox_messages(messages: list[dict]) -> list:
    output = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content") or ""
        if role == "user":
            output.append(HumanMessage(content=content))
        else:
            output.append(AIMessage(content=content))
    return output


def _build_tools(ctx: AgentContext, allowed_actions: set[str]):
    def is_allowed(action: str) -> bool:
        return not allowed_actions or action in allowed_actions

    @tool
    def enviar_mensagem(texto: str) -> str:
        """Envia uma mensagem de texto para o contato atual."""
        if not ctx.phone:
            result = "Telefone nao encontrado"
            _log_tool_call(ctx, "enviar_mensagem", {"texto": texto}, result)
            return result
        if ctx.outside_window:
            result = (
                "Janela de 24h expirada. Use um template."
                if ctx.canal == "whatsapp"
                else "Janela de 24h expirada."
            )
            _log_tool_call(ctx, "enviar_mensagem", {"texto": texto}, result)
            return result
        try:
            if ctx.canal == "instagram":
                response = send_instagram_text(ctx.agent_id, ctx.phone, texto)
                message_id = response.get("message_id") or response.get("id")
            else:
                response = send_whatsapp_text(ctx.agent_id, ctx.phone, texto)
                message_id = None
                messages = response.get("messages") or []
                if messages:
                    message_id = messages[0].get("id")
            create_agent_message(
                ctx.workspace_id,
                ctx.conversation_id,
                texto,
                "texto",
                message_id,
            )
            consume_credits(ctx.workspace_id, ctx.agent_id, ctx.conversation_id, None, 1)
            ctx.credits_used += 1
            ctx.sent_by_tool = True
            _log_tool_call(
                ctx,
                "enviar_mensagem",
                {"texto": texto},
                f"enviado:{response.get('messages', []) or response}",
            )
            sent_ref = response.get("messages") or response.get("message_id") or response.get("id") or response
            return f"Mensagem enviada: {sent_ref}"
        except Exception as error:
            result = f"Erro ao enviar mensagem: {error}"
            _log_tool_call(ctx, "enviar_mensagem", {"texto": texto}, result)
            return result

    @tool
    def enviar_template(nome_template: str, idioma: str) -> str:
        """Envia um template WhatsApp para o contato atual."""
        if ctx.canal != "whatsapp":
            result = "Templates sao exclusivos do WhatsApp."
            _log_tool_call(ctx, "enviar_template", {"nome_template": nome_template, "idioma": idioma}, result)
            return result
        if not ctx.phone:
            result = "Telefone nao encontrado"
            _log_tool_call(ctx, "enviar_template", {"nome_template": nome_template, "idioma": idioma}, result)
            return result
        try:
            response = send_whatsapp_template(ctx.agent_id, ctx.phone, nome_template, idioma)
            message_id = None
            messages = response.get("messages") or []
            if messages:
                message_id = messages[0].get("id")
            create_agent_message(
                ctx.workspace_id,
                ctx.conversation_id,
                f"Template enviado: {nome_template}",
                "texto",
                message_id,
            )
            consume_credits(ctx.workspace_id, ctx.agent_id, ctx.conversation_id, None, 1)
            ctx.credits_used += 1
            ctx.sent_by_tool = True
            _log_tool_call(
                ctx,
                "enviar_template",
                {"nome_template": nome_template, "idioma": idioma},
                f"enviado:{response.get('messages', [])}",
            )
            return f"Template enviado: {response.get('messages', [])}"
        except Exception as error:
            result = f"Erro ao enviar template: {error}"
            _log_tool_call(
                ctx, "enviar_template", {"nome_template": nome_template, "idioma": idioma}, result
            )
            return result

    @tool
    def criar_lead(nome: str | None, telefone: str | None, email: str | None) -> str:
        """Cria um lead no CRM."""
        lead = create_lead(ctx.workspace_id, nome, telefone, email)
        _log_tool_call(ctx, "criar_lead", {"nome": nome, "telefone": telefone, "email": email}, lead.get("id"))
        return f"Lead criado: {lead.get('id')}"

    @tool
    def editar_lead(lead_id: str, valores: dict) -> str:
        """Atualiza campos de um lead."""
        update_lead(lead_id, valores)
        _log_tool_call(ctx, "editar_lead", {"lead_id": lead_id, "valores": valores}, "ok")
        return "Lead atualizado"

    @tool
    def criar_contato(nome: str | None, telefone: str | None, email: str | None) -> str:
        """Cria um contato no CRM."""
        contato = create_contact(
            ctx.workspace_id,
            nome,
            telefone,
            email,
            pipeline_id=ctx.default_pipeline_id,
            pipeline_stage_id=ctx.default_stage_id,
        )
        _log_tool_call(
            ctx,
            "criar_contato",
            {"nome": nome, "telefone": telefone, "email": email},
            contato.get("id"),
        )
        return f"Contato criado: {contato.get('id')}"

    @tool
    def editar_contato(contato_id: str, valores: dict) -> str:
        """Atualiza campos de um contato."""
        update_contact(contato_id, valores)
        _log_tool_call(ctx, "editar_contato", {"contato_id": contato_id, "valores": valores}, "ok")
        return "Contato atualizado"

    @tool
    def criar_deal(contato_id: str | None, pipeline_id: str | None, stage_id: str | None) -> str:
        """Cria um deal na pipeline informada."""
        deal = create_deal(
            ctx.workspace_id,
            contato_id,
            pipeline_id or ctx.default_pipeline_id,
            stage_id or ctx.default_stage_id,
        )
        _log_tool_call(
            ctx,
            "criar_deal",
            {"contato_id": contato_id, "pipeline_id": pipeline_id, "stage_id": stage_id},
            deal.get("id"),
        )
        return f"Deal criado: {deal.get('id')}"

    @tool
    def editar_deal(deal_id: str, valores: dict) -> str:
        """Atualiza campos de um deal."""
        update_deal(deal_id, valores)
        _log_tool_call(ctx, "editar_deal", {"deal_id": deal_id, "valores": valores}, "ok")
        return "Deal atualizado"

    @tool
    def mover_etapa(deal_id: str, stage_id: str) -> str:
        """Move um deal para outra etapa."""
        move_deal_stage(deal_id, stage_id)
        _log_tool_call(ctx, "mover_etapa", {"deal_id": deal_id, "stage_id": stage_id}, "ok")
        return "Etapa atualizada"

    @tool
    def aplicar_tag(tipo: str, entidade_id: str, tag_id: str) -> str:
        """Aplica uma tag em lead ou contato."""
        apply_tag(tipo, entidade_id, tag_id, ctx.workspace_id)
        _log_tool_call(
            ctx, "aplicar_tag", {"tipo": tipo, "entidade_id": entidade_id, "tag_id": tag_id}, "ok"
        )
        return "Tag aplicada"

    @tool
    def atualizar_campo_customizado(tipo: str, entidade_id: str, field_id: str, valor: dict) -> str:
        """Atualiza um campo customizado em lead ou deal."""
        if field_id in ctx.blocked_fields:
            result = "Campo bloqueado nas configuracoes do agente"
            _log_tool_call(
                ctx,
                "alterar_campo_customizado",
                {"tipo": tipo, "entidade_id": entidade_id, "field_id": field_id},
                result,
            )
            return result
        set_custom_field_value(tipo, entidade_id, field_id, ctx.workspace_id, valor)
        _log_tool_call(
            ctx,
            "alterar_campo_customizado",
            {"tipo": tipo, "entidade_id": entidade_id, "field_id": field_id, "valor": valor},
            "ok",
        )
        return "Campo atualizado"

    @tool
    def resolver_conversa(status: str) -> str:
        """Atualiza o status da conversa."""
        update_conversation_status(ctx.conversation_id, status)
        _log_tool_call(ctx, "resolver_conversa", {"status": status}, "ok")
        if status == "resolvida":
            increment_agent_metrics(
                ctx.agent_id,
                ctx.workspace_id,
                {"conversas_resolvidas": 1},
            )
        return "Status atualizado"

    @tool
    def marcar_spam() -> str:
        """Marca a conversa atual como spam."""
        update_conversation_status(ctx.conversation_id, "spam")
        _log_tool_call(ctx, "marcar_spam", {}, "ok")
        return "Conversa marcada como spam"

    @tool
    def criar_evento_calendar(payload: dict) -> str:
        """Cria um evento no Google Calendar."""
        try:
            evento = create_calendar_event(ctx.agent_id, payload)
            _log_tool_call(ctx, "calendar_criar", {"payload": payload}, evento.get("id"))
            return f"Evento criado: {evento.get('id')}"
        except Exception as error:
            result = f"Erro ao criar evento: {error}"
            _log_tool_call(ctx, "calendar_criar", {"payload": payload}, result)
            return result

    @tool
    def editar_evento_calendar(event_id: str, payload: dict) -> str:
        """Edita um evento no Google Calendar."""
        try:
            evento = update_calendar_event(ctx.agent_id, event_id, payload)
            _log_tool_call(ctx, "calendar_editar", {"event_id": event_id, "payload": payload}, "ok")
            return f"Evento atualizado: {evento.get('id')}"
        except Exception as error:
            result = f"Erro ao editar evento: {error}"
            _log_tool_call(ctx, "calendar_editar", {"event_id": event_id, "payload": payload}, result)
            return result

    @tool
    def cancelar_evento_calendar(event_id: str) -> str:
        """Cancela um evento no Google Calendar."""
        try:
            delete_calendar_event(ctx.agent_id, event_id)
            _log_tool_call(ctx, "calendar_cancelar", {"event_id": event_id}, "ok")
            return "Evento cancelado"
        except Exception as error:
            result = f"Erro ao cancelar evento: {error}"
            _log_tool_call(ctx, "calendar_cancelar", {"event_id": event_id}, result)
            return result

    @tool
    def consultar_evento_calendar(event_id: str) -> str:
        """Consulta detalhes de um evento no Google Calendar."""
        try:
            evento = get_calendar_event(ctx.agent_id, event_id)
            _log_tool_call(ctx, "calendar_consultar", {"event_id": event_id}, "ok")
            return f"Evento: {evento.get('summary') or evento.get('id')}"
        except Exception as error:
            result = f"Erro ao consultar evento: {error}"
            _log_tool_call(ctx, "calendar_consultar", {"event_id": event_id}, result)
            return result

    tools = []
    if is_allowed("enviar_mensagem"):
        tools.append(enviar_mensagem)
        if ctx.provider == "whatsapp_oficial":
            tools.append(enviar_template)
    if is_allowed("criar_lead"):
        tools.append(criar_lead)
    if is_allowed("editar_lead"):
        tools.append(editar_lead)
    if is_allowed("criar_contato"):
        tools.append(criar_contato)
    if is_allowed("editar_contato"):
        tools.append(editar_contato)
    if is_allowed("criar_deal"):
        tools.append(criar_deal)
    if is_allowed("editar_deal"):
        tools.append(editar_deal)
    if is_allowed("mover_etapa"):
        tools.append(mover_etapa)
    if is_allowed("aplicar_tag"):
        tools.append(aplicar_tag)
    if is_allowed("alterar_campo_customizado"):
        tools.append(atualizar_campo_customizado)
    if is_allowed("resolver_conversa"):
        tools.append(resolver_conversa)
    if is_allowed("marcar_spam"):
        tools.append(marcar_spam)
    if is_allowed("calendar_criar"):
        tools.append(criar_evento_calendar)
    if is_allowed("calendar_editar"):
        tools.append(editar_evento_calendar)
    if is_allowed("calendar_cancelar"):
        tools.append(cancelar_evento_calendar)
    if is_allowed("calendar_consultar"):
        tools.append(consultar_evento_calendar)
    return tools


def run_agent(agent_id: str, conversation_id: str, input_text: str | None = None) -> dict:
    start_time = datetime.now(timezone.utc)
    agent = load_agent(agent_id)
    if not agent:
        raise ValueError("Agent not found")
    provider = _resolve_provider(agent)
    agent["provider"] = provider
    if provider == "whatsapp_nao_oficial":
        return {"status": "paused", "reason": "provider_disabled"}

    if not is_workspace_not_expired(agent.get("workspace_id")):
        return {"status": "blocked", "reason": "trial_expired"}

    if agent.get("status") != "ativo":
        return {"status": "paused", "reason": "agent_inactive"}

    conversation = get_conversation(conversation_id)
    if not conversation:
        raise ValueError("Conversation not found")
    if conversation.get("canal") != "whatsapp":
        return {"status": "paused", "reason": "channel_not_supported"}

    messages = get_messages(conversation_id)
    _ingest_text_messages(agent_id, conversation_id, messages)
    default_pipeline_id, default_stage_id = _resolve_pipeline_defaults(agent)
    conversation, lead_convertido = _ensure_contact_and_deal(
        agent, conversation, default_pipeline_id, default_stage_id
    )
    if lead_convertido:
        increment_agent_metrics(
            agent_id,
            conversation["workspace_id"],
            {"leads_convertidos": 1},
        )

    paused, reason = should_pause(agent, conversation, messages)
    language = agent.get("idioma_padrao")
    last_contact_message = _get_last_contact_message(messages)
    if agent.get("detectar_idioma"):
        texto_base = last_contact_message.get("conteudo") if last_contact_message else input_text
        if texto_base:
            try:
                language = detect(texto_base)
            except Exception:
                language = agent.get("idioma_padrao")

    update_conversation_state(agent_id, conversation, messages, paused, reason, language)

    if paused:
        return {"status": "paused", "reason": reason}

    if not has_agent_consent(agent_id):
        update_conversation_state(agent_id, conversation, messages, True, "no_consent", language)
        return {"status": "paused", "reason": "no_consent"}

    if get_remaining_credits(conversation["workspace_id"]) <= 0:
        update_conversation_state(agent_id, conversation, messages, True, "no_credits", language)
        return {"status": "paused", "reason": "no_credits"}

    last_user_message = last_contact_message.get("conteudo") if last_contact_message else None
    media_text = ""
    if last_contact_message and last_contact_message.get("tipo") != "texto":
        media_text = extract_message_media_text(last_contact_message["id"])
        if media_text:
            last_user_message = f"{last_user_message or ''}\n{media_text}".strip()
            try:
                ingest_conversation_text(
                    agent_id,
                    conversation_id,
                    last_contact_message["id"],
                    media_text,
                    source="attachment",
                    metadata={"autor": last_contact_message.get("autor")},
                )
            except Exception:
                pass

    outside_window = _is_outside_window(last_contact_message)
    if provider == "whatsapp_baileys":
        outside_window = False
    query = input_text or last_user_message or ""
    knowledge = retrieve_knowledge(agent_id, query, conversation_id) if query else []
    workspace_context = _load_workspace_context(agent, default_pipeline_id)
    allowed_actions = _load_permissions(agent_id)
    can_send_message = not allowed_actions or "enviar_mensagem" in allowed_actions

    ctx = AgentContext(
        agent_id=agent_id,
        workspace_id=conversation["workspace_id"],
        conversation_id=conversation_id,
        lead_id=conversation.get("lead_id"),
        contact_id=conversation.get("contact_id"),
        phone=_resolve_phone(conversation),
        canal=conversation.get("canal") or "whatsapp",
        provider=provider,
        outside_window=outside_window,
        default_pipeline_id=default_pipeline_id,
        default_stage_id=default_stage_id,
        blocked_fields=set(agent.get("campos_bloqueados") or []),
    )

    system_prompt = _build_system_prompt(agent, knowledge, workspace_context, allowed_actions, language, ctx)
    if not input_text and media_text:
        input_text = last_user_message

    message_state = [SystemMessage(content=system_prompt), *_build_messages(messages)]
    if input_text:
        message_state.append(HumanMessage(content=input_text))

    tools = _build_tools(ctx, allowed_actions)

    supabase = get_supabase_client()
    run = (
        supabase.table("agent_runs")
        .insert(
            {
                "agent_id": agent_id,
                "workspace_id": conversation["workspace_id"],
                "conversation_id": conversation_id,
                "status": "executando",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    run_data = run.data or {}
    if isinstance(run_data, list):
        run_data = run_data[0] if run_data else {}
    run_id = run_data.get("id")

    model_sequence: list[tuple[str, object]] = [("primary", get_primary_llm())]
    secondary_llm = get_secondary_llm()
    if secondary_llm:
        model_sequence.append(("secondary", secondary_llm))
    model_sequence.append(("fallback", get_last_fallback_llm()))

    for label, llm in model_sequence:
        try:
            graph = create_react_agent(llm, tools=tools)
            result = graph.invoke({"messages": message_state})
            final_message = result["messages"][-1]
            if isinstance(final_message, AIMessage) and final_message.content:
                if ctx.phone and not ctx.sent_by_tool:
                    if not can_send_message:
                        _log_tool_call(
                            ctx,
                            "enviar_mensagem",
                            {"texto": final_message.content},
                            "bloqueado_permissao",
                        )
                    elif ctx.outside_window:
                        if ctx.provider == "whatsapp_oficial":
                            template = _get_default_template(ctx.workspace_id)
                            if template:
                                try:
                                    response = send_whatsapp_template(
                                        agent_id,
                                        ctx.phone,
                                        template["nome"],
                                        template["idioma"],
                                    )
                                    message_id = None
                                    messages = response.get("messages") or []
                                    if messages:
                                        message_id = messages[0].get("id")
                                    create_agent_message(
                                        ctx.workspace_id,
                                        ctx.conversation_id,
                                        f"Template enviado: {template['nome']}",
                                        "texto",
                                        message_id,
                                    )
                                    consume_credits(
                                        ctx.workspace_id, ctx.agent_id, ctx.conversation_id, None, 1
                                    )
                                    ctx.credits_used += 1
                                    _log_tool_call(
                                        ctx,
                                        "enviar_template",
                                        {"template": template["nome"], "idioma": template["idioma"]},
                                        "enviado",
                                    )
                                except Exception as error:
                                    _log_tool_call(
                                        ctx,
                                        "enviar_template",
                                        {"template": template["nome"], "idioma": template["idioma"]},
                                        f"erro:{error}",
                                    )
                            else:
                                _log_tool_call(
                                    ctx,
                                    "enviar_template",
                                    {},
                                    "sem_template_disponivel",
                                )
                        else:
                            _log_tool_call(
                                ctx,
                                "enviar_mensagem",
                                {"texto": final_message.content},
                                "bloqueado_janela_24h",
                            )
                    else:
                        try:
                            if ctx.canal == "instagram":
                                response = send_instagram_text(agent_id, ctx.phone, final_message.content)
                                message_id = response.get("message_id") or response.get("id")
                            else:
                                response = send_whatsapp_text(agent_id, ctx.phone, final_message.content)
                                message_id = None
                                messages = response.get("messages") or []
                                if messages:
                                    message_id = messages[0].get("id")
                                elif response.get("messageId"):
                                    message_id = response.get("messageId")
                            create_agent_message(
                                ctx.workspace_id,
                                ctx.conversation_id,
                                final_message.content,
                                "texto",
                                message_id,
                            )
                            consume_credits(ctx.workspace_id, ctx.agent_id, ctx.conversation_id, None, 1)
                            ctx.credits_used += 1
                            _log_tool_call(
                                ctx,
                                "enviar_mensagem",
                                {"texto": final_message.content},
                                "enviado",
                            )
                        except Exception as error:
                            _log_tool_call(
                                ctx,
                                "enviar_mensagem",
                                {"texto": final_message.content},
                                f"erro:{error}",
                            )
            model_name = getattr(llm, "model_name", None) or getattr(llm, "model", None) or label
            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            update_payload = {
                "status": "concluido",
                "modelo": model_name,
                "credits_usados": ctx.credits_used,
                "resumo": final_message.content if isinstance(final_message, AIMessage) else "ok",
                "latencia_ms": duration_ms,
                "concluido_em": datetime.now(timezone.utc).isoformat(),
            }
            if label != "primary":
                update_payload["fallback_modelo"] = model_name
            supabase.table("agent_runs").update(update_payload).eq("id", run_id).execute()
            supabase.table("agent_logs").insert(
                {
                    "agent_id": agent_id,
                    "workspace_id": conversation["workspace_id"],
                    "conversation_id": conversation_id,
                    "resumo": final_message.content if isinstance(final_message, AIMessage) else "ok",
                    "tool_calls": ctx.tool_calls,
                    "metrics": {
                        "modelo": model_name,
                        "idioma": language,
                        "outside_window": ctx.outside_window,
                        "credits_usados": ctx.credits_used,
                    },
                }
            ).execute()
            return {"status": "ok", "run_id": run_id}
        except Exception:
            continue

    supabase.table("agent_runs").update(
        {
            "status": "falhou",
            "erro": "agent_failed",
            "resumo": "agent_failed",
            "concluido_em": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", run_id).execute()
    return {"status": "failed", "run_id": run_id}


def run_agent_sandbox(agent_id: str, messages: list[dict]) -> dict:
    agent = load_agent(agent_id)
    if not agent:
        raise ValueError("Agent not found")
    provider = _resolve_provider(agent)
    agent["provider"] = provider

    language = agent.get("idioma_padrao")
    last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
    if agent.get("detectar_idioma") and last_user and last_user.get("content"):
        try:
            language = detect(last_user["content"])
        except Exception:
            language = agent.get("idioma_padrao")

    query = last_user.get("content") if last_user else ""
    knowledge = retrieve_knowledge(agent_id, query) if query else []
    default_pipeline_id, default_stage_id = _resolve_pipeline_defaults(agent)
    workspace_context = _load_workspace_context(agent, default_pipeline_id)

    ctx = AgentContext(
        agent_id=agent_id,
        workspace_id=agent["workspace_id"],
        conversation_id="sandbox",
        lead_id=None,
        contact_id=None,
        phone=None,
        canal="whatsapp",
        provider=provider,
        outside_window=False,
        default_pipeline_id=default_pipeline_id,
        default_stage_id=default_stage_id,
        blocked_fields=set(agent.get("campos_bloqueados") or []),
    )

    allowed_actions = _load_permissions(agent_id)
    system_prompt = _build_system_prompt(agent, knowledge, workspace_context, allowed_actions, language, ctx)
    message_state = [SystemMessage(content=system_prompt), *_build_sandbox_messages(messages)]

    model_sequence: list[tuple[str, object]] = [("primary", get_primary_llm())]
    secondary_llm = get_secondary_llm()
    if secondary_llm:
        model_sequence.append(("secondary", secondary_llm))
    model_sequence.append(("fallback", get_last_fallback_llm()))

    for label, llm in model_sequence:
        try:
            response = llm.invoke(message_state)
            content = response.content if hasattr(response, "content") else str(response)
            model_name = getattr(llm, "model_name", None) or getattr(llm, "model", None) or label
            supabase = get_supabase_client()
            supabase.table("agent_logs").insert(
                {
                    "agent_id": agent_id,
                    "workspace_id": agent["workspace_id"],
                    "resumo": content or "ok",
                    "tool_calls": [],
                    "metrics": {"modelo": model_name, "sandbox": True},
                }
            ).execute()
            return {"status": "ok", "output": content, "model": model_name}
        except Exception:
            continue

    return {"status": "failed"}
