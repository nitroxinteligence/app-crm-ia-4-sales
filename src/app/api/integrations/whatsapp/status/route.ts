import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
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
