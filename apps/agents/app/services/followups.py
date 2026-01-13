from datetime import datetime, timedelta, timezone

from app.clients.supabase import get_supabase_client
from app.services.agent_runner import load_agent
from app.services.conversation import get_messages, should_pause
from app.services.consent import has_agent_consent
from app.services.credits import consume_credits, get_remaining_credits
from app.tools.inbox import create_agent_message, send_instagram_text, send_whatsapp_template, send_whatsapp_text
from app.services.workspaces import is_workspace_not_expired


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


def _get_followup_state(agent_id: str, conversation_id: str) -> dict | None:
    supabase = get_supabase_client()
    return (
        supabase.table("agent_conversation_state")
        .select("followup_step")
        .eq("agent_id", agent_id)
        .eq("conversation_id", conversation_id)
        .single()
        .execute()
        .data
    )


def _is_followup_enabled(agent_id: str) -> bool:
    supabase = get_supabase_client()
    permission = (
        supabase.table("agent_permissions")
        .select("habilitado")
        .eq("agent_id", agent_id)
        .eq("acao", "follow_up")
        .limit(1)
        .execute()
        .data
    )
    if not permission:
        return True
    return bool(permission[0].get("habilitado", True))


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _is_outside_window(messages: list[dict]) -> bool:
    last_contact = next((m for m in reversed(messages) if m.get("autor") == "contato"), None)
    last_at = _parse_datetime(last_contact.get("created_at")) if last_contact else None
    if not last_at:
        return False
    return datetime.now(timezone.utc) - last_at > timedelta(hours=24)


def schedule_followups(agent_id: str, conversation_id: str) -> dict | None:
    supabase = get_supabase_client()
    if not _is_followup_enabled(agent_id):
        return None
    followups = (
        supabase.table("agent_followups")
        .select("id, delay_minutos, ordem, somente_fora_janela")
        .eq("agent_id", agent_id)
        .eq("habilitado", True)
        .order("ordem", desc=False)
        .execute()
        .data
    )
    if not followups:
        return None

    state = _get_followup_state(agent_id, conversation_id) or {}
    next_step = state.get("followup_step", 0)

    if next_step >= len(followups):
        return None

    return followups[next_step]


def run_followup(agent_id: str, conversation_id: str, followup_id: str) -> dict:
    supabase = get_supabase_client()
    conversation = (
        supabase.table("conversations")
        .select("id, workspace_id, lead_id, contact_id, canal, modo_atendimento_humano")
        .eq("id", conversation_id)
        .single()
        .execute()
        .data
    )
    if not conversation:
        return {"status": "missing_conversation"}

    if not is_workspace_not_expired(conversation.get("workspace_id")):
        return {"status": "blocked", "reason": "trial_expired"}

    agent = load_agent(agent_id)
    if not agent:
        return {"status": "missing_agent"}
    provider = _resolve_provider(agent)

    if not has_agent_consent(agent_id):
        return {"status": "no_consent"}

    messages = get_messages(conversation_id)
    paused, _ = should_pause(agent, conversation, messages)
    if paused:
        return {"status": "paused"}

    if get_remaining_credits(conversation["workspace_id"]) <= 0:
        return {"status": "no_credits"}

    outside_window = _is_outside_window(messages)
    if provider == "whatsapp_baileys":
        outside_window = False
    elif provider == "whatsapp_nao_oficial":
        return {"status": "provider_disabled"}

    last_user = next((m for m in reversed(messages) if m.get("autor") == "contato"), None)
    last_agent = next((m for m in reversed(messages) if m.get("autor") == "agente"), None)
    if last_user and last_agent:
        try:
            last_user_at = datetime.fromisoformat(last_user.get("created_at").replace("Z", "+00:00"))
            last_agent_at = datetime.fromisoformat(last_agent.get("created_at").replace("Z", "+00:00"))
            if last_user_at > last_agent_at:
                return {"status": "skipped_human"}
        except Exception:
            pass

    followup = (
        supabase.table("agent_followups")
        .select("id, usar_template, template_id, mensagem_texto, somente_fora_janela")
        .eq("id", followup_id)
        .single()
        .execute()
        .data
    )
    if not followup:
        return {"status": "missing_followup"}

    if followup.get("somente_fora_janela") and not outside_window:
        return {"status": "within_window"}

    canal = conversation.get("canal") or "whatsapp"
    phone = None
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
            phone = lead.get("whatsapp_wa_id") if lead else None
    else:
        if conversation.get("contact_id"):
            contact = (
                supabase.table("contacts")
                .select("telefone")
                .eq("id", conversation["contact_id"])
                .single()
                .execute()
                .data
            )
            phone = contact.get("telefone") if contact else None
        elif conversation.get("lead_id"):
            lead = (
                supabase.table("leads")
                .select("telefone")
                .eq("id", conversation["lead_id"])
                .single()
                .execute()
                .data
            )
            phone = lead.get("telefone") if lead else None

    if not phone:
        return {"status": "missing_phone"}

    if (
        canal == "whatsapp"
        and outside_window
        and not followup.get("template_id")
        and followup.get("usar_template")
        and provider == "whatsapp_oficial"
    ):
        return {"status": "template_required"}

    if canal == "instagram":
        if outside_window:
            return {"status": "window_expired_no_template"}
        if followup.get("mensagem_texto"):
            send_instagram_text(agent_id, phone, followup["mensagem_texto"])
            create_agent_message(
                conversation["workspace_id"],
                conversation_id,
                followup["mensagem_texto"],
                "texto",
            )
        else:
            return {"status": "missing_followup_text"}
    elif provider == "whatsapp_baileys":
        if followup.get("mensagem_texto"):
            send_whatsapp_text(agent_id, phone, followup["mensagem_texto"])
            create_agent_message(
                conversation["workspace_id"],
                conversation_id,
                followup["mensagem_texto"],
                "texto",
            )
        else:
            return {"status": "missing_followup_text"}
    elif provider == "whatsapp_nao_oficial":
        return {"status": "provider_disabled"}
    elif followup.get("usar_template") and followup.get("template_id"):
        template = (
            supabase.table("whatsapp_templates")
            .select("nome, idioma")
            .eq("id", followup["template_id"])
            .single()
            .execute()
            .data
        )
        if template:
            send_whatsapp_template(agent_id, phone, template["nome"], template["idioma"])
            create_agent_message(conversation["workspace_id"], conversation_id, f"Template follow-up: {template['nome']}", "texto")
    elif followup.get("mensagem_texto") and not outside_window:
        send_whatsapp_text(agent_id, phone, followup["mensagem_texto"])
        create_agent_message(conversation["workspace_id"], conversation_id, followup["mensagem_texto"], "texto")
    elif followup.get("mensagem_texto") and outside_window:
        return {"status": "window_expired_no_template"}

    consume_credits(conversation["workspace_id"], agent_id, conversation_id, None, 1)

    state = _get_followup_state(agent_id, conversation_id) or {}
    next_step = int(state.get("followup_step") or 0) + 1

    supabase.table("agent_conversation_state").upsert(
        {
            "agent_id": agent_id,
            "conversation_id": conversation_id,
            "workspace_id": conversation["workspace_id"],
            "followup_step": next_step,
            "followup_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="agent_id,conversation_id",
    ).execute()

    return {"status": "sent"}
