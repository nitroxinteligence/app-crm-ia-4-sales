from datetime import datetime, timedelta, timezone

from app.clients.supabase import get_supabase_client
from app.services.agent_runner import run_agent
from app.services.conversation import get_messages
from app.services.followups import run_followup, schedule_followups
from app.services.knowledge import process_knowledge_file
from app.services.whatsapp_ingestion import process_whatsapp_event
from app.services.instagram_ingestion import process_instagram_event
from app.services.uazapi_ingestion import process_uazapi_event
from app.services.uazapi_sync import sync_uazapi_history
from app.services.whatsapp_templates import sync_whatsapp_templates
from app.workers.celery_app import celery_app


def _seconds_until_window_expired(messages: list[dict]) -> int:
    last_contact = next((m for m in reversed(messages) if m.get("autor") == "contato"), None)
    if not last_contact:
        return 0
    try:
        last_at = datetime.fromisoformat(last_contact.get("created_at").replace("Z", "+00:00"))
    except Exception:
        return 0
    expires_at = last_at + timedelta(hours=24)
    remaining = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    return max(0, remaining)


@celery_app.task
def process_knowledge_task(file_id: str) -> dict:
    return process_knowledge_file(file_id)


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


@celery_app.task
def process_whatsapp_event_task(event_id: str) -> dict:
    result = process_whatsapp_event(event_id)
    workspace_id = result.get("workspace_id")
    integration_account_id = result.get("integration_account_id")
    conversation_ids = result.get("conversation_ids") or []
    if not workspace_id or not integration_account_id or not conversation_ids:
        return {"status": "no_agent"}

    agent_id = _find_active_agent(workspace_id, integration_account_id)
    if not agent_id:
        return {"status": "no_agent"}

    for conversation_id in conversation_ids:
        run_agent_task.delay(agent_id, conversation_id)

    return {"status": "queued", "agent_id": agent_id, "conversations": len(conversation_ids)}


@celery_app.task
def process_whatsapp_event_media_task(event_id: str) -> dict:
    return process_whatsapp_event(event_id, process_media=True)


@celery_app.task
def process_instagram_event_task(event_id: str) -> dict:
    result = process_instagram_event(event_id)
    return {
        "status": "skipped",
        "reason": "agent_whatsapp_only",
        "workspace_id": result.get("workspace_id"),
        "conversations": len(result.get("conversation_ids") or []),
    }


@celery_app.task
def process_uazapi_event_task(event_id: str) -> dict:
    result = process_uazapi_event(event_id)
    workspace_id = result.get("workspace_id")
    integration_account_id = result.get("integration_account_id")
    conversation_ids = result.get("conversation_ids") or []
    if not workspace_id or not integration_account_id or not conversation_ids:
        return {"status": "no_agent"}

    agent_id = _find_active_agent(workspace_id, integration_account_id)
    if not agent_id:
        return {"status": "no_agent"}

    for conversation_id in conversation_ids:
        run_agent_task.delay(agent_id, conversation_id)

    return {"status": "queued", "agent_id": agent_id, "conversations": len(conversation_ids)}


@celery_app.task
def process_uazapi_event_media_task(event_id: str) -> dict:
    return process_uazapi_event(event_id, process_media=True)


@celery_app.task
def sync_whatsapp_templates_task(workspace_id: str, integration_account_id: str | None = None) -> dict:
    return sync_whatsapp_templates(workspace_id, integration_account_id)


@celery_app.task
def sync_uazapi_history_task(workspace_id: str, integration_account_id: str) -> dict:
    return sync_uazapi_history(workspace_id, integration_account_id)


@celery_app.task
def run_agent_task(agent_id: str, conversation_id: str, input_text: str | None = None) -> dict:
    result = run_agent(agent_id, conversation_id, input_text)
    schedule_followups_task.delay(agent_id, conversation_id)
    return result


@celery_app.task
def run_followup_task(agent_id: str, conversation_id: str, followup_id: str) -> dict:
    return run_followup(agent_id, conversation_id, followup_id)


@celery_app.task
def schedule_followups_task(agent_id: str, conversation_id: str) -> dict:
    followup = schedule_followups(agent_id, conversation_id)
    if not followup:
        return {"status": "no_followup"}
    countdown = int(followup["delay_minutos"]) * 60
    if followup.get("somente_fora_janela"):
        remaining = _seconds_until_window_expired(get_messages(conversation_id))
        if remaining > countdown:
            countdown = remaining
    run_followup_task.apply_async(args=[agent_id, conversation_id, followup["id"]], countdown=countdown)
    return {"status": "scheduled"}
