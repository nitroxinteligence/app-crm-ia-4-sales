import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  badGateway,
  badRequest,
  forbidden,
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const agentsBaseUrl = getEnv("AGENTS_API_URL");
const agentsApiKey = getEnv("AGENTS_API_KEY") || undefined;

const PROVIDER_BAILEYS = "whatsapp_baileys";

const querySchema = z.object({
  workspaceId: z.string().trim().min(1),
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

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars");
  }
  if (!agentsBaseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header");
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId") ?? "",
    integrationAccountId: searchParams.get("integrationAccountId") ?? "",
  });
  if (!parsed.success) {
    return badRequest("Missing workspaceId or integrationAccountId");
  }
  const { workspaceId, integrationAccountId } = parsed.data;

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return forbidden("Forbidden");
  }

  const { data: account } = await supabaseServer
    .from("integration_accounts")
    .select("id, provider, integration_id")
    .eq("id", integrationAccountId)
    .eq("provider", PROVIDER_BAILEYS)
    .maybeSingle();

  if (!account?.integration_id) {
    return notFound("Integration account not found");
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("workspace_id")
    .eq("id", account.integration_id)
    .maybeSingle();

  if (!integration?.workspace_id || integration.workspace_id !== workspaceId) {
    return notFound("Integration account not found");
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
    return serviceUnavailable("Agents service unreachable");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = detail ? `Agents error: ${detail}` : "Agents error";
    return badGateway(message);
  }

  const data = await response.json();
  return NextResponse.json(data);
}
