from datetime import datetime, timezone

from app.clients.supabase import get_supabase_client


def is_workspace_not_expired(workspace_id: str | None) -> bool:
    if not workspace_id:
        return False
    supabase = get_supabase_client()
    response = (
        supabase.table("workspaces")
        .select("trial_ends_at")
        .eq("id", workspace_id)
        .single()
        .execute()
    )
    data = response.data or {}
    trial_ends_at = data.get("trial_ends_at")
    if not trial_ends_at:
        return True
    try:
        ends_at = datetime.fromisoformat(str(trial_ends_at).replace("Z", "+00:00"))
    except Exception:
        return False
    return ends_at >= datetime.now(timezone.utc)
