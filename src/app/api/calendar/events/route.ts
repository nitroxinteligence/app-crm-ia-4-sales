import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getAccessToken,
  getIntegrationByUser,
  mapGoogleEvent,
} from "@/lib/google-calendar/sync";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type GoogleEventPayload = {
  htmlLink?: string;
  hangoutLink?: string;
  colorId?: string;
  organizer?: { email?: string; displayName?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
    }>;
  };
};

const obterMeetLink = (payload: GoogleEventPayload | null) => {
  if (!payload) return null;
  if (payload.hangoutLink) return payload.hangoutLink;
  const entryPoint = payload.conferenceData?.entryPoints?.find(
    (item) => item.entryPointType === "video"
  );
  return entryPoint?.uri ?? null;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const defaultFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
};

const defaultTo = () => {
  const date = new Date();
  date.setDate(date.getDate() + 60);
  return date.toISOString();
};

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

  const integration = await getIntegrationByUser(user.id);
  if (!integration || integration.status !== "conectado") {
    return Response.json({ connected: false, events: [] });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? defaultFrom();
  const to = searchParams.get("to") ?? defaultTo();

  const { data: events, error } = await userClient
    .from("calendar_events")
    .select(
      "google_event_id, titulo, descricao, localizacao, status, is_all_day, start_at, end_at, payload"
    )
    .eq("integration_id", integration.id)
    .gte("start_at", from)
    .lte("start_at", to)
    .neq("status", "cancelled")
    .order("start_at", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const payload = (events ?? []).map((event) => {
    const data = (event.payload ?? null) as GoogleEventPayload | null;
    return {
      id: event.google_event_id,
      titulo: event.titulo,
      descricao: event.descricao,
      localizacao: event.localizacao,
      status: event.status,
      isAllDay: event.is_all_day,
      startAt: event.start_at,
      endAt: event.end_at,
      meetLink: obterMeetLink(data),
      htmlLink: data?.htmlLink ?? null,
      colorId: data?.colorId ?? null,
      organizer: data?.organizer ?? null,
      attendees: data?.attendees ?? null,
    };
  });

  return Response.json({ connected: true, events: payload });
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

  const integration = await getIntegrationByUser(user.id);
  if (!integration || !integration.primary_calendar_id) {
    return new Response("Google Calendar not connected", { status: 400 });
  }

  const body = await request.json();
  const titulo = body?.titulo?.trim();
  const descricao = body?.descricao ?? null;
  const localizacao = body?.localizacao ?? null;
  const startAt = body?.startAt;
  const endAt = body?.endAt;
  const isAllDay = Boolean(body?.isAllDay);
  const criarMeet = Boolean(body?.criarMeet);
  const colorId = Object.prototype.hasOwnProperty.call(body ?? {}, "colorId")
    ? body.colorId
    : undefined;
  const timeZone = body?.timeZone;

  if (!titulo || !startAt) {
    return new Response("Invalid payload", { status: 400 });
  }

  const accessToken = await getAccessToken(integration.id);
  const calendarId = integration.primary_calendar_id;

  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    return new Response("Invalid start time", { status: 400 });
  }

  const endDate = isAllDay
    ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
    : new Date(endAt ?? startAt);

  if (Number.isNaN(endDate.getTime())) {
    return new Response("Invalid end time", { status: 400 });
  }

  if (!isAllDay && endDate.getTime() <= startDate.getTime()) {
    return new Response("Invalid time range", { status: 400 });
  }

  const start = isAllDay
    ? { date: startDate.toISOString().slice(0, 10) }
    : {
        dateTime: startDate.toISOString(),
        ...(timeZone ? { timeZone } : {}),
      };

  const end = isAllDay
    ? { date: endDate.toISOString().slice(0, 10) }
    : {
        dateTime: endDate.toISOString(),
        ...(timeZone ? { timeZone } : {}),
      };

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  );
  if (criarMeet) {
    url.searchParams.set("conferenceDataVersion", "1");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: titulo,
      description: descricao,
      location: localizacao,
      start,
      end,
      ...(colorId ? { colorId } : {}),
      ...(criarMeet
        ? {
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return new Response(text || "Failed to create event", { status: 500 });
  }

  const event = await response.json();
  const row = mapGoogleEvent(integration.id, calendarId, event);

  if (row) {
    await supabaseServer.from("calendar_events").upsert(row, {
      onConflict: "integration_id,google_event_id",
    });
  }

  return Response.json({ ok: true, event: row });
}
