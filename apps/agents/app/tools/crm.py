from app.clients.supabase import get_supabase_client


def create_lead(
    workspace_id: str,
    nome: str | None,
    telefone: str | None,
    email: str | None,
    canal_origem: str = "whatsapp",
    owner_id: str | None = None,
    whatsapp_wa_id: str | None = None,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "nome": nome,
        "telefone": telefone,
        "email": email,
        "canal_origem": canal_origem,
        "owner_id": owner_id,
        "whatsapp_wa_id": whatsapp_wa_id,
        "status": "novo",
    }
    if whatsapp_wa_id:
        result = (
            supabase.table("leads")
            .upsert(payload, on_conflict="workspace_id,whatsapp_wa_id")
            .execute()
        )
    else:
        result = supabase.table("leads").insert(payload).execute()
    data = result.data or {}
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def update_lead(lead_id: str, values: dict) -> None:
    supabase = get_supabase_client()
    supabase.table("leads").update(values).eq("id", lead_id).execute()


def create_contact(
    workspace_id: str,
    nome: str | None,
    telefone: str | None,
    email: str | None,
    owner_id: str | None = None,
    pipeline_id: str | None = None,
    pipeline_stage_id: str | None = None,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "nome": nome,
        "telefone": telefone,
        "email": email,
        "owner_id": owner_id,
        "pipeline_id": pipeline_id,
        "pipeline_stage_id": pipeline_stage_id,
        "status": "novo",
    }
    result = supabase.table("contacts").insert(payload).execute()
    data = result.data or {}
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def update_contact(contact_id: str, values: dict) -> None:
    supabase = get_supabase_client()
    supabase.table("contacts").update(values).eq("id", contact_id).execute()


def create_deal(
    workspace_id: str,
    contact_id: str | None,
    pipeline_id: str | None,
    stage_id: str | None,
    valor: float | None = None,
    moeda: str = "BRL",
    owner_id: str | None = None,
    origem: str | None = None,
    titulo: str | None = None,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "contact_id": contact_id,
        "pipeline_id": pipeline_id,
        "stage_id": stage_id,
        "valor": valor,
        "moeda": moeda,
        "owner_id": owner_id,
        "origem": origem,
        "titulo": titulo,
    }
    result = supabase.table("deals").insert(payload).execute()
    data = result.data or {}
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def update_deal(deal_id: str, values: dict) -> None:
    supabase = get_supabase_client()
    supabase.table("deals").update(values).eq("id", deal_id).execute()


def move_deal_stage(deal_id: str, stage_id: str) -> None:
    supabase = get_supabase_client()
    supabase.table("deals").update({"stage_id": stage_id}).eq("id", deal_id).execute()


def apply_tag(entity_type: str, entity_id: str, tag_id: str, workspace_id: str) -> None:
    supabase = get_supabase_client()
    if entity_type == "lead":
        table = "lead_tags"
        payload = {"workspace_id": workspace_id, "lead_id": entity_id, "tag_id": tag_id}
    elif entity_type == "contact":
        table = "contact_tags"
        payload = {"workspace_id": workspace_id, "contact_id": entity_id, "tag_id": tag_id}
    else:
        raise ValueError("Unsupported entity type for tags")

    supabase.table(table).upsert(payload, on_conflict="lead_id,tag_id" if entity_type == "lead" else "contact_id,tag_id").execute()


def set_custom_field_value(entity_type: str, entity_id: str, field_id: str, workspace_id: str, value: dict) -> None:
    supabase = get_supabase_client()
    if entity_type == "lead":
        table = "custom_field_values_lead"
        payload = {
            "workspace_id": workspace_id,
            "lead_id": entity_id,
            "field_id": field_id,
            "valor": value,
        }
        conflict = "lead_id,field_id"
    elif entity_type == "deal":
        table = "custom_field_values_deal"
        payload = {
            "workspace_id": workspace_id,
            "deal_id": entity_id,
            "field_id": field_id,
            "valor": value,
        }
        conflict = "deal_id,field_id"
    else:
        raise ValueError("Unsupported entity type for custom fields")

    supabase.table(table).upsert(payload, on_conflict=conflict).execute()
