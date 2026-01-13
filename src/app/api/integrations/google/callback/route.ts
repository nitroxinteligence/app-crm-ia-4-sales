import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleConfig,
} from "@/lib/google-calendar/client";
import {
  ensurePrimaryCalendar,
  ensureWatchChannel,
  syncCalendarEvents,
} from "@/lib/google-calendar/sync";

export const runtime = "nodejs";

const redirectFallback = "/app/calendario?google=erro";

function buildRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  if (!clientId || !clientSecret || !redirectUri) {
    return buildRedirect(request, redirectFallback);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return buildRedirect(request, redirectFallback);
  }

  const { data: stateRow } = await supabaseServer
    .from("calendar_oauth_states")
    .select("id, user_id, workspace_id, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (!stateRow) {
    return buildRedirect(request, redirectFallback);
  }

  if (Date.parse(stateRow.expires_at) < Date.now()) {
    await supabaseServer
      .from("calendar_oauth_states")
      .delete()
      .eq("id", stateRow.id);
    return buildRedirect(request, redirectFallback);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { data: integration, error: integrationError } = await supabaseServer
      .from("calendar_integrations")
      .upsert(
        {
          user_id: stateRow.user_id,
          workspace_id: stateRow.workspace_id,
          provider: "google",
          status: "conectado",
        },
        { onConflict: "user_id,provider" }
      )
      .select("id, primary_calendar_id")
      .single();

    if (integrationError || !integration) {
      throw new Error("Failed to save integration");
    }

    const { data: currentTokens } = await supabaseServer
      .from("calendar_tokens")
      .select("refresh_token")
      .eq("integration_id", integration.id)
      .maybeSingle();

    const refreshToken = tokens.refresh_token ?? currentTokens?.refresh_token;

    await supabaseServer
      .from("calendar_tokens")
      .upsert(
        {
          integration_id: integration.id,
          access_token: tokens.access_token,
          refresh_token: refreshToken ?? null,
          expires_at: expiresAt,
        },
        { onConflict: "integration_id" }
      );

    const calendarId = await ensurePrimaryCalendar(
      integration.id,
      tokens.access_token
    );

    try {
      await ensureWatchChannel({
        integrationId: integration.id,
        calendarId,
        accessToken: tokens.access_token,
      });
    } catch {
      // permite seguir sem webhooks (sync manual)
    }

    await syncCalendarEvents({
      integrationId: integration.id,
      calendarId,
    });

    await supabaseServer
      .from("calendar_oauth_states")
      .delete()
      .eq("id", stateRow.id);

    return buildRedirect(request, "/app/calendario?google=conectado");
  } catch (error) {
    console.error("Google Calendar OAuth callback failed", error);
    await supabaseServer
      .from("calendar_integrations")
      .update({ status: "erro" })
      .eq("user_id", stateRow.user_id)
      .eq("provider", "google");
    return buildRedirect(request, redirectFallback);
  }
}
