export const bootstrapSessions = async ({
  supabase,
  createSession,
  logger,
}) => {
  const { data } = await supabase
    .from("integration_accounts")
    .select("id, status, sync_last_error, integrations!inner(workspace_id)")
    .eq("provider", "whatsapp_baileys")
    .in("status", ["conectado", "conectando", "desconectado"]);

  const accounts = (data ?? []).filter(
    (account) => account.sync_last_error !== "manual_disconnect"
  );
  for (const account of accounts) {
    const workspaceId = Array.isArray(account.integrations)
      ? account.integrations[0]?.workspace_id
      : account.integrations?.workspace_id;
    if (!workspaceId) continue;
    try {
      await createSession({
        integrationAccountId: account.id,
        workspaceId,
        forceNew: false,
      });
    } catch (error) {
      logger.warn({ err: error }, "Failed to bootstrap session");
    }
  }
};
