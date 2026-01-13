from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.clients.supabase import get_supabase_client
from app.clients.uazapi_client import UazapiClient
from app.services.uazapi_ingestion import (
    _extract_messages,
    _map_message,
    _normalize_sender,
    _parse_message_timestamp,
    _upsert_conversation,
    _upsert_lead,
    _upsert_message,
)
from app.services.workspaces import is_workspace_not_expired


PROVIDER_NAO_OFICIAL = "whatsapp_nao_oficial"


def _normalize_chat_id(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if "@s.whatsapp.net" in raw or "@g.us" in raw:
        return raw
    digits = _normalize_sender(raw)
    return f"{digits}@s.whatsapp.net" if digits else raw


def _extract_chats(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ["data", "chats", "items", "result"]:
            nested = payload.get(key)
            if nested is not None:
                chats = _extract_chats(nested)
                if chats:
                    return chats
    return []


def _extract_total(payload: Any) -> int | None:
    if isinstance(payload, dict):
        pagination = payload.get("pagination")
        if isinstance(pagination, dict):
            total = pagination.get("totalRecords") or pagination.get("total")
            if isinstance(total, (int, float)):
                return int(total)
        total = payload.get("total") or payload.get("totalChats")
        if isinstance(total, (int, float)):
            return int(total)
    return None


def _list_chats(
    client: UazapiClient,
    limit: int = 200,
    max_total: int | None = None,
) -> tuple[list[dict], int | None]:
    offset = 0
    result: list[dict] = []
    total_records: int | None = None
    while True:
        payload = {
            "operator": "AND",
            "sort": "-wa_lastMsgTimestamp",
            "limit": limit,
            "offset": offset,
        }
        response = client.chat_find(payload)
        if total_records is None:
            total_records = _extract_total(response)
        chats = _extract_chats(response)
        if not chats and offset == 0:
            fallback_payload = {"limit": limit, "offset": offset}
            response = client.chat_find(fallback_payload)
            if total_records is None:
                total_records = _extract_total(response)
            chats = _extract_chats(response)
        chats = [chat for chat in chats if isinstance(chat, dict)]
        if not chats:
            break
        result.extend(chats)
        if max_total and len(result) >= max_total:
            result = result[:max_total]
            break
        if len(chats) < limit:
            break
        offset += limit
    return result, total_records


def _resolve_chat_id(chat: dict) -> str | None:
    for key in [
        "chatid",
        "chatId",
        "jid",
        "remoteJid",
        "wa_id",
        "wa_chatid",
        "wa_chatlid",
        "number",
        "id",
        "name",
    ]:
        value = chat.get(key)
        if isinstance(value, str) and value.strip():
            return _normalize_chat_id(value)
    return None


def _resolve_chat_name(chat: dict) -> str | None:
    for key in ["name", "pushName", "wa_name", "wa_contactName", "displayName"]:
        value = chat.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _resolve_chat_avatar(chat: dict) -> str | None:
    for key in ["imagePreview", "image", "profilePicUrl", "wa_profilePicUrl"]:
        value = chat.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _resolve_last_message(chat: dict) -> tuple[str | None, str | None]:
    last_text = (
        chat.get("wa_lastMsg")
        or chat.get("lastMessage")
        or chat.get("last_message")
        or None
    )
    last_ts = (
        chat.get("wa_lastMsgTimestamp")
        or chat.get("lastMsgTimestamp")
        or chat.get("last_message_timestamp")
        or None
    )
    if isinstance(last_ts, (int, float, str)):
        try:
            value = int(last_ts)
            if value > 1_000_000_000_000:
                value = int(value / 1000)
            last_at = datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
        except Exception:
            last_at = None
    else:
        last_at = None
    if isinstance(last_text, dict):
        last_text = last_text.get("text")
    if isinstance(last_text, str) and last_text.strip():
        return last_text.strip(), last_at
    return None, last_at


def _prune_messages(conversation_id: str, limit: int = 50) -> None:
    supabase = get_supabase_client()
    response = (
        supabase.table("messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit + 50)
        .execute()
    )
    rows = response.data or []
    if len(rows) <= limit:
        return
    ids = [row["id"] for row in rows[limit:]]
    if not ids:
        return
    supabase.table("messages").delete().in_("id", ids).execute()


def _update_sync_status(
    integration_account_id: str,
    status: str,
    total: int | None = None,
    done: int | None = None,
    error: str | None = None,
    finished: bool = False,
) -> None:
    supabase = get_supabase_client()
    payload: dict[str, Any] = {"sync_status": status}
    if total is not None:
        payload["sync_total"] = total
    if done is not None:
        payload["sync_done"] = done
    if error is not None:
        payload["sync_last_error"] = error
    if status == "running":
        payload["sync_started_at"] = datetime.now(timezone.utc).isoformat()
        payload["sync_finished_at"] = None
    if finished:
        payload["sync_finished_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("integration_accounts").update(payload).eq(
        "id", integration_account_id
    ).execute()


def sync_uazapi_history(workspace_id: str, integration_account_id: str) -> dict:
    supabase = get_supabase_client()
    account_response = (
        supabase.table("integration_accounts")
        .select(
            "id, integration_id, instance_id, identificador, sync_status, integrations!inner(workspace_id)"
        )
        .eq("id", integration_account_id)
        .eq("provider", PROVIDER_NAO_OFICIAL)
        .single()
        .execute()
    )
    account = account_response.data
    if not account:
        return {"status": "not_found", "chats": 0, "messages": 0}

    integrations = account.get("integrations") or {}
    if isinstance(integrations, list):
        workspace_check = integrations[0].get("workspace_id") if integrations else None
    else:
        workspace_check = integrations.get("workspace_id")

    if workspace_check != workspace_id:
        return {"status": "forbidden", "chats": 0, "messages": 0}

    if not is_workspace_not_expired(workspace_id):
        return {"status": "blocked", "chats": 0, "messages": 0}

    token_response = (
        supabase.table("integration_tokens")
        .select("access_token")
        .eq("integration_account_id", integration_account_id)
        .limit(1)
        .execute()
    )
    tokens = token_response.data or []
    if not tokens:
        return {"status": "missing_token", "chats": 0, "messages": 0}

    token = tokens[0].get("access_token")
    if not token:
        return {"status": "missing_token", "chats": 0, "messages": 0}

    if account.get("sync_status") == "done":
        return {"status": "already_done", "chats": 0, "messages": 0}

    try:
        client = UazapiClient(token)
        chats, total_records = _list_chats(client, limit=100, max_total=100)
        total_records = min(total_records or len(chats), len(chats))
        _update_sync_status(
            integration_account_id,
            status="running",
            total=total_records,
            done=0,
        )

        total_messages = 0
        for index, chat in enumerate(chats, start=1):
            chat_id = _resolve_chat_id(chat)
            if not chat_id:
                continue

            messages_payload = client.message_find(
                {"chatid": chat_id, "limit": 50, "offset": 0}
            )
            messages = _extract_messages(messages_payload)
            if not messages:
                messages = _extract_messages(messages_payload.get("data") if isinstance(messages_payload, dict) else {})

            if not messages:
                continue

            name = _resolve_chat_name(chat)
            wa_id = _normalize_sender(chat_id)
            lead = _upsert_lead(
                workspace_id=workspace_id,
                wa_id=wa_id,
                name=name,
                phone=_normalize_sender(wa_id),
                avatar_url=_resolve_chat_avatar(chat),
            )

            newest = messages[0]
            mapped_newest = _map_message(newest)
            last_at = _parse_message_timestamp(newest)
            last_text = mapped_newest["conteudo"]

            conversation = _upsert_conversation(
                workspace_id=workspace_id,
                lead_id=lead["id"],
                integration_account_id=integration_account_id,
                last_message=last_text,
                last_at=last_at,
            )

            for message in reversed(messages):
                from_me = message.get("fromMe")
                if isinstance(message.get("key"), dict):
                    from_me = from_me or message["key"].get("fromMe")
                if message.get("wasSentByApi"):
                    continue

                author = "equipe" if from_me else "contato"
                mapped = _map_message(message)
                created_at = _parse_message_timestamp(message)

                _upsert_message(
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
                )

                total_messages += 1

            _prune_messages(conversation["id"], limit=50)

            if index == total_records or index % 10 == 0:
                _update_sync_status(
                    integration_account_id,
                    status="running",
                    total=total_records,
                    done=index,
                )

        _update_sync_status(
            integration_account_id,
            status="done",
            total=total_records,
            done=total_records,
            finished=True,
        )
        return {"status": "ok", "chats": len(chats), "messages": total_messages}
    except Exception as exc:
        _update_sync_status(
            integration_account_id,
            status="erro",
            error=str(exc),
            finished=True,
        )
        raise
