import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const baileysApiUrl = process.env.BAILEYS_API_URL ?? "";
const baileysApiKey = process.env.BAILEYS_API_KEY ?? "";

const PROVIDER_BAILEYS = "whatsapp_baileys";

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  if (!baileysApiUrl) {
    return new Response("Missing BAILEYS_API_URL", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header", { status: 401 });
  }

  const body = await request.json();
  const integrationAccountId = body.integrationAccountId as string | undefined;
  if (!integrationAccountId) {
    return new Response("Missing integrationAccountId", { status: 400 });
  }

  const { data: account } = await supabaseServer
    .from("integration_accounts")
    .select(
      "id, integration_id, provider, integrations!inner(workspace_id)"
    )
    .eq("id", integrationAccountId)
    .eq("provider", PROVIDER_BAILEYS)
    .maybeSingle();

  if (!account) {
    return new Response("Conta nao encontrada", { status: 404 });
  }

  const workspaceId = Array.isArray(account.integrations)
    ? account.integrations[0]?.workspace_id
    : (account.integrations as any)?.workspace_id;
  if (!workspaceId) {
    return new Response("Conta sem workspace", { status: 500 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  if (membership.role !== "ADMIN") {
    return new Response("Apenas administradores podem desconectar canais.", {
      status: 403,
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (baileysApiKey) {
    headers["X-API-KEY"] = baileysApiKey;
  }

  const response = await fetch(
    `${baileysApiUrl}/sessions/${integrationAccountId}/disconnect`,
    {
      method: "POST",
      headers,
    }
  );

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    return new Response(detalhe || "Falha ao desconectar", { status: 502 });
  }

  await supabaseServer
    .from("conversations")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("canal", "whatsapp");

  await supabaseServer
    .from("leads")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("canal_origem", "whatsapp");

  const updatePayloadBase = {
    status: "desconectado",
    sync_status: null,
    sync_total: null,
    sync_done: null,
    sync_started_at: null,
    sync_finished_at: null,
    sync_last_error: null,
  };

  const updatePayloadWithChats = {
    ...updatePayloadBase,
    sync_total_chats: null,
    sync_done_chats: null,
  };

  const { error: updateError } = await supabaseServer
    .from("integration_accounts")
    .update(updatePayloadWithChats)
    .eq("id", account.id);

  if (updateError) {
    await supabaseServer
      .from("integration_accounts")
      .update(updatePayloadBase)
      .eq("id", account.id);
  }

  return Response.json({ success: true });
}
