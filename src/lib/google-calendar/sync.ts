import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchPrimaryCalendar,
  listEvents,
  refreshAccessToken,
  watchCalendarEvents,
  type GoogleEvent,
} from "@/lib/google-calendar/client";

const FULL_SYNC_PAST_DAYS = 90;
const FULL_SYNC_FUTURE_DAYS = 180;

type IntegrationRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  status: string;
  primary_calendar_id: string | null;
};

type TokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

type SyncStateRow = {
  id: string;
  integration_id: string;
  calendar_id: string;
  sync_token: string | null;
  channel_id: string | null;
  channel_token: string | null;
  resource_id: string | null;
  expiration: string | null;
};

export const mapGoogleEvent = (
  integrationId: string,
  calendarId: string,
  event: GoogleEvent
) => {
  if (!event.id) return null;
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startRaw = event.start?.dateTime ?? event.start?.date ?? null;
  const endRaw = event.end?.dateTime ?? event.end?.date ?? null;
  return {
    integration_id: integrationId,
    calendar_id: calendarId,
    google_event_id: event.id,
    recurring_event_id: event.recurringEventId ?? null,
    titulo: event.summary ?? "Evento",
    descricao: event.description ?? null,
    localizacao: event.location ?? null,
    status: event.status ?? null,
    is_all_day: isAllDay,
    start_at: startRaw ? new Date(startRaw).toISOString() : null,
    end_at: endRaw ? new Date(endRaw).toISOString() : null,
    updated_at_remote: event.updated ?? null,
    payload: event,
  };
};

export async function getIntegrationByUser(userId: string) {
  const { data, error } = await supabaseServer
    .from("calendar_integrations")
    .select("id, user_id, workspace_id, status, primary_calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as IntegrationRow | null;
}

async function getTokensForIntegration(integrationId: string) {
  const { data, error } = await supabaseServer
    .from("calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TokenRow | null;
}

export async function getAccessToken(integrationId: string) {
  const tokens = await getTokensForIntegration(integrationId);
  if (!tokens?.access_token) {
    throw new Error("Google tokens not found");
  }

  const now = Date.now();
  const expiresAt = tokens.expires_at ? Date.parse(tokens.expires_at) : 0;
  const needsRefresh = !expiresAt || expiresAt - now < 60_000;

  if (!needsRefresh) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error("Google refresh token missing");
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  const expiresAtIso = new Date(
    now + refreshed.expires_in * 1000
  ).toISOString();

  await supabaseServer
    .from("calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: expiresAtIso,
    })
    .eq("integration_id", integrationId);

  return refreshed.access_token;
}

export async function ensurePrimaryCalendar(
  integrationId: string,
  accessToken: string
) {
  const { data: integration } = await supabaseServer
    .from("calendar_integrations")
    .select("id, primary_calendar_id")
    .eq("id", integrationId)
    .maybeSingle();

  if (integration?.primary_calendar_id) {
    return integration.primary_calendar_id;
  }

  const primary = await fetchPrimaryCalendar(accessToken);
  if (!primary?.id) {
    throw new Error("Primary calendar not found");
  }

  await supabaseServer
    .from("calendar_integrations")
    .update({ primary_calendar_id: primary.id, status: "conectado" })
    .eq("id", integrationId);

  return primary.id;
}

export async function ensureWatchChannel(params: {
  integrationId: string;
  calendarId: string;
  accessToken: string;
}) {
  const { data } = await supabaseServer
    .from("calendar_sync_state")
    .select("*")
    .eq("integration_id", params.integrationId)
    .eq("calendar_id", params.calendarId)
    .maybeSingle();

  const channelId = data?.channel_id ?? crypto.randomUUID();
  const channelToken = data?.channel_token ?? crypto.randomUUID();

  const watch = await watchCalendarEvents({
    accessToken: params.accessToken,
    calendarId: params.calendarId,
    channelId,
    channelToken,
  });

  const expiration = watch.expiration
    ? new Date(Number(watch.expiration)).toISOString()
    : null;

  await supabaseServer.from("calendar_sync_state").upsert(
    {
      id: data?.id ?? crypto.randomUUID(),
      integration_id: params.integrationId,
      calendar_id: params.calendarId,
      channel_id: channelId,
      channel_token: channelToken,
      resource_id: watch.resourceId ?? null,
      expiration,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "integration_id,calendar_id" }
  );

  return {
    channelId,
    channelToken,
    resourceId: watch.resourceId ?? null,
    expiration,
  };
}

export async function syncCalendarEvents(params: {
  integrationId: string;
  calendarId: string;
}) {
  const accessToken = await getAccessToken(params.integrationId);

  const { data: syncState } = await supabaseServer
    .from("calendar_sync_state")
    .select("id, sync_token")
    .eq("integration_id", params.integrationId)
    .eq("calendar_id", params.calendarId)
    .maybeSingle();

  const now = new Date();
  const minDate = new Date(
    now.getTime() - FULL_SYNC_PAST_DAYS * 24 * 60 * 60 * 1000
  );
  const maxDate = new Date(
    now.getTime() + FULL_SYNC_FUTURE_DAYS * 24 * 60 * 60 * 1000
  );

  let timeMin: string | undefined = minDate.toISOString();
  let timeMax: string | undefined = maxDate.toISOString();

  if (
    Number.isNaN(minDate.getTime()) ||
    Number.isNaN(maxDate.getTime()) ||
    maxDate.getTime() <= minDate.getTime()
  ) {
    timeMin = undefined;
    timeMax = undefined;
  }

  let syncToken = syncState?.sync_token ?? null;
  let response;

  try {
    response = await listEvents({
      accessToken,
      calendarId: params.calendarId,
      syncToken,
      timeMin,
      timeMax,
    });
  } catch (error) {
    if ((error as Error & { status?: number }).status === 410) {
      syncToken = null;
      response = await listEvents({
        accessToken,
        calendarId: params.calendarId,
        syncToken: null,
        timeMin,
        timeMax,
      });
    } else {
      throw error;
    }
  }

  const eventos =
    response?.items
      ?.map((event) => mapGoogleEvent(params.integrationId, params.calendarId, event))
      .filter(Boolean) ?? [];

  if (eventos.length) {
    await supabaseServer
      .from("calendar_events")
      .upsert(eventos, { onConflict: "integration_id,google_event_id" });
  }

  if (response?.nextSyncToken) {
    await supabaseServer.from("calendar_sync_state").upsert(
      {
        id: syncState?.id ?? crypto.randomUUID(),
        integration_id: params.integrationId,
        calendar_id: params.calendarId,
        sync_token: response.nextSyncToken,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "integration_id,calendar_id" }
    );
  }
}

export async function syncCalendarByChannel(params: {
  channelId: string;
  resourceId?: string | null;
  channelToken?: string | null;
}) {
  const { data, error } = await supabaseServer
    .from("calendar_sync_state")
    .select("*")
    .eq("channel_id", params.channelId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const syncState = data as SyncStateRow;

  if (params.resourceId && syncState.resource_id !== params.resourceId) {
    return;
  }

  if (params.channelToken && syncState.channel_token !== params.channelToken) {
    return;
  }

  await syncCalendarEvents({
    integrationId: syncState.integration_id,
    calendarId: syncState.calendar_id,
  });
}
