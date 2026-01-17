import { createClient } from "@supabase/supabase-js";
import { serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccessToken } from "@/lib/google-calendar/sync";
import { stopChannel } from "@/lib/google-calendar/client";

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

export async function POST(request: Request) {
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
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (!integration) {
    return Response.json({ ok: true });
  }

  const { data: syncState } = await supabaseServer
    .from("calendar_sync_state")
    .select("channel_id, resource_id")
    .eq("integration_id", integration.id)
    .maybeSingle();

  try {
    if (syncState?.channel_id && syncState.resource_id) {
      const accessToken = await getAccessToken(integration.id);
      await stopChannel({
        accessToken,
        channelId: syncState.channel_id,
        resourceId: syncState.resource_id,
      });
    }
  } catch {
    // ignore stop failures to allow disconnect
  }

  await supabaseServer
    .from("calendar_integrations")
    .delete()
    .eq("id", integration.id);

  return Response.json({ ok: true });
}
