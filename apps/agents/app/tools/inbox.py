from datetime import datetime

from app.clients.supabase import get_supabase_client
from app.clients.whatsapp_client import WhatsAppClient
from app.clients.baileys_client import BaileysClient
from app.clients.instagram_client import InstagramClient


def _get_agent_whatsapp_credentials(agent_id: str) -> tuple[dict, str | None]:
    supabase = get_supabase_client()
    agent = (
        supabase.table("agents")
        .select("id, integration_account_id")
        .eq("id", agent_id)
        .single()
        .execute()
    )
    data = agent.data
    if not data or not data.get("integration_account_id"):
        raise ValueError("Agent has no WhatsApp integration account")

    account_response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, phone_number_id, identificador, provider, instance_id, numero")
        .eq("id", data["integration_account_id"])
        .single()
        .execute()
    )
    account_data = account_response.data
    if not account_data:
        raise ValueError("Integration account missing phone number id")

    provider = account_data.get("provider") or "whatsapp_oficial"
    access_token: str | None = None
    if provider != "whatsapp_baileys":
        token = (
            supabase.table("integration_tokens")
            .select("access_token")
            .eq("integration_account_id", account_data["id"])
            .single()
            .execute()
        )
        token_data = token.data
        if not token_data or not token_data.get("access_token"):
            token = (
                supabase.table("integration_tokens")
                .select("access_token")
                .eq("integration_id", account_data["integration_id"])
                .single()
                .execute()
            )
            token_data = token.data

        if not token_data or not token_data.get("access_token"):
            raise ValueError("Integration token missing")
        access_token = token_data["access_token"]

    return account_data, access_token


def _get_agent_instagram_credentials(agent_id: str) -> tuple[str, str]:
    supabase = get_supabase_client()
    agent = (
        supabase.table("agents")
        .select("id, integration_account_id")
        .eq("id", agent_id)
        .single()
        .execute()
    )
    data = agent.data
    if not data or not data.get("integration_account_id"):
        raise ValueError("Agent has no Instagram integration account")

    account = (
        supabase.table("integration_accounts")
        .select("id, integration_id, identificador")
        .eq("id", data["integration_account_id"])
        .single()
        .execute()
    )
    account_data = account.data
    if not account_data or not account_data.get("identificador"):
        raise ValueError("Integration account missing Instagram id")

    token = (
        supabase.table("integration_tokens")
        .select("access_token")
        .eq("integration_account_id", account_data["id"])
        .single()
        .execute()
    )
    token_data = token.data
    if not token_data or not token_data.get("access_token"):
        token = (
            supabase.table("integration_tokens")
            .select("access_token")
            .eq("integration_id", account_data["integration_id"])
            .single()
            .execute()
        )
        token_data = token.data
    if not token_data or not token_data.get("access_token"):
        raise ValueError("Integration token missing")

    return token_data["access_token"], account_data["identificador"]


def send_whatsapp_text(agent_id: str, to: str, text: str) -> dict:
    account, access_token = _get_agent_whatsapp_credentials(agent_id)
    provider = account.get("provider") or "whatsapp_oficial"
    if provider == "whatsapp_baileys":
        client = BaileysClient(account["id"])
        return client.send_text(to=to, text=text)
    if provider == "whatsapp_nao_oficial":
        raise ValueError("UAZAPI desativado")
    phone_number_id = account.get("phone_number_id") or account.get("identificador")
    if not phone_number_id:
        raise ValueError("Integration account missing phone number id")
    if not access_token:
        raise ValueError("Integration token missing")
    client = WhatsAppClient(access_token, phone_number_id)
    return client.send_text(to=to, body=text)


def send_instagram_text(agent_id: str, to: str, text: str) -> dict:
    access_token, instagram_id = _get_agent_instagram_credentials(agent_id)
    client = InstagramClient(access_token, instagram_id)
    return client.send_text(to=to, body=text)


def send_whatsapp_template(
    agent_id: str,
    to: str,
    template_name: str,
    language_code: str,
    components: list[dict] | None = None,
) -> dict:
    account, access_token = _get_agent_whatsapp_credentials(agent_id)
    provider = account.get("provider") or "whatsapp_oficial"
    if provider == "whatsapp_baileys":
        raise ValueError("Templates indisponiveis para WhatsApp Baileys")
    if provider == "whatsapp_nao_oficial":
        raise ValueError("UAZAPI desativado")
    phone_number_id = account.get("phone_number_id") or account.get("identificador")
    if not phone_number_id:
        raise ValueError("Integration account missing phone number id")
    if not access_token:
        raise ValueError("Integration token missing")
    client = WhatsAppClient(access_token, phone_number_id)
    return client.send_template(
        to=to,
        name=template_name,
        language_code=language_code,
        components=components,
    )


def create_agent_message(
    workspace_id: str,
    conversation_id: str,
    content: str,
    message_type: str = "texto",
    external_message_id: str | None = None,
):
    supabase = get_supabase_client()
    now = datetime.utcnow().isoformat()
    supabase.table("messages").insert(
        {
            "workspace_id": workspace_id,
            "conversation_id": conversation_id,
            "autor": "agente",
            "tipo": message_type,
            "conteudo": content,
            "whatsapp_message_id": external_message_id,
            "created_at": now,
        }
    ).execute()

    supabase.table("conversations").update(
        {
            "ultima_mensagem": content,
            "ultima_mensagem_em": now,
        }
    ).eq("id", conversation_id).execute()


def update_conversation_status(conversation_id: str, status: str):
    supabase = get_supabase_client()
    supabase.table("conversations").update({"status": status}).eq("id", conversation_id).execute()
