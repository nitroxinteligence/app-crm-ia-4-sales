import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const createRetryQueue = ({
  enabled,
  maxSize,
  queuePath,
  flushIntervalMs,
  cooldownMs,
  logger,
  bufferJSON,
  processMessage,
  getSession,
  buildChatMap,
  isTransientDbError,
}) => {
  const retryQueue = [];
  const resolvedQueuePath = path.resolve(process.cwd(), queuePath);
  let retryQueueFlushRunning = false;
  let retryQueueInterval = null;
  let dbUnavailableUntil = 0;

  const serializeRetryQueueItem = (item) =>
    JSON.stringify(item, bufferJSON.replacer);

  const parseRetryQueueItem = (line) => JSON.parse(line, bufferJSON.reviver);

  const ensureRetryQueueDir = async () => {
    await fs.mkdir(path.dirname(resolvedQueuePath), { recursive: true });
  };

  const writeRetryQueueToDisk = async () => {
    if (!enabled) return;
    await ensureRetryQueueDir();
    const content = retryQueue.length
      ? `${retryQueue.map(serializeRetryQueueItem).join("\n")}\n`
      : "";
    await fs.writeFile(resolvedQueuePath, content, "utf8");
  };

  const appendRetryQueueItem = async (item) => {
    if (!enabled) return;
    await ensureRetryQueueDir();
    await fs.appendFile(
      resolvedQueuePath,
      `${serializeRetryQueueItem(item)}\n`,
      "utf8"
    );
  };

  const markDbUnavailable = () => {
    if (!enabled) return;
    dbUnavailableUntil = Date.now() + cooldownMs;
  };

  const isDbUnavailable = () => enabled && Date.now() < dbUnavailableUntil;

  const loadFromDisk = async () => {
    if (!enabled) return;
    try {
      const content = await fs.readFile(resolvedQueuePath, "utf8");
      const lines = content.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const item = parseRetryQueueItem(line);
          if (item?.integrationAccountId && item?.message) {
            retryQueue.push(item);
          }
        } catch (error) {
          logger.warn({ err: error }, "Falha ao ler item da fila");
        }
      }
      if (retryQueue.length) {
        logger.info(
          { total: retryQueue.length },
          "Fila de retry carregada do disco"
        );
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        logger.warn({ err: error }, "Falha ao carregar fila de retry");
      }
    }
  };

  const enqueue = async ({ integrationAccountId, message, source }) => {
    if (!enabled) return false;
    const item = {
      id: crypto.randomUUID(),
      integrationAccountId,
      source,
      message,
      queued_at: new Date().toISOString(),
    };
    let dropped = false;
    if (retryQueue.length >= maxSize) {
      retryQueue.shift();
      dropped = true;
      logger.warn(
        { max: maxSize },
        "Fila de retry cheia; descartando mensagem mais antiga"
      );
    }
    retryQueue.push(item);
    try {
      if (dropped) {
        await writeRetryQueueToDisk();
      } else {
        await appendRetryQueueItem(item);
      }
    } catch (error) {
      logger.warn({ err: error }, "Falha ao persistir fila de retry");
    }
    return true;
  };

  const flush = async () => {
    if (!enabled) return;
    if (retryQueueFlushRunning) return;
    if (!retryQueue.length) return;
    retryQueueFlushRunning = true;
    let processed = 0;
    try {
      while (retryQueue.length) {
        const item = retryQueue[0];
        const session = getSession(item.integrationAccountId);
        if (!session || session.blocked || session.status === "desconectado") {
          break;
        }
        try {
          await processMessage({
            message: item.message,
            session,
            chatMap: session.chatMap ?? buildChatMap(),
            source: item.source ?? "realtime",
            queueOnDbFail: false,
          });
          retryQueue.shift();
          processed += 1;
        } catch (error) {
          if (isTransientDbError(error)) {
            markDbUnavailable();
            break;
          }
          retryQueue.shift();
          processed += 1;
          logger.error(
            { err: error, integrationAccountId: item.integrationAccountId },
            "Falha ao reprocessar mensagem da fila"
          );
        }
      }
      if (processed > 0) {
        await writeRetryQueueToDisk();
      }
    } catch (error) {
      logger.warn({ err: error }, "Falha ao processar fila de retry");
    } finally {
      retryQueueFlushRunning = false;
    }
  };

  const start = () => {
    if (!enabled || retryQueueInterval) return;
    retryQueueInterval = setInterval(() => {
      void flush();
    }, flushIntervalMs);
  };

  const hasPending = () => retryQueue.length > 0;

  return {
    enqueue,
    flush,
    hasPending,
    isDbUnavailable,
    loadFromDisk,
    markDbUnavailable,
    start,
  };
};
