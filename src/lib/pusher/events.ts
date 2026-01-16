import { randomUUID } from "crypto";
import type {
  PusherAttachmentPayload,
  PusherConversationUpdatedPayload,
  PusherMessagePayload,
  PusherTagsUpdatedPayload,
} from "@/lib/pusher/types";
import { conversationChannel, workspaceChannel } from "@/lib/pusher/channels";
import { getPusherServer } from "@/lib/pusher/server";

const triggerSafe = async (channel: string, event: string, payload: unknown) => {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(channel, event, payload);
  } catch (error) {
    console.error("Pusher trigger error:", event, channel, error);
  }
};

export const emitMessageCreated = async (payload: Omit<PusherMessagePayload, "event_id">) => {
  const fullPayload: PusherMessagePayload = {
    event_id: randomUUID(),
    ...payload,
  };

  await triggerSafe(
    conversationChannel(payload.conversation_id),
    "message:created",
    fullPayload
  );
};

export const emitAttachmentCreated = async (
  payload: Omit<PusherAttachmentPayload, "event_id">
) => {
  const fullPayload: PusherAttachmentPayload = {
    event_id: randomUUID(),
    ...payload,
  };

  await triggerSafe(
    conversationChannel(payload.conversation_id),
    "attachment:created",
    fullPayload
  );
};

export const emitConversationUpdated = async (
  payload: Omit<PusherConversationUpdatedPayload, "event_id">
) => {
  const fullPayload: PusherConversationUpdatedPayload = {
    event_id: randomUUID(),
    ...payload,
  };

  await triggerSafe(
    workspaceChannel(payload.workspace_id),
    "conversation:updated",
    fullPayload
  );
};

export const emitTagsUpdated = async (payload: Omit<PusherTagsUpdatedPayload, "event_id">) => {
  const fullPayload: PusherTagsUpdatedPayload = {
    event_id: randomUUID(),
    ...payload,
  };

  await triggerSafe(
    workspaceChannel(payload.workspace_id),
    "tags:updated",
    fullPayload
  );
};
