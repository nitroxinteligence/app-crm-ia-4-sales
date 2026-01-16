from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.clients.pusher_client import get_pusher_client


def workspace_channel(workspace_id: str) -> str:
    return f"private-workspace-{workspace_id}"


def conversation_channel(conversation_id: str) -> str:
    return f"private-conversation-{conversation_id}"


def _trigger(channel: str, event: str, payload: dict[str, Any]) -> None:
    try:
        client = get_pusher_client()
        client.trigger(channel, event, payload)
    except Exception:
        return


def emit_message_created(workspace_id: str, conversation_id: str, message: dict[str, Any]) -> None:
    payload = {
        "event_id": str(uuid4()),
        "workspace_id": workspace_id,
        "conversation_id": conversation_id,
        "message": message,
    }
    _trigger(conversation_channel(conversation_id), "message:created", payload)


def emit_attachment_created(
    workspace_id: str,
    conversation_id: str,
    message_id: str,
    attachment: dict[str, Any],
) -> None:
    payload = {
        "event_id": str(uuid4()),
        "workspace_id": workspace_id,
        "conversation_id": conversation_id,
        "message_id": message_id,
        "attachment": attachment,
    }
    _trigger(conversation_channel(conversation_id), "attachment:created", payload)


def emit_conversation_updated(
    workspace_id: str,
    conversation_id: str,
    updates: dict[str, Any],
) -> None:
    payload = {
        "event_id": str(uuid4()),
        "workspace_id": workspace_id,
        "conversation_id": conversation_id,
        **updates,
    }
    _trigger(workspace_channel(workspace_id), "conversation:updated", payload)


def emit_tags_updated(
    workspace_id: str,
    conversation_id: str,
    tags: list[str],
) -> None:
    payload = {
        "event_id": str(uuid4()),
        "workspace_id": workspace_id,
        "conversation_id": conversation_id,
        "tags": tags,
    }
    _trigger(workspace_channel(workspace_id), "tags:updated", payload)
