from datetime import datetime, timedelta, timezone

from app.clients.calendar_client import (
    create_event,
    delete_event,
    get_event,
    query_freebusy,
    refresh_access_token,
    update_event,
)
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


def _resolve_calendars(agent_id: str, calendar_ids: list[str] | None = None) -> list[dict]:
    supabase = get_supabase_client()
    query = (
        supabase.table("agent_calendar_links")
        .select("calendar_id, integration_id")
        .eq("agent_id", agent_id)
    )
    if calendar_ids:
        query = query.in_("calendar_id", calendar_ids)
    links = query.execute().data or []
    if not links:
        raise ValueError("Agent has no calendar configured")
    return links


def _resolve_access_token(integration_id: str) -> str:
    supabase = get_supabase_client()
    tokens = (
        supabase.table("calendar_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("integration_id", integration_id)
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
                new_expires_at = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(
                    seconds=int(expires_in)
                )
            supabase.table("calendar_tokens").update(
                {
                    "access_token": access_token,
                    "expires_at": new_expires_at.isoformat() if new_expires_at else None,
                }
            ).eq("integration_id", integration_id).execute()

    if not access_token:
        raise ValueError("Calendar access token missing")
    return access_token


def _parse_rfc3339(value: str) -> datetime:
    normalized = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _merge_intervals(intervals: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda item: item[0])
    merged = [sorted_intervals[0]]
    for start, end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def _find_slots(
    window_start: datetime,
    window_end: datetime,
    busy: list[tuple[datetime, datetime]],
    duration: timedelta,
    limit: int,
) -> list[tuple[datetime, datetime]]:
    slots: list[tuple[datetime, datetime]] = []
    cursor = window_start
    for b_start, b_end in busy:
        if cursor + duration <= b_start:
            slots.append((cursor, cursor + duration))
            if len(slots) >= limit:
                return slots
        cursor = max(cursor, b_end)
        if cursor >= window_end:
            return slots
    if cursor + duration <= window_end and len(slots) < limit:
        slots.append((cursor, cursor + duration))
    return slots


def get_calendar_availability(
    agent_id: str,
    time_min: str,
    time_max: str,
    calendar_ids: list[str] | None = None,
    time_zone: str | None = None,
    duration_minutes: int | None = None,
    max_suggestions: int = 5,
) -> dict:
    links = _resolve_calendars(agent_id, calendar_ids)
    by_integration: dict[str, list[str]] = {}
    for link in links:
        by_integration.setdefault(link["integration_id"], []).append(link["calendar_id"])

    busy_intervals: list[tuple[datetime, datetime]] = []
    calendar_busy: dict[str, list[dict]] = {}
    errors: list[dict] = []

    for integration_id, calendars in by_integration.items():
        access_token = _resolve_access_token(integration_id)
        response = query_freebusy(access_token, time_min, time_max, calendars, time_zone)
        calendars_resp = response.get("calendars") or {}
        for cal_id, data in calendars_resp.items():
            if data.get("errors"):
                errors.append({"calendar_id": cal_id, "errors": data.get("errors")})
            busy = data.get("busy") or []
            calendar_busy[cal_id] = busy
            for item in busy:
                try:
                    start_dt = _parse_rfc3339(item.get("start"))
                    end_dt = _parse_rfc3339(item.get("end"))
                except Exception:
                    continue
                busy_intervals.append((start_dt, end_dt))

    merged_busy = _merge_intervals(busy_intervals)
    window_start = _parse_rfc3339(time_min)
    window_end = _parse_rfc3339(time_max)

    has_conflict = any(
        not (end <= window_start or start >= window_end) for start, end in merged_busy
    )

    suggestions: list[dict] = []
    if duration_minutes and duration_minutes > 0:
        duration = timedelta(minutes=int(duration_minutes))
        slots = _find_slots(window_start, window_end, merged_busy, duration, max_suggestions)
        suggestions = [
            {"start": start.isoformat(), "end": end.isoformat()} for start, end in slots
        ]

    return {
        "timeMin": time_min,
        "timeMax": time_max,
        "timeZone": time_zone,
        "available": not has_conflict,
        "busy": [{"start": s.isoformat(), "end": e.isoformat()} for s, e in merged_busy],
        "calendars": calendar_busy,
        "errors": errors,
        "suggestions": suggestions,
    }


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
