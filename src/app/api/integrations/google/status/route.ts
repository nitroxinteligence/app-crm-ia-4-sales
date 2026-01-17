import { createClient } from "@supabase/supabase-js";
import { serverError, unauthorized } from "@/lib/api/responses";
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

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return unauthorized("Invalid auth");
  }

  const { data: integration } = await supabaseServer
    .from("calendar_integrations")
    .select("id, status, primary_calendar_id, created_at")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (!integration) {
    return Response.json({ connected: false });
  }

  const { data: syncState } = await supabaseServer
    .from("calendar_sync_state")
    .select("last_synced_at, expiration")
    .eq("integration_id", integration.id)
    .eq("calendar_id", integration.primary_calendar_id ?? "primary")
    .maybeSingle();

  return Response.json({
    connected: integration.status === "conectado",
    status: integration.status,
    connectedAt: integration.created_at,
    primaryCalendarId: integration.primary_calendar_id,
    lastSyncedAt: syncState?.last_synced_at ?? null,
    channelExpiresAt: syncState?.expiration ?? null,
  });
}
