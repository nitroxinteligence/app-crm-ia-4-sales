export const createAttachmentBatcher = ({
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

  const flush = async () => {
    if (flushing) return;
    if (!queue.length) return;
    flushing = true;
    const batch = queue.splice(0, batchSize);
    try {
      const uniqueMap = new Map();
      for (const item of batch) {
        const workspaceId = item?.payload?.workspace_id;
        const messageId = item?.payload?.message_id;
        const storagePath = item?.payload?.storage_path;
        if (!workspaceId || !messageId || !storagePath) continue;
        uniqueMap.set(`${workspaceId}:${messageId}:${storagePath}`, item.payload);
      }
      const payloads = Array.from(uniqueMap.values());
      if (!payloads.length) {
        for (const item of batch) item.resolve(null);
        return;
      }
      const { data, error } = await supabase
        .from("attachments")
        .insert(payloads)
        .select("id, workspace_id, message_id, storage_path");
      if (error) {
        throw error;
      }
      const idMap = new Map(
        (data ?? []).map((row) => [
          `${row.workspace_id}:${row.message_id}:${row.storage_path}`,
          row.id,
        ])
      );
      for (const item of batch) {
        const workspaceId = item?.payload?.workspace_id;
        const messageId = item?.payload?.message_id;
        const storagePath = item?.payload?.storage_path;
        if (!workspaceId || !messageId || !storagePath) {
          item.resolve(null);
          continue;
        }
        item.resolve(idMap.get(`${workspaceId}:${messageId}:${storagePath}`) ?? null);
      }
    } catch (error) {
      logger?.warn?.({ err: error }, "Falha ao gravar lote de anexos");
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
