import { createClient } from "@supabase/supabase-js";
import { syncCalendarEvents } from "@/lib/google-calendar/sync";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

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
    return serverError("Missing Supabase env vars.");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header.");
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return unauthorized("Invalid auth.");
  }

  const { data: integration } = await userClient
    .from("calendar_integrations")
    .select("id, primary_calendar_id, status")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (!integration || integration.status !== "conectado") {
    return Response.json({ ok: false, connected: false });
  }

  if (!integration.primary_calendar_id) {
    return badRequest("Primary calendar not found.");
  }

  await syncCalendarEvents({
    integrationId: integration.id,
    calendarId: integration.primary_calendar_id,
  });

  return Response.json({ ok: true });
}
