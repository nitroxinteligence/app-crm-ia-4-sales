import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getAccessToken,
  getIntegrationByUser,
  mapGoogleEvent,
} from "@/lib/google-calendar/sync";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
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
  const removerMeet = Boolean(body?.removerMeet);
  const colorId = Object.prototype.hasOwnProperty.call(body ?? {}, "colorId")
    ? body.colorId
    : undefined;

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
    : { dateTime: startDate.toISOString() };

  const end = isAllDay
    ? { date: endDate.toISOString().slice(0, 10) }
    : { dateTime: endDate.toISOString() };

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`
  );
  if (removerMeet || criarMeet) {
    url.searchParams.set("conferenceDataVersion", "1");
  }

  const response = await fetch(url.toString(), {
    method: "PATCH",
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
      ...(removerMeet ? { conferenceData: null } : {}),
      ...(colorId !== undefined ? { colorId } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return new Response(text || "Failed to update event", { status: 500 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
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

  const accessToken = await getAccessToken(integration.id);
  const calendarId = integration.primary_calendar_id;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return new Response(text || "Failed to delete event", { status: 500 });
  }

  await supabaseServer
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("integration_id", integration.id)
    .eq("google_event_id", eventId);

  return Response.json({ ok: true });
}
