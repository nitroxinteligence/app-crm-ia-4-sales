export const createLeadBatcher = ({
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
        const waId = item?.payload?.whatsapp_wa_id;
        if (!workspaceId || !waId) continue;
        uniqueMap.set(`${workspaceId}:${waId}`, item.payload);
      }
      const payloads = Array.from(uniqueMap.values());
      if (!payloads.length) {
        for (const item of batch) item.resolve(null);
        return;
      }
      const { data, error } = await supabase
        .from("leads")
        .upsert(payloads, { onConflict: "workspace_id,whatsapp_wa_id" })
        .select("id, workspace_id, whatsapp_wa_id");
      if (error) {
        throw error;
      }
      const idMap = new Map(
        (data ?? []).map((row) => [
          `${row.workspace_id}:${row.whatsapp_wa_id}`,
          row.id,
        ])
      );
      for (const item of batch) {
        const workspaceId = item?.payload?.workspace_id;
        const waId = item?.payload?.whatsapp_wa_id;
        if (!workspaceId || !waId) {
          item.resolve(null);
          continue;
        }
        item.resolve(idMap.get(`${workspaceId}:${waId}`) ?? null);
      }
    } catch (error) {
      logger?.warn?.({ err: error }, "Falha ao gravar lote de leads");
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
