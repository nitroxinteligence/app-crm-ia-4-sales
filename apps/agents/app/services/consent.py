from app.clients.supabase import get_supabase_client


def has_agent_consent(agent_id: str) -> bool:
    supabase = get_supabase_client()
    response = (
        supabase.table("agent_consents")
        .select("id")
        .eq("agent_id", agent_id)
        .limit(1)
        .execute()
    )
    return bool(response.data)
