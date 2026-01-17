import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header");
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return badRequest("Missing workspaceId");
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return forbidden("Forbidden");
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id, status, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("canal", "whatsapp")
    .maybeSingle();

  if (!integration) {
    return Response.json({ connected: false });
  }

  const { data: account } = await supabaseServer
    .from("integration_accounts")
    .select("nome, identificador, phone_number_id, waba_id, business_account_id")
    .eq("integration_id", integration.id)
    .eq("provider", "whatsapp_oficial")
    .maybeSingle();

  return Response.json({
    connected: integration.status === "conectado",
    connectedAt: integration.connected_at,
    account,
  });
}
