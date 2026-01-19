import os from "os";
import Redis from "ioredis";

export const createRedisQueue = ({
  enabled,
  redisUrl,
  streamKey,
  consumerGroup,
  consumerName,
  batchSize,
  blockMs,
  maxLen,
  logger,
  bufferJSON,
  processMessage,
  getSession,
  buildChatMap,
  onMessageProcessed,
}) => {
  const isEnabled = Boolean(enabled && redisUrl);
  if (!isEnabled) {
    return {
      enabled: false,
      enqueue: async () => false,
      start: () => {},
      stop: () => {},
    };
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
  });
  const consumerId = consumerName || `${os.hostname()}-${process.pid}`;
  let running = false;

  const encode = (payload) =>
    JSON.stringify(payload, bufferJSON?.replacer ?? undefined);
  const decode = (payload) =>
    JSON.parse(payload, bufferJSON?.reviver ?? undefined);

  const toObject = (fields) => {
    const data = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    return data;
  };

  client.on("error", (error) => {
    logger?.warn?.({ err: error }, "Redis queue error");
  });

  const ensureGroup = async () => {
    try {
      await client.xgroup(
        "CREATE",
        streamKey,
        consumerGroup,
        "0",
        "MKSTREAM"
      );
    } catch (error) {
      const message = String(error?.message ?? error);
      if (!message.includes("BUSYGROUP")) {
        throw error;
      }
    }
  };

  const enqueue = async ({ integrationAccountId, message, source }) => {
    try {
      const payload = encode({ integrationAccountId, source, message });
      const queuedAt = new Date().toISOString();
      await client.xadd(
        streamKey,
        "MAXLEN",
        "~",
        String(maxLen),
        "*",
        "payload",
        payload,
        "queued_at",
        queuedAt
      );
      return true;
    } catch (error) {
      logger?.warn?.({ err: error }, "Failed to enqueue Redis message");
      return false;
    }
  };

  const processEntry = async (entryId, fields) => {
    const data = toObject(fields);
    if (!data.payload) {
      await client.xack(streamKey, consumerGroup, entryId);
      return;
    }
    let payload;
    try {
      payload = decode(data.payload);
    } catch (error) {
      logger?.warn?.({ err: error }, "Invalid redis payload");
      await client.xack(streamKey, consumerGroup, entryId);
      return;
    }
    const integrationAccountId = payload?.integrationAccountId;
    const session = integrationAccountId
      ? getSession(integrationAccountId)
      : null;
    if (!session || session.blocked || session.status === "desconectado") {
      await client.xack(streamKey, consumerGroup, entryId);
      return;
    }
    try {
      await processMessage({
        message: payload.message,
        session,
        chatMap: session.chatMap ?? buildChatMap(),
        source: payload.source ?? "realtime",
        queueOnDbFail: true,
      });
      await client.xack(streamKey, consumerGroup, entryId);
      if (onMessageProcessed) {
        await onMessageProcessed({
          payload,
          session,
        });
      }
    } catch (error) {
      logger?.error?.(
        { err: error, integrationAccountId },
        "Failed to process redis message"
      );
      await client.xack(streamKey, consumerGroup, entryId);
    }
  };

  const consumeLoop = async () => {
    await ensureGroup();
    while (running) {
      let response = null;
      try {
        response = await client.xreadgroup(
          "GROUP",
          consumerGroup,
          consumerId,
          "COUNT",
          String(batchSize),
          "BLOCK",
          String(blockMs),
          "STREAMS",
          streamKey,
          ">"
        );
      } catch (error) {
        logger?.warn?.({ err: error }, "Redis queue read failed");
        continue;
      }
      if (!response) continue;
      for (const [, entries] of response) {
        for (const [entryId, fields] of entries) {
          await processEntry(entryId, fields);
        }
      }
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    void consumeLoop();
  };

  const stop = async () => {
    running = false;
    try {
      await client.quit();
    } catch (error) {
      logger?.warn?.({ err: error }, "Redis quit failed");
    }
  };

  return {
    enabled: true,
    enqueue,
    start,
    stop,
  };
};
