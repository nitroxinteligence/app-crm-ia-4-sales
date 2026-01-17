import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getAccessToken,
  getIntegrationByUser,
  mapGoogleEvent,
} from "@/lib/google-calendar/sync";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const paramsSchema = z.object({
  eventId: z.string().trim().min(1),
});

const updateSchema = z.object({
  titulo: z.string().trim().min(1),
  descricao: z.string().trim().optional().nullable(),
  localizacao: z.string().trim().optional().nullable(),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().optional(),
  isAllDay: z.boolean().optional(),
  criarMeet: z.boolean().optional(),
  removerMeet: z.boolean().optional(),
  colorId: z.union([z.string(), z.null()]).optional(),
});

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
  const parsedParams = paramsSchema.safeParse({ eventId });
  if (!parsedParams.success) {
    return badRequest("Invalid event id.");
  }

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

  const integration = await getIntegrationByUser(user.id);
  if (!integration || !integration.primary_calendar_id) {
    return badRequest("Google Calendar not connected.");
  }

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const {
    titulo,
    descricao = null,
    localizacao = null,
    startAt,
    endAt,
    isAllDay = false,
    criarMeet = false,
    removerMeet = false,
    colorId,
  } = parsed.data;

  const accessToken = await getAccessToken(integration.id);
  const calendarId = integration.primary_calendar_id;

  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    return badRequest("Invalid start time.");
  }

  const endDate = isAllDay
    ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
    : new Date(endAt ?? startAt);

  if (Number.isNaN(endDate.getTime())) {
    return badRequest("Invalid end time.");
  }

  if (!isAllDay && endDate.getTime() <= startDate.getTime()) {
    return badRequest("Invalid time range.");
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
    )}/events/${encodeURIComponent(parsedParams.data.eventId)}`
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
    return serverError(text || "Failed to update event");
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
  const parsedParams = paramsSchema.safeParse({ eventId });
  if (!parsedParams.success) {
    return badRequest("Invalid event id.");
  }

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

  const integration = await getIntegrationByUser(user.id);
  if (!integration || !integration.primary_calendar_id) {
    return badRequest("Google Calendar not connected.");
  }

  const accessToken = await getAccessToken(integration.id);
  const calendarId = integration.primary_calendar_id;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(parsedParams.data.eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return serverError(text || "Failed to delete event");
  }

  await supabaseServer
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("integration_id", integration.id)
    .eq("google_event_id", parsedParams.data.eventId);

  return Response.json({ ok: true });
}
