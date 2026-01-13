from app.clients.supabase import get_supabase_client
from app.services.metrics import increment_agent_metrics


def get_remaining_credits(workspace_id: str) -> int:
    supabase = get_supabase_client()
    result = (
        supabase.table("workspace_credits")
        .select("credits_total, credits_used")
        .eq("workspace_id", workspace_id)
        .single()
        .execute()
    )
    data = result.data or {}
    total = int(data.get("credits_total") or 0)
    used = int(data.get("credits_used") or 0)
    return max(total - used, 0)


def consume_credits(
    workspace_id: str,
    agent_id: str | None,
    conversation_id: str | None,
    message_id: str | None,
    credits: int,
) -> None:
    supabase = get_supabase_client()
    supabase.table("agent_credit_events").insert(
        {
            "workspace_id": workspace_id,
            "agent_id": agent_id,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "credits": credits,
            "direction": "debit",
        }
    ).execute()

    current = (
        supabase.table("workspace_credits")
        .select("credits_used")
        .eq("workspace_id", workspace_id)
        .single()
        .execute()
    )
    used = int(current.data.get("credits_used") or 0) if current.data else 0
    supabase.table("workspace_credits").update({"credits_used": used + credits}).eq(
        "workspace_id", workspace_id
    ).execute()

    increment_agent_metrics(
        agent_id,
        workspace_id,
        {
            "credits_consumidos": credits,
            "mensagens_enviadas": credits,
        },
    )
