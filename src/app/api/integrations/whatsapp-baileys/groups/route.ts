import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const agentsBaseUrl = process.env.AGENTS_API_URL ?? "";
const agentsApiKey = process.env.AGENTS_API_KEY;

const PROVIDER_BAILEYS = "whatsapp_baileys";

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
  if (!agentsBaseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const integrationAccountId = searchParams.get("integrationAccountId");
  if (!workspaceId) return new Response("Missing workspaceId", { status: 400 });
  if (!integrationAccountId) {
    return new Response("Missing integrationAccountId", { status: 400 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: account } = await supabaseServer
    .from("integration_accounts")
    .select("id, provider, integration_id")
    .eq("id", integrationAccountId)
    .eq("provider", PROVIDER_BAILEYS)
    .maybeSingle();

  if (!account?.integration_id) {
    return new Response("Integration account not found", { status: 404 });
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("workspace_id")
    .eq("id", account.integration_id)
    .maybeSingle();

  if (!integration?.workspace_id || integration.workspace_id !== workspaceId) {
    return new Response("Integration account not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (agentsApiKey) {
    headers["X-Agents-Key"] = agentsApiKey;
  }

  let response: Response;
  try {
    response = await fetch(
      `${agentsBaseUrl}/integrations/whatsapp-baileys/groups?integration_account_id=${integrationAccountId}`,
      { headers }
    );
  } catch {
    return new Response("Agents service unreachable", { status: 503 });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = detail ? `Agents error: ${detail}` : "Agents error";
    return new Response(message, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
