export const createSessionRepository = ({
  supabase,
  sessionTable,
  logger,
}) => {
  const ensureSessionRow = async (integrationAccountId, workspaceId) => {
    await supabase
      .from(sessionTable)
      .upsert(
        {
          integration_account_id: integrationAccountId,
          workspace_id: workspaceId,
          status: "conectando",
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "integration_account_id" }
      );
  };

  const updateSessionRow = async (integrationAccountId, payload) => {
    await supabase
      .from(sessionTable)
      .update({ ...payload, last_seen_at: new Date().toISOString() })
      .eq("integration_account_id", integrationAccountId);
  };

  const updateIntegrationAccount = async (integrationAccountId, payload) => {
    await supabase.from("integration_accounts").update(payload).eq(
      "id",
      integrationAccountId
    );
  };

  const updateSyncStatus = async (integrationAccountId, payload) => {
    if (!payload || typeof payload !== "object") return;
    const {
      sync_total_chats,
      sync_done_chats,
      ...basePayload
    } = payload;

    if (Object.keys(basePayload).length > 0) {
      const { error } = await supabase
        .from("integration_accounts")
        .update(basePayload)
        .eq("id", integrationAccountId);
      if (error) {
        logger.warn({ err: error }, "Failed to update sync status");
      }
    }

    const hasChatPayload =
      sync_total_chats !== undefined || sync_done_chats !== undefined;
    if (hasChatPayload) {
      const { error } = await supabase
        .from("integration_accounts")
        .update({
          ...(sync_total_chats !== undefined ? { sync_total_chats } : {}),
          ...(sync_done_chats !== undefined ? { sync_done_chats } : {}),
        })
        .eq("id", integrationAccountId);
      if (error) {
        logger.warn({ err: error }, "Failed to update sync chat counters");
      }
    }
  };

  const fetchIntegrationAccount = async (integrationAccountId) => {
    const { data } = await supabase
      .from("integration_accounts")
      .select(
        "id, integration_id, provider, integrations!inner(workspace_id)"
      )
      .eq("id", integrationAccountId)
      .eq("provider", "whatsapp_baileys")
      .maybeSingle();
    return data ?? null;
  };

  const fetchSessionSnapshot = async (integrationAccountId) => {
    const { data } = await supabase
      .from(sessionTable)
      .select("status, last_qr, numero, nome")
      .eq("integration_account_id", integrationAccountId)
      .maybeSingle();
    return data ?? null;
  };

  return {
    ensureSessionRow,
    updateSessionRow,
    updateIntegrationAccount,
    updateSyncStatus,
    fetchIntegrationAccount,
    fetchSessionSnapshot,
  };
};
