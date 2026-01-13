from datetime import datetime, timezone

from app.clients.supabase import get_supabase_client


def _metric_day():
    return datetime.now(timezone.utc).date()


def _safe_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def increment_agent_metrics(agent_id: str | None, workspace_id: str | None, deltas: dict) -> None:
    if not agent_id or not workspace_id:
        return

    day = _metric_day()
    supabase = get_supabase_client()
    existing = (
        supabase.table("agent_metrics_daily")
        .select(
            "id, mensagens_enviadas, conversas_resolvidas, leads_convertidos, credits_consumidos"
        )
        .eq("agent_id", agent_id)
        .eq("data", day)
        .limit(1)
        .execute()
        .data
    )

    if not existing:
        payload = {
            "agent_id": agent_id,
            "workspace_id": workspace_id,
            "data": day,
            "mensagens_enviadas": _safe_int(deltas.get("mensagens_enviadas")),
            "conversas_resolvidas": _safe_int(deltas.get("conversas_resolvidas")),
            "leads_convertidos": _safe_int(deltas.get("leads_convertidos")),
            "credits_consumidos": _safe_int(deltas.get("credits_consumidos")),
        }
        supabase.table("agent_metrics_daily").insert(payload).execute()
        return

    row = existing[0]
    updates = {
        "mensagens_enviadas": _safe_int(row.get("mensagens_enviadas"))
        + _safe_int(deltas.get("mensagens_enviadas")),
        "conversas_resolvidas": _safe_int(row.get("conversas_resolvidas"))
        + _safe_int(deltas.get("conversas_resolvidas")),
        "leads_convertidos": _safe_int(row.get("leads_convertidos"))
        + _safe_int(deltas.get("leads_convertidos")),
        "credits_consumidos": _safe_int(row.get("credits_consumidos"))
        + _safe_int(deltas.get("credits_consumidos")),
    }
    supabase.table("agent_metrics_daily").update(updates).eq("id", row["id"]).execute()
