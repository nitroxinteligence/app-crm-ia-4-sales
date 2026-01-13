from __future__ import annotations

from datetime import datetime, timezone
import mimetypes
from pathlib import Path
from typing import Any
import re

import httpx

from app.clients.supabase import get_supabase_client
from app.clients.uazapi_client import UazapiClient
from app.services.workspaces import is_workspace_not_expired


PROVIDER_NAO_OFICIAL = "whatsapp_nao_oficial"


def _safe_payload(payload: Any) -> dict:
    if isinstance(payload, dict):
        inner = payload.get("payload")
        if isinstance(inner, dict):
            return inner
        return payload
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict):
            inner = first.get("payload")
            if isinstance(inner, dict):
                return inner
            return first
    return {}


def _normalize_sender(sender: str | None) -> str:
    if not sender:
        return ""
    if "@g.us" in sender:
        return sender
    digits = re.sub(r"\D", "", sender)
    return digits or sender


def _parse_message_timestamp(message: dict) -> str:
    timestamp = message.get("messageTimestamp") or message.get("timestamp")
    if timestamp:
        try:
            value = int(timestamp)
            if value > 1_000_000_000_000:
                value = int(value / 1000)
            return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()


def _get_integration_by_instance_id(instance_id: str | None) -> dict | None:
    if not instance_id:
        return None

    supabase = get_supabase_client()
    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, instance_id, integrations!inner(workspace_id)")
        .eq("instance_id", instance_id)
        .eq("provider", PROVIDER_NAO_OFICIAL)
        .limit(1)
        .execute()
    )
    data = response.data or []
    if data:
        return data[0]

    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, instance_id, integrations!inner(workspace_id)")
        .eq("identificador", instance_id)
        .eq("provider", PROVIDER_NAO_OFICIAL)
        .limit(1)
        .execute()
    )
    data = response.data or []
    if data:
        return data[0]

    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, instance_id, integrations!inner(workspace_id)")
        .eq("nome", instance_id)
        .eq("provider", PROVIDER_NAO_OFICIAL)
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0] if data else None


def _get_integration_by_token(instance_token: str | None) -> dict | None:
    if not instance_token:
        return None

    supabase = get_supabase_client()
    response = (
        supabase.table("integration_tokens")
        .select("integration_id, integration_account_id")
        .eq("access_token", instance_token)
        .limit(1)
        .execute()
    )
    data = response.data or []
    if not data:
        return None

    token_row = data[0]
    integration_account_id = token_row.get("integration_account_id")
    integration_id = token_row.get("integration_id")

    if integration_account_id:
        account_response = (
            supabase.table("integration_accounts")
            .select("id, integration_id, instance_id, integrations!inner(workspace_id)")
            .eq("id", integration_account_id)
            .eq("provider", PROVIDER_NAO_OFICIAL)
            .limit(1)
            .execute()
        )
        account_data = account_response.data or []
        if account_data:
            return account_data[0]

    if not integration_id:
        return None

    account_response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, instance_id, integrations!inner(workspace_id)")
        .eq("integration_id", integration_id)
        .eq("provider", PROVIDER_NAO_OFICIAL)
        .limit(1)
        .execute()
    )
    account_data = account_response.data or []
    return account_data[0] if account_data else None


def _get_instance_token(
    integration_id: str | None,
    integration_account_id: str | None,
) -> str | None:
    if not integration_id and not integration_account_id:
        return None

    supabase = get_supabase_client()
    if integration_account_id:
        response = (
            supabase.table("integration_tokens")
            .select("access_token")
            .eq("integration_account_id", integration_account_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        if data:
            return data[0].get("access_token")

    if not integration_id:
        return None

    response = (
        supabase.table("integration_tokens")
        .select("access_token")
        .eq("integration_id", integration_id)
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0].get("access_token") if data else None


def _resolve_extension(mime_type: str | None, filename: str | None, fallback_type: str) -> str:
    if filename:
        suffix = Path(filename).suffix
        if suffix:
            return suffix
    if mime_type:
        guess = mimetypes.guess_extension(mime_type)
        if guess:
            return guess
    if fallback_type == "imagem":
        return ".jpg"
    if fallback_type == "video":
        return ".mp4"
    if fallback_type == "audio":
        return ".mp3"
    if fallback_type == "pdf":
        return ".pdf"
    return ".bin"


def _extract_profile_url(message: dict) -> str | None:
    return (
        message.get("profilePicUrl")
        or message.get("profilePicURL")
        or message.get("profile_pic_url")
        or message.get("avatarUrl")
    )


def _map_message(message: dict) -> dict:
    message_type = str(message.get("messageType") or message.get("type") or "").lower()
    text = message.get("text")
    if isinstance(text, dict):
        text = text.get("body")
    if not isinstance(text, str):
        text = message.get("content") if isinstance(message.get("content"), str) else ""

    file_url = message.get("fileURL") or message.get("fileUrl") or message.get("file")
    filename = (
        message.get("docName")
        or message.get("filename")
        or message.get("fileName")
        or None
    )

    if message_type in {"text", "conversation", "chat"}:
        return {"tipo": "texto", "conteudo": text or "Mensagem recebida"}

    if message_type in {"image", "video", "ptv", "sticker"}:
        return {
            "tipo": "imagem",
            "media_tipo": "video" if message_type in {"video", "ptv"} else "imagem",
            "conteudo": text or "Midia recebida",
            "media_url": file_url,
            "filename": filename,
        }

    if message_type in {"audio", "ptt", "voice", "myaudio"}:
        return {
            "tipo": "audio",
            "conteudo": text or "Mensagem de audio",
            "media_url": file_url,
            "filename": filename,
        }

    if message_type in {"document", "file"}:
        return {
            "tipo": "pdf",
            "media_tipo": "document",
            "conteudo": filename or "Documento recebido",
            "media_url": file_url,
            "filename": filename,
        }

    if file_url:
        return {
            "tipo": "pdf",
            "media_tipo": "document",
            "conteudo": filename or "Arquivo recebido",
            "media_url": file_url,
            "filename": filename,
        }

    return {"tipo": "texto", "conteudo": text or "Mensagem recebida"}


def _upsert_lead(
    workspace_id: str,
    wa_id: str,
    name: str | None,
    phone: str | None,
    avatar_url: str | None = None,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "whatsapp_wa_id": wa_id,
        "nome": name,
        "telefone": phone,
        "canal_origem": "whatsapp",
        "status": "novo",
        "avatar_url": avatar_url,
    }
    response = None
    try:
        response = (
            supabase.table("leads")
            .upsert(payload, on_conflict="workspace_id,whatsapp_wa_id")
            .execute()
        )
    except Exception:
        if avatar_url:
            payload.pop("avatar_url", None)
            response = (
                supabase.table("leads")
                .upsert(payload, on_conflict="workspace_id,whatsapp_wa_id")
                .execute()
            )
        else:
            raise

    if response is not None and getattr(response, "error", None):
        error_text = str(getattr(response, "error", ""))
        if avatar_url and "avatar_url" in error_text:
            payload.pop("avatar_url", None)
            response = (
                supabase.table("leads")
                .upsert(payload, on_conflict="workspace_id,whatsapp_wa_id")
                .execute()
            )
    data = response.data or {}
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def _upsert_conversation(
    workspace_id: str,
    lead_id: str,
    integration_account_id: str | None,
    last_message: str,
    last_at: str,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "lead_id": lead_id,
        "integration_account_id": integration_account_id,
        "canal": "whatsapp",
        "status": "aberta",
        "ultima_mensagem": last_message,
        "ultima_mensagem_em": last_at,
    }
    response = (
        supabase.table("conversations")
        .upsert(payload, on_conflict="workspace_id,lead_id,canal,integration_account_id")
        .execute()
    )
    data = response.data or {}
    if isinstance(data, list):
        return data[0] if data else {}
    return data


def _upsert_message(
    workspace_id: str,
    conversation_id: str,
    message_id: str | None,
    author: str,
    message_type: str,
    content: str,
    created_at: str,
    sender_id: str | None = None,
    sender_name: str | None = None,
    sender_avatar_url: str | None = None,
) -> str | None:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "conversation_id": conversation_id,
        "whatsapp_message_id": message_id,
        "autor": author,
        "tipo": message_type,
        "conteudo": content,
        "created_at": created_at,
        "sender_id": sender_id,
        "sender_nome": sender_name,
        "sender_avatar_url": sender_avatar_url,
    }
    supabase.table("messages").upsert(
        payload,
        on_conflict="workspace_id,whatsapp_message_id",
    ).execute()

    if not message_id:
        return None

    response = (
        supabase.table("messages")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("whatsapp_message_id", message_id)
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0]["id"] if data else None


def _store_attachment(
    workspace_id: str,
    conversation_id: str,
    message_row_id: str | None,
    media_url: str | None,
    message_type: str,
    filename: str | None,
) -> None:
    if not message_row_id or not media_url:
        return

    with httpx.Client(timeout=30) as client:
        response = client.get(media_url)
        response.raise_for_status()
        content = response.content
        mime_type = response.headers.get("content-type")

    extension = _resolve_extension(mime_type, filename, message_type)
    storage_path = f"{workspace_id}/{conversation_id}/{message_row_id}-{Path(media_url).name}{extension}"

    supabase = get_supabase_client()
    storage = supabase.storage.from_("inbox-attachments")
    storage.upload(
        storage_path,
        content,
        file_options={
            "content-type": mime_type or "application/octet-stream",
        },
    )

    existing = (
        supabase.table("attachments")
        .select("id")
        .eq("message_id", message_row_id)
        .eq("storage_path", storage_path)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        return

    tamanho = len(content)
    supabase.table("attachments").insert(
        {
            "workspace_id": workspace_id,
            "message_id": message_row_id,
            "storage_path": storage_path,
            "tipo": message_type,
            "tamanho_bytes": tamanho,
        }
    ).execute()


def _update_account_status(
    integration_id: str | None,
    integration_account_id: str | None,
    status: str | None,
    numero: str | None,
    nome: str | None,
    avatar_url: str | None = None,
    connected_at: str | None = None,
) -> None:
    if not integration_account_id:
        return
    supabase = get_supabase_client()
    payload = {
        "status": status or "desconectado",
        "numero": numero,
        "nome": nome,
    }
    if avatar_url:
        payload["avatar_url"] = avatar_url
    if connected_at:
        payload["connected_at"] = connected_at
    supabase.table("integration_accounts").update(payload).eq(
        "id", integration_account_id
    ).execute()

    if not integration_id:
        return

    if status == "conectado":
        supabase.table("integrations").update(
            {"status": "conectado", "connected_at": connected_at}
        ).eq("id", integration_id).execute()


def _refresh_instance_status(
    integration_id: str | None,
    integration_account_id: str | None,
    token: str | None,
) -> None:
    if not token:
        return
    client = UazapiClient(token)
    try:
        payload = client.instance_status()
    except Exception:
        return

    status_info = payload.get("status") or {}
    if not isinstance(status_info, dict):
        status_info = {}
    instance = payload.get("instance") or {}
    if not isinstance(instance, dict):
        instance = {}

    status_raw = (
        status_info.get("status")
        or status_info.get("state")
        or payload.get("status")
        or instance.get("status")
        or ""
    )
    status_lower = str(status_raw).lower()

    numero = status_info.get("jid") or instance.get("jid") or instance.get("owner")
    logged = bool(status_info.get("loggedIn"))
    conectado = logged or bool(numero)
    conectando = (
        not conectado
        and (
            bool(status_info.get("connected"))
            or bool(instance.get("qrcode"))
            or status_lower == "connecting"
        )
    )

    status = "conectado" if conectado else "conectando" if conectando else "desconectado"
    nome = instance.get("profileName") or instance.get("name")
    avatar_url = (
        instance.get("profilePicUrl")
        or instance.get("profile_pic_url")
        or instance.get("image")
    )
    connected_at = datetime.now(timezone.utc).isoformat() if status == "conectado" else None
    _update_account_status(
        integration_id,
        integration_account_id,
        status,
        numero,
        nome,
        avatar_url,
        connected_at,
    )


def _extract_messages(data: Any) -> list[dict]:
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        nested = data.get("data")
        if nested is not None:
            nested_messages = _extract_messages(nested)
            if nested_messages:
                return nested_messages
        messages_field = data.get("messages")
        if isinstance(messages_field, list):
            return [item for item in messages_field if isinstance(item, dict)]
        if isinstance(messages_field, dict):
            nested_messages = _extract_messages(messages_field)
            if nested_messages:
                return nested_messages
        message_field = data.get("message")
        if isinstance(message_field, dict):
            return [message_field]
        if any(key in data for key in ["messageid", "messageType", "sender", "text"]):
            return [data]
    return []


def _find_messages_anywhere(payload: Any, depth: int = 0) -> list[dict]:
    if depth > 4:
        return []
    if isinstance(payload, list):
        results: list[dict] = []
        for item in payload:
            results.extend(_find_messages_anywhere(item, depth + 1))
        return results
    if isinstance(payload, dict):
        direct = _extract_messages(payload)
        if direct:
            return direct
        results: list[dict] = []
        for value in payload.values():
            results.extend(_find_messages_anywhere(value, depth + 1))
        return results
    return []


def process_uazapi_event(event_id: str, process_media: bool = True) -> dict:
    supabase = get_supabase_client()
    event_response = (
        supabase.table("webhook_events")
        .select("id, payload")
        .eq("id", event_id)
        .single()
        .execute()
    )
    event = event_response.data
    if not event:
        raise ValueError("Webhook event not found")

    payload = _safe_payload(event.get("payload"))
    instance_value = payload.get("instance")
    instance_id: str | None = None
    if isinstance(instance_value, dict):
        instance_id = (
            instance_value.get("id")
            or instance_value.get("instance_id")
            or instance_value.get("instanceId")
            or instance_value.get("name")
        )
    elif isinstance(instance_value, str):
        instance_id = instance_value
    if not instance_id:
        instance_id = (
            payload.get("instance_id")
            or payload.get("instanceId")
            or payload.get("instanceName")
            or payload.get("session")
        )
    event_type = str(
        payload.get("event")
        or payload.get("EventType")
        or payload.get("eventType")
        or payload.get("type")
        or ""
    ).lower()
    data = payload.get("data") or payload.get("message") or payload.get("messages")

    integration_account = _get_integration_by_instance_id(instance_id)
    if not integration_account:
        integration_account = _get_integration_by_token(payload.get("token"))
    if not integration_account:
        supabase.table("webhook_events").update(
            {
                "status": "erro",
                "processado_em": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", event_id).execute()
        return {"workspace_id": None, "integration_account_id": None, "conversation_ids": []}

    integration_id = integration_account.get("integration_id")
    integration_account_id = integration_account.get("id")
    integrations = integration_account.get("integrations") or {}
    if isinstance(integrations, list):
        workspace_id = integrations[0].get("workspace_id") if integrations else None
    else:
        workspace_id = integrations.get("workspace_id")

    if not workspace_id:
        return {"workspace_id": None, "integration_account_id": integration_account_id, "conversation_ids": []}

    if not is_workspace_not_expired(workspace_id):
        supabase.table("webhook_events").update(
            {
                "status": "bloqueado",
                "processado_em": datetime.now(timezone.utc).isoformat(),
                "integration_id": integration_id,
            }
        ).eq("id", event_id).execute()
        return {
            "workspace_id": workspace_id,
            "integration_account_id": integration_account_id,
            "conversation_ids": [],
        }

    instance_token = _get_instance_token(integration_id, integration_account_id)

    if event_type in {"connection", "status"}:
        _refresh_instance_status(integration_id, integration_account_id, instance_token)
        supabase.table("webhook_events").update(
            {
                "status": "processado",
                "processado_em": datetime.now(timezone.utc).isoformat(),
                "integration_id": integration_id,
            }
        ).eq("id", event_id).execute()
        return {
            "workspace_id": workspace_id,
            "integration_account_id": integration_account_id,
            "conversation_ids": [],
        }

    conversation_ids: list[str] = []
    chat_info = payload.get("chat") if isinstance(payload.get("chat"), dict) else {}
    chat_name = chat_info.get("name") or chat_info.get("wa_contactName")
    chat_avatar = chat_info.get("image") or chat_info.get("imagePreview")
    chat_is_group = bool(
        chat_info.get("wa_isGroup")
        or chat_info.get("isGroup")
        or str(chat_info.get("wa_chatid", "")).endswith("@g.us")
    )
    try:
        messages = _extract_messages(data)
        if not messages:
            messages = _extract_messages(payload)
        if not messages:
            messages = _find_messages_anywhere(payload)
        for message in messages:
            from_me = message.get("fromMe")
            if isinstance(message.get("key"), dict):
                from_me = from_me or message["key"].get("fromMe")
            if message.get("wasSentByApi"):
                continue
            chat_id = (
                message.get("chatid")
                or message.get("chatId")
                or message.get("remoteJid")
                or message.get("jid")
            )
            chat_group_id = (
                chat_id
                or chat_info.get("wa_chatid")
                or chat_info.get("chatId")
                or chat_info.get("id")
            )
            sender = (
                chat_id
                or message.get("sender_pn")
                or message.get("sender")
                or message.get("sender_lid")
                or message.get("owner")
                or message.get("from")
            )
            if not sender and isinstance(message.get("key"), dict):
                sender = message["key"].get("remoteJid") or message["key"].get("participant")

            message_is_group = bool(
                message.get("isGroup")
                or message.get("wa_isGroup")
                or str(chat_group_id or "").endswith("@g.us")
            )
            is_group = message_is_group or chat_is_group
            wa_id_source = (
                chat_group_id
                if is_group and chat_group_id
                else (str(sender) if sender is not None else None)
            )
            wa_id = _normalize_sender(wa_id_source)
            if not wa_id:
                continue
            name = (
                (chat_name if is_group else None)
                or message.get("groupName")
                or message.get("senderName")
                or message.get("wa_contactName")
                or message.get("pushName")
                or message.get("name")
            )
            sender_name = (
                message.get("senderName")
                or message.get("wa_contactName")
                or message.get("pushName")
                or message.get("name")
            )
            sender_id_raw = (
                message.get("participant")
                or (message.get("key") or {}).get("participant")
                or message.get("sender")
                or message.get("sender_pn")
                or message.get("from")
                or sender
                or wa_id
            )
            sender_id = _normalize_sender(sender_id_raw) if sender_id_raw else None
            phone_source = (
                message.get("sender_pn")
                or message.get("sender")
                or message.get("from")
                or wa_id
            )
            if is_group and chat_group_id:
                phone_source = chat_group_id
            phone = _normalize_sender(phone_source)

            mapped = _map_message(message)
            created_at = _parse_message_timestamp(message)

            profile_url = _extract_profile_url(message)
            avatar_url = (chat_avatar if is_group else None) or profile_url
            sender_avatar_url = profile_url

            lead = _upsert_lead(
                workspace_id=workspace_id,
                wa_id=wa_id,
                name=name,
                phone=phone,
                avatar_url=avatar_url,
            )

            conversation = _upsert_conversation(
                workspace_id=workspace_id,
                lead_id=lead["id"],
                integration_account_id=integration_account_id,
                last_message=mapped["conteudo"],
                last_at=created_at,
            )

            conversation_ids.append(conversation["id"])

            author = "equipe" if from_me else "contato"
            message_row_id = _upsert_message(
                workspace_id=workspace_id,
                conversation_id=conversation["id"],
                message_id=(
                    message.get("messageid")
                    or message.get("messageId")
                    or message.get("message_id")
                    or message.get("id")
                    or (message.get("key") or {}).get("id")
                ),
                author=author,
                message_type=mapped["tipo"],
                content=mapped["conteudo"],
                created_at=created_at,
                sender_id=sender_id if is_group else None,
                sender_name=sender_name if is_group else name,
                sender_avatar_url=sender_avatar_url if is_group else None,
            )

            media_url = mapped.get("media_url")
            if media_url and process_media:
                try:
                    _store_attachment(
                        workspace_id=workspace_id,
                        conversation_id=conversation["id"],
                        message_row_id=message_row_id,
                        media_url=media_url,
                        message_type=mapped.get("media_tipo") or mapped["tipo"],
                        filename=mapped.get("filename"),
                    )
                except Exception:
                    pass
    except Exception:
        supabase.table("webhook_events").update(
            {
                "status": "erro",
                "processado_em": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", event_id).execute()
        raise

    supabase.table("webhook_events").update(
        {
            "status": "processado",
            "processado_em": datetime.now(timezone.utc).isoformat(),
            "integration_id": integration_id,
        }
    ).eq("id", event_id).execute()

    unique_conversations = sorted(set(conversation_ids))
    return {
        "workspace_id": workspace_id,
        "integration_account_id": integration_account_id,
        "conversation_ids": unique_conversations,
    }
