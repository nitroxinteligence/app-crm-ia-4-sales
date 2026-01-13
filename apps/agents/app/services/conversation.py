from datetime import datetime

from app.clients.supabase import get_supabase_client


def get_conversation(conversation_id: str) -> dict:
    supabase = get_supabase_client()
    response = (
        supabase.table("conversations")
        .select("id, workspace_id, lead_id, contact_id, canal, status, modo_atendimento_humano, ultima_mensagem_em")
        .eq("id", conversation_id)
        .single()
        .execute()
    )
    return response.data


def get_messages(conversation_id: str, limit: int = 150) -> list[dict]:
    supabase = get_supabase_client()
    response = (
        supabase.table("messages")
        .select("id, autor, tipo, conteudo, interno, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    data = response.data or []
    return list(reversed(data))


def get_contact_tags(contact_id: str) -> list[str]:
    supabase = get_supabase_client()
    response = (
        supabase.table("contact_tags")
        .select("tag_id")
        .eq("contact_id", contact_id)
        .execute()
    )
    return [item["tag_id"] for item in (response.data or [])]


def get_lead_tags(lead_id: str) -> list[str]:
    supabase = get_supabase_client()
    response = (
        supabase.table("lead_tags")
        .select("tag_id")
        .eq("lead_id", lead_id)
        .execute()
    )
    return [item["tag_id"] for item in (response.data or [])]


def is_human_last(messages: list[dict]) -> bool:
    if not messages:
        return False
    return messages[-1].get("autor") == "equipe"


def should_pause(agent: dict, conversation: dict, messages: list[dict]) -> tuple[bool, str | None]:
    if conversation.get("modo_atendimento_humano"):
        return True, "modo_atendimento_humano"

    if agent.get("pausar_ao_responder_humano") and is_human_last(messages):
        return True, "humano_respondeu"

    pause_tags = agent.get("pausar_em_tags") or []
    pause_stages = agent.get("pausar_em_etapas") or []

    contact_id = conversation.get("contact_id")
    lead_id = conversation.get("lead_id")

    if pause_tags:
        tags = []
        if contact_id:
            tags.extend(get_contact_tags(contact_id))
        if lead_id:
            tags.extend(get_lead_tags(lead_id))
        if any(tag in pause_tags for tag in tags):
            return True, "tag_pause"

    if pause_stages and contact_id:
        supabase = get_supabase_client()
        contact = (
            supabase.table("contacts")
            .select("pipeline_stage_id")
            .eq("id", contact_id)
            .single()
            .execute()
            .data
        )
        if contact and contact.get("pipeline_stage_id") in pause_stages:
            return True, "stage_pause"
        deals = (
            supabase.table("deals")
            .select("stage_id")
            .eq("contact_id", contact_id)
            .execute()
            .data
        )
        if any(deal.get("stage_id") in pause_stages for deal in (deals or [])):
            return True, "stage_pause"

    return False, None


def update_conversation_state(
    agent_id: str,
    conversation: dict,
    messages: list[dict],
    paused: bool,
    paused_reason: str | None,
    language: str | None,
) -> None:
    supabase = get_supabase_client()
    last_contact = next((m for m in reversed(messages) if m.get("autor") == "contato"), None)
    last_agent = next((m for m in reversed(messages) if m.get("autor") == "agente"), None)
    last_human = next((m for m in reversed(messages) if m.get("autor") == "equipe"), None)

    supabase.table("agent_conversation_state").upsert(
        {
            "agent_id": agent_id,
            "conversation_id": conversation["id"],
            "workspace_id": conversation["workspace_id"],
            "idioma_detectado": language,
            "pausado": paused,
            "pausado_motivo": paused_reason,
            "ultimo_contato_em": last_contact.get("created_at") if last_contact else None,
            "ultimo_agente_em": last_agent.get("created_at") if last_agent else None,
            "ultimo_humano_em": last_human.get("created_at") if last_human else None,
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="agent_id,conversation_id",
    ).execute()
