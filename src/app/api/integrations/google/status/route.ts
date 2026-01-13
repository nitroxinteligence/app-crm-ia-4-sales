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

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response("Invalid auth", { status: 401 });
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
