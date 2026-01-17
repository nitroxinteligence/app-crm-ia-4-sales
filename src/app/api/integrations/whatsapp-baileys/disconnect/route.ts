import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badGateway,
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const baileysApiUrl = getEnv("BAILEYS_API_URL");
const baileysApiKey = getEnv("BAILEYS_API_KEY");

const PROVIDER_BAILEYS = "whatsapp_baileys";

const payloadSchema = z.object({
  integrationAccountId: z.string().trim().min(1),
});

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
    return serverError("Missing Supabase env vars");
  }

  if (!baileysApiUrl) {
    return serverError("Missing BAILEYS_API_URL");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Missing integrationAccountId");
  }
  const { integrationAccountId } = parsed.data;

  const { data: account } = await supabaseServer
    .from("integration_accounts")
    .select(
      "id, integration_id, provider, integrations!inner(workspace_id)"
    )
    .eq("id", integrationAccountId)
    .eq("provider", PROVIDER_BAILEYS)
    .maybeSingle();

  if (!account) {
    return notFound("Conta nao encontrada");
  }

  const workspaceId = Array.isArray(account.integrations)
    ? account.integrations[0]?.workspace_id
    : (account.integrations as any)?.workspace_id;
  if (!workspaceId) {
    return serverError("Conta sem workspace");
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return forbidden("Forbidden");
  }

  if (membership.role !== "ADMIN") {
    return forbidden("Apenas administradores podem desconectar canais.");
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
    return badGateway(detalhe || "Falha ao desconectar");
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
