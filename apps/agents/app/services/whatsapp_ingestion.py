from datetime import datetime, timezone
import mimetypes
from pathlib import Path
from typing import Any

from app.clients.supabase import get_supabase_client
from app.clients.r2_client import build_r2_key, get_r2_client
from app.config import settings
from app.clients.whatsapp_client import download_media, fetch_media_metadata
from app.services.realtime import (
    emit_attachment_created,
    emit_conversation_updated,
    emit_message_created,
)
from app.services.workspaces import is_workspace_not_expired


def _map_message(message: dict) -> dict:
    message_type = message.get("type")
    if not message_type:
        return {"tipo": "texto", "conteudo": "Mensagem recebida"}

    if message_type == "text":
        return {"tipo": "texto", "conteudo": message.get("text", {}).get("body", "")}

    if message_type in {"image", "video"}:
        media = message.get("image") if message_type == "image" else message.get("video")
        return {
            "tipo": "imagem",
            "media_tipo": "video" if message_type == "video" else "imagem",
            "conteudo": (media or {}).get("caption") or "Midia recebida",
            "media_id": (media or {}).get("id"),
        }

    if message_type in {"audio", "voice"}:
        media = message.get("audio") if message_type == "audio" else message.get("voice")
        return {
            "tipo": "audio",
            "conteudo": "Mensagem de audio",
            "media_id": (media or {}).get("id"),
        }

    if message_type == "document":
        document = message.get("document") or {}
        return {
            "tipo": "pdf",
            "media_tipo": "document",
            "conteudo": document.get("filename") or "Documento recebido",
            "media_id": document.get("id"),
            "filename": document.get("filename"),
        }

    return {"tipo": "texto", "conteudo": "Mensagem recebida"}


def _parse_message_timestamp(message: dict) -> str:
    timestamp = message.get("timestamp")
    if timestamp:
        try:
            return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()


def _get_integration_by_phone_number_id(phone_number_id: str | None) -> dict | None:
    if not phone_number_id:
        return None

    supabase = get_supabase_client()
    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, integrations!inner(workspace_id)")
        .eq("phone_number_id", phone_number_id)
        .eq("integrations.canal", "whatsapp")
        .limit(1)
        .execute()
    )
    data = response.data or []
    if data:
        return data[0]

    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, integrations!inner(workspace_id)")
        .eq("identificador", phone_number_id)
        .eq("integrations.canal", "whatsapp")
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0] if data else None


def _upsert_lead(
    workspace_id: str,
    wa_id: str,
    name: str | None,
    phone: str | None,
) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "whatsapp_wa_id": wa_id,
        "nome": name,
        "telefone": phone,
        "canal_origem": "whatsapp",
        "status": "novo",
    }
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


def _get_integration_token(
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


def _store_attachment(
    access_token: str | None,
    workspace_id: str,
    conversation_id: str,
    message_row_id: str | None,
    media_id: str | None,
    message_type: str,
    filename: str | None,
) -> dict | None:
    if not access_token or not message_row_id or not media_id:
        return None

    metadata = fetch_media_metadata(access_token, media_id)
    media_url = metadata.get("url")
    if not media_url:
        return None

    mime_type = metadata.get("mime_type")
    file_size = metadata.get("file_size")
    content = download_media(access_token, media_url)

    extension = _resolve_extension(mime_type, filename, message_type)
    storage_path = f"{workspace_id}/{conversation_id}/{message_row_id}-{media_id}{extension}"

    r2 = get_r2_client()
    object_key = build_r2_key("inbox-attachments", storage_path)
    r2.put_object(
        Bucket=settings.r2_bucket_inbox_attachments,
        Key=object_key,
        Body=content,
        ContentType=mime_type or "application/octet-stream",
    )

    supabase = get_supabase_client()

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
        return None

    tamanho = int(file_size) if file_size else len(content)
    insert_response = supabase.table("attachments").insert(
        {
            "workspace_id": workspace_id,
            "message_id": message_row_id,
            "storage_path": storage_path,
            "tipo": message_type,
            "tamanho_bytes": tamanho,
        }
    ).execute()
    data = insert_response.data or []
    attachment = data[0] if isinstance(data, list) and data else data
    if not attachment or not isinstance(attachment, dict):
        return None
    return {
        "id": attachment.get("id"),
        "storage_path": storage_path,
        "tipo": message_type,
        "tamanho_bytes": tamanho,
    }


def _safe_get_payload(payload: Any) -> dict:
    if isinstance(payload, dict):
        return payload
    return {}


def process_whatsapp_event(event_id: str, process_media: bool = True) -> dict:
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

    payload = _safe_get_payload(event.get("payload"))
    entries = payload.get("entry") if isinstance(payload.get("entry"), list) else []

    integration_id = None
    workspace_id = None
    integration_account_id = None
    conversation_ids: list[str] = []
    workspace_blocked = False
    try:
        for entry in entries:
            changes = entry.get("changes") if isinstance(entry.get("changes"), list) else []
            for change in changes:
                value = change.get("value") or {}
                metadata = value.get("metadata") or {}
                phone_number_id = metadata.get("phone_number_id")
                integration_account = _get_integration_by_phone_number_id(phone_number_id)
                if not integration_account:
                    continue

                integration_id = integration_account.get("integration_id")
                integration_account_id = integration_account.get("id")
                integration_account_id = integration_account.get("id")
                access_token = _get_integration_token(
                    integration_id,
                    integration_account_id,
                )
                integrations = integration_account.get("integrations") or {}
                if isinstance(integrations, list):
                    workspace_id = integrations[0].get("workspace_id") if integrations else None
                else:
                    workspace_id = integrations.get("workspace_id")

                contacts = value.get("contacts") if isinstance(value.get("contacts"), list) else []
                messages = value.get("messages") if isinstance(value.get("messages"), list) else []

                for message in messages:
                    if not workspace_id:
                        continue
                    if not is_workspace_not_expired(workspace_id):
                        workspace_blocked = True
                        continue

                    wa_id = message.get("from") or ""
                    if not wa_id:
                        continue
                    contact_match = next(
                        (contact for contact in contacts if contact.get("wa_id") == wa_id),
                        None,
                    )
                    name = None
                    if contact_match:
                        name = (contact_match.get("profile") or {}).get("name")
                    phone = message.get("from") or wa_id

                    mapped = _map_message(message)
                    created_at = _parse_message_timestamp(message)

                    lead = _upsert_lead(
                        workspace_id=workspace_id,
                        wa_id=wa_id,
                        name=name,
                        phone=phone,
                    )

                    conversation = _upsert_conversation(
                        workspace_id=workspace_id,
                        lead_id=lead["id"],
                        integration_account_id=integration_account_id,
                        last_message=mapped["conteudo"],
                        last_at=created_at,
                    )

                    conversation_ids.append(conversation["id"])

                    message_row_id = _upsert_message(
                        workspace_id=workspace_id,
                        conversation_id=conversation["id"],
                        message_id=message.get("id"),
                        author="contato",
                        message_type=mapped["tipo"],
                        content=mapped["conteudo"],
                        created_at=created_at,
                        sender_id=wa_id,
                        sender_name=name,
                    )
                    if message_row_id:
                        emit_message_created(
                            workspace_id,
                            conversation["id"],
                            {
                                "id": message_row_id,
                                "autor": "contato",
                                "tipo": mapped["tipo"],
                                "conteudo": mapped["conteudo"],
                                "created_at": created_at,
                                "sender_id": wa_id,
                                "sender_nome": name,
                            },
                        )
                        emit_conversation_updated(
                            workspace_id,
                            conversation["id"],
                            {
                                "status": conversation.get("status", "aberta"),
                                "ultima_mensagem": mapped["conteudo"],
                                "ultima_mensagem_em": created_at,
                            },
                        )

                    media_id = mapped.get("media_id")
                    if media_id and process_media:
                        try:
                            attachment = _store_attachment(
                                access_token=access_token,
                                workspace_id=workspace_id,
                                conversation_id=conversation["id"],
                                message_row_id=message_row_id,
                                media_id=media_id,
                                message_type=mapped.get("media_tipo") or mapped["tipo"],
                                filename=mapped.get("filename"),
                            )
                            if attachment and message_row_id:
                                emit_attachment_created(
                                    workspace_id,
                                    conversation["id"],
                                    message_row_id,
                                    attachment,
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

    if workspace_blocked and not conversation_ids:
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
