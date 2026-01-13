from datetime import datetime, timedelta, timezone

from app.clients.calendar_client import create_event, delete_event, get_event, refresh_access_token, update_event
from app.clients.supabase import get_supabase_client


def _resolve_calendar(agent_id: str, calendar_id: str | None = None) -> tuple[str, str]:
    supabase = get_supabase_client()
    query = supabase.table("agent_calendar_links").select("calendar_id, integration_id").eq("agent_id", agent_id)
    if calendar_id:
        query = query.eq("calendar_id", calendar_id)
    link = query.limit(1).single().execute().data
    if not link:
        raise ValueError("Agent has no calendar configured")

    tokens = (
        supabase.table("calendar_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("integration_id", link["integration_id"])
        .single()
        .execute()
        .data
    )
    if not tokens:
        raise ValueError("Calendar tokens not found")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_at = tokens.get("expires_at")

    if expires_at:
        expires_at_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expires_at_dt <= datetime.now(timezone.utc) and refresh_token:
            refreshed = refresh_access_token(refresh_token)
            access_token = refreshed.get("access_token")
            expires_in = refreshed.get("expires_in")
            new_expires_at = None
            if expires_in:
                new_expires_at = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(seconds=int(expires_in))
            supabase.table("calendar_tokens").update(
                {
                    "access_token": access_token,
                    "expires_at": new_expires_at.isoformat() if new_expires_at else None,
                }
            ).eq("integration_id", link["integration_id"]).execute()

    if not access_token:
        raise ValueError("Calendar access token missing")

    return access_token, link["calendar_id"]


def create_calendar_event(agent_id: str, payload: dict, calendar_id: str | None = None) -> dict:
    access_token, calendar_id_resolved = _resolve_calendar(agent_id, calendar_id)
    return create_event(access_token, calendar_id_resolved, payload)


def update_calendar_event(agent_id: str, event_id: str, payload: dict, calendar_id: str | None = None) -> dict:
    access_token, calendar_id_resolved = _resolve_calendar(agent_id, calendar_id)
    return update_event(access_token, calendar_id_resolved, event_id, payload)


def delete_calendar_event(agent_id: str, event_id: str, calendar_id: str | None = None) -> None:
    access_token, calendar_id_resolved = _resolve_calendar(agent_id, calendar_id)
    delete_event(access_token, calendar_id_resolved, event_id)


def get_calendar_event(agent_id: str, event_id: str, calendar_id: str | None = None) -> dict:
    access_token, calendar_id_resolved = _resolve_calendar(agent_id, calendar_id)
    return get_event(access_token, calendar_id_resolved, event_id)
