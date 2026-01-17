import "server-only";
import { getEnv } from "@/lib/config";

const googleAuthBase = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleCalendarBase = "https://www.googleapis.com/calendar/v3";

const clientId = getEnv("GOOGLE_CLIENT_ID");
const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
const redirectUri = getEnv("GOOGLE_REDIRECT_URI");
const webhookUrl = getEnv("GOOGLE_WEBHOOK_URL");

const scopes = ["https://www.googleapis.com/auth/calendar"];

export const getGoogleConfig = () => ({
  clientId,
  clientSecret,
  redirectUri,
  webhookUrl,
});

export const buildGoogleAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${googleAuthBase}?${params.toString()}`;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to exchange Google token");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to refresh Google token");
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogle<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
) {
  const response = await fetch(`${googleCalendarBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || "Google Calendar API error");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export type GoogleCalendarEntry = {
  id?: string;
  summary?: string;
  timeZone?: string;
};

export const fetchPrimaryCalendar = (accessToken: string) =>
  fetchGoogle<GoogleCalendarEntry>(accessToken, "/users/me/calendarList/primary");

export type GoogleWatchResponse = {
  id?: string;
  resourceId?: string;
  resourceUri?: string;
  expiration?: string;
};

export async function watchCalendarEvents(params: {
  accessToken: string;
  calendarId: string;
  channelId: string;
  channelToken: string;
}) {
  const body = {
    id: params.channelId,
    type: "web_hook",
    address: webhookUrl,
    token: params.channelToken,
  };

  return fetchGoogle<GoogleWatchResponse>(
    params.accessToken,
    `/calendars/${encodeURIComponent(params.calendarId)}/events/watch`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function stopChannel(params: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}) {
  const response = await fetch(`${googleCalendarBase}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: params.channelId,
      resourceId: params.resourceId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to stop Google channel");
  }
}

export type GoogleEvent = {
  id?: string;
  recurringEventId?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type GoogleEventsListResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export async function listEvents(params: {
  accessToken: string;
  calendarId: string;
  syncToken?: string | null;
  timeMin?: string;
  timeMax?: string;
}) {
  const timeMin = params.timeMin?.trim() || undefined;
  let timeMax = params.timeMax?.trim() || undefined;

  if (timeMin && timeMax) {
    const minMs = Date.parse(timeMin);
    const maxMs = Date.parse(timeMax);
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) {
      timeMax = undefined;
    }
  }

  let pageToken: string | undefined;
  let items: GoogleEvent[] = [];
  let nextSyncToken: string | undefined;

  do {
    const query = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "2500",
    });

    if (params.syncToken) {
      query.set("syncToken", params.syncToken);
    } else {
      if (timeMin) query.set("timeMin", timeMin);
      if (timeMax) query.set("timeMax", timeMax);
    }

    if (pageToken) {
      query.set("pageToken", pageToken);
    }

    const response = await fetchGoogle<GoogleEventsListResponse>(
      params.accessToken,
      `/calendars/${encodeURIComponent(params.calendarId)}/events?${query}`
    );

    items = items.concat(response.items ?? []);
    pageToken = response.nextPageToken ?? undefined;
    nextSyncToken = response.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { items, nextSyncToken };
}
