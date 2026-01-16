from datetime import datetime, timezone
import mimetypes
from typing import Any

import httpx

from app.clients.supabase import get_supabase_client
from app.clients.r2_client import build_r2_key, get_r2_client
from app.config import settings
from app.services.realtime import (
    emit_attachment_created,
    emit_conversation_updated,
    emit_message_created,
)
from app.services.workspaces import is_workspace_not_expired


def _parse_message_timestamp(messaging: dict) -> str:
    timestamp = messaging.get("timestamp")
    if timestamp:
        try:
            return datetime.fromtimestamp(int(timestamp) / 1000, tz=timezone.utc).isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()


def _resolve_message_type(attachments: list[dict], text: str | None) -> str:
    if attachments:
        primary = attachments[0].get("type")
        if primary in {"image", "video"}:
            return "imagem"
        if primary == "audio":
            return "audio"
        if primary in {"file", "document"}:
            return "pdf"
    return "texto" if text else "texto"


def _extract_attachments(message: dict) -> list[dict]:
    attachments = message.get("attachments")
    if not isinstance(attachments, list):
        return []
    output = []
    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue
        payload = attachment.get("payload") or {}
        url = payload.get("url")
        if not url:
            continue
        output.append(
            {
                "type": attachment.get("type") or "file",
                "url": url,
            }
        )
    return output


def _get_integration_by_instagram_id(instagram_id: str | None) -> dict | None:
    if not instagram_id:
        return None
    supabase = get_supabase_client()
    response = (
        supabase.table("integration_accounts")
        .select("id, integration_id, integrations!inner(workspace_id)")
        .eq("identificador", instagram_id)
        .eq("integrations.canal", "instagram")
        .limit(1)
        .execute()
    )
    data = response.data or []
    return data[0] if data else None


def _upsert_lead(workspace_id: str, instagram_id: str) -> dict:
    supabase = get_supabase_client()
    payload = {
        "workspace_id": workspace_id,
        "whatsapp_wa_id": instagram_id,
        "canal_origem": "instagram",
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
        "canal": "instagram",
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


def _resolve_extension(mime_type: str | None, fallback_type: str) -> str:
    if mime_type:
        guess = mimetypes.guess_extension(mime_type)
        if guess:
            return guess
    if fallback_type in {"imagem", "image"}:
        return ".jpg"
    if fallback_type == "video":
        return ".mp4"
    if fallback_type == "audio":
        return ".mp3"
    if fallback_type in {"pdf", "file", "document"}:
        return ".pdf"
    return ".bin"


def _download_media(url: str, access_token: str | None) -> tuple[bytes, str | None]:
    headers = {"Authorization": f"Bearer {access_token}"} if access_token else None
    with httpx.Client(timeout=30) as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
        return response.content, response.headers.get("content-type")


def _store_attachment(
    access_token: str | None,
    workspace_id: str,
    conversation_id: str,
    message_row_id: str | None,
    media_url: str,
    attachment_type: str,
    message_type: str,
) -> dict | None:
    if not message_row_id:
        return None

    content, mime_type = _download_media(media_url, access_token)
    extension = _resolve_extension(mime_type, attachment_type)
    storage_path = f"{workspace_id}/{conversation_id}/{message_row_id}{extension}"

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

    tamanho = len(content)
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
    attachment_row = data[0] if isinstance(data, list) and data else data
    if not attachment_row or not isinstance(attachment_row, dict):
        return None
    return {
        "id": attachment_row.get("id"),
        "storage_path": storage_path,
        "tipo": message_type,
        "tamanho_bytes": tamanho,
    }


def _safe_get_payload(payload: Any) -> dict:
    if isinstance(payload, dict):
        return payload
    return {}


def process_instagram_event(event_id: str) -> dict:
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
            messaging_events = entry.get("messaging")
            if not isinstance(messaging_events, list):
                continue

            for messaging in messaging_events:
                message = messaging.get("message") or {}
                if not message:
                    continue
                if message.get("is_echo") or message.get("is_deleted") or message.get("is_unsupported"):
                    continue

                sender_id = (messaging.get("sender") or {}).get("id")
                recipient_id = (messaging.get("recipient") or {}).get("id")
                if not sender_id or not recipient_id:
                    continue

                integration_account = _get_integration_by_instagram_id(recipient_id)
                if not integration_account:
                    continue

                integration_id = integration_account.get("integration_id")
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

                if not workspace_id:
                    continue
                if not is_workspace_not_expired(workspace_id):
                    workspace_blocked = True
                    continue

                attachments = _extract_attachments(message)
                text = message.get("text") or ""
                message_type = _resolve_message_type(attachments, text)
                content = (
                    text.strip()
                    if text
                    else ("Midia recebida" if attachments else "Mensagem recebida")
                )
                created_at = _parse_message_timestamp(messaging)

                lead = _upsert_lead(workspace_id=workspace_id, instagram_id=sender_id)

                conversation = _upsert_conversation(
                    workspace_id=workspace_id,
                    lead_id=lead["id"],
                    integration_account_id=integration_account_id,
                    last_message=content,
                    last_at=created_at,
                )

                conversation_ids.append(conversation["id"])

                message_row_id = _upsert_message(
                    workspace_id=workspace_id,
                    conversation_id=conversation["id"],
                    message_id=message.get("mid"),
                    author="contato",
                    message_type=message_type,
                    content=content,
                    created_at=created_at,
                )
                if message_row_id:
                    emit_message_created(
                        workspace_id,
                        conversation["id"],
                        {
                            "id": message_row_id,
                            "autor": "contato",
                            "tipo": message_type,
                            "conteudo": content,
                            "created_at": created_at,
                        },
                    )
                    emit_conversation_updated(
                        workspace_id,
                        conversation["id"],
                        {
                            "status": conversation.get("status", "aberta"),
                            "ultima_mensagem": content,
                            "ultima_mensagem_em": created_at,
                        },
                    )

                if attachments:
                    for attachment in attachments:
                        try:
                            attachment_row = _store_attachment(
                                access_token=access_token,
                                workspace_id=workspace_id,
                                conversation_id=conversation["id"],
                                message_row_id=message_row_id,
                                media_url=attachment.get("url", ""),
                                attachment_type=attachment.get("type", "file"),
                                message_type=message_type,
                            )
                            if attachment_row and message_row_id:
                                emit_attachment_created(
                                    workspace_id,
                                    conversation["id"],
                                    message_row_id,
                                    attachment_row,
                                )
                        except Exception:
                            continue
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
