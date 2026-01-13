import { createClient } from "@supabase/supabase-js";
import { syncCalendarEvents } from "@/lib/google-calendar/sync";

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

export async function POST(request: Request) {
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
    return new Response("Primary calendar not found", { status: 400 });
  }

  await syncCalendarEvents({
    integrationId: integration.id,
    calendarId: integration.primary_calendar_id,
  });

  return Response.json({ ok: true });
}
