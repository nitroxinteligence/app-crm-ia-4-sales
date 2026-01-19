import crypto from "crypto";
import Pusher from "pusher";

export const createRealtime = ({
  logger,
  appId,
  key,
  secret,
  cluster,
}) => {
  let pusherServer = null;
  let pusherWarned = false;

  const workspaceChannel = (workspaceId) => `private-workspace-${workspaceId}`;
  const conversationChannel = (conversationId) =>
    `private-conversation-${conversationId}`;

  const getPusherServer = () => {
    if (!appId || !key || !secret || !cluster) {
      if (!pusherWarned) {
        pusherWarned = true;
        logger.warn(
          "Pusher envs ausentes; realtime do inbox sera desabilitado."
        );
      }
      return null;
    }
    if (!pusherServer) {
      pusherServer = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
    }
    return pusherServer;
  };

  const triggerPusher = async (channel, event, payload) => {
    const pusher = getPusherServer();
    if (!pusher) return;
    try {
      await pusher.trigger(channel, event, payload);
    } catch (error) {
      logger.warn({ err: error, event, channel }, "Falha ao disparar Pusher");
    }
  };

  const emitMessageCreated = async ({ workspaceId, conversationId, message }) => {
    await triggerPusher(conversationChannel(conversationId), "message:created", {
      event_id: crypto.randomUUID(),
      emitted_at: new Date().toISOString(),
      workspace_id: workspaceId,
      conversation_id: conversationId,
      message,
    });
  };

  const emitConversationUpdated = async ({
    workspaceId,
    conversationId,
    status,
    lastMessage,
    lastAt,
    tags,
  }) => {
    await triggerPusher(workspaceChannel(workspaceId), "conversation:updated", {
      event_id: crypto.randomUUID(),
      emitted_at: new Date().toISOString(),
      workspace_id: workspaceId,
      conversation_id: conversationId,
      ...(status ? { status } : {}),
      ...(typeof lastMessage === "string"
        ? { ultima_mensagem: lastMessage }
        : {}),
      ...(lastAt ? { ultima_mensagem_em: lastAt } : {}),
      ...(Array.isArray(tags) ? { tags } : {}),
    });
  };

  const emitAttachmentCreated = async ({
    workspaceId,
    conversationId,
    messageId,
    attachment,
  }) => {
    await triggerPusher(conversationChannel(conversationId), "attachment:created", {
      event_id: crypto.randomUUID(),
      emitted_at: new Date().toISOString(),
      workspace_id: workspaceId,
      conversation_id: conversationId,
      message_id: messageId,
      attachment,
    });
  };

  return {
    emitMessageCreated,
    emitConversationUpdated,
    emitAttachmentCreated,
  };
};
