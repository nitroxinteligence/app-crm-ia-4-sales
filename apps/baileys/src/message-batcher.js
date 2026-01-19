export const createMessageBatcher = ({
  supabase,
  logger,
  batchSize,
  flushIntervalMs,
}) => {
  const queue = [];
  let timer = null;
  let flushing = false;

  const scheduleFlush = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
  };

  const enqueue = ({ payload }) =>
    new Promise((resolve, reject) => {
      queue.push({ payload, resolve, reject });
      if (queue.length >= batchSize) {
        void flush();
      } else {
        scheduleFlush();
      }
    });

  const buildAuthorMap = async (items) => {
    const workspaceMap = new Map();
    for (const item of items) {
      const messageId = item?.payload?.whatsapp_message_id;
      const workspaceId = item?.payload?.workspace_id;
      if (!messageId || !workspaceId) continue;
      if (!workspaceMap.has(workspaceId)) {
        workspaceMap.set(workspaceId, new Set());
      }
      workspaceMap.get(workspaceId).add(messageId);
    }
    const authorMap = new Map();
    for (const [workspaceId, ids] of workspaceMap.entries()) {
      const { data, error } = await supabase
        .from("messages")
        .select("whatsapp_message_id, autor")
        .eq("workspace_id", workspaceId)
        .in("whatsapp_message_id", Array.from(ids));
      if (error) {
        throw error;
      }
      for (const row of data ?? []) {
        authorMap.set(
          `${workspaceId}:${row.whatsapp_message_id}`,
          row.autor
        );
      }
    }
    return authorMap;
  };

  const flush = async () => {
    if (flushing) return;
    if (!queue.length) return;
    flushing = true;
    const batch = queue.splice(0, batchSize);
    try {
      const authorMap = await buildAuthorMap(batch);
      for (const item of batch) {
        const workspaceId = item?.payload?.workspace_id;
        const messageId = item?.payload?.whatsapp_message_id;
        if (!workspaceId || !messageId) continue;
        const key = `${workspaceId}:${messageId}`;
        if (authorMap.get(key) === "agente") {
          item.payload.autor = "agente";
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .upsert(
          batch.map((item) => item.payload),
          { onConflict: "workspace_id,whatsapp_message_id" }
        )
        .select("id, workspace_id, whatsapp_message_id");
      if (error) {
        throw error;
      }
      const idMap = new Map(
        (data ?? []).map((row) => [
          `${row.workspace_id}:${row.whatsapp_message_id}`,
          row.id,
        ])
      );
      for (const item of batch) {
        const workspaceId = item?.payload?.workspace_id;
        const messageId = item?.payload?.whatsapp_message_id;
        if (!workspaceId || !messageId) {
          item.resolve(null);
          continue;
        }
        const id = idMap.get(`${workspaceId}:${messageId}`) ?? null;
        item.resolve(id);
      }
    } catch (error) {
      logger?.warn?.({ err: error }, "Falha ao gravar lote de mensagens");
      for (const item of batch) {
        item.reject(error);
      }
    } finally {
      flushing = false;
      if (queue.length) {
        void flush();
      }
    }
  };

  return {
    enqueue,
    flush,
  };
};
