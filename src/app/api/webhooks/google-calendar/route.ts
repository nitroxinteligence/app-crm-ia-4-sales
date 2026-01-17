import { z } from "zod";
import { badRequest, serverError } from "@/lib/api/responses";
import { syncCalendarByChannel } from "@/lib/google-calendar/sync";

export const runtime = "nodejs";

const headerSchema = z.object({
  channelId: z.string().trim().min(1),
  resourceId: z.string().trim().optional(),
  channelToken: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const channelToken = request.headers.get("x-goog-channel-token");

  const parsed = headerSchema.safeParse({
    channelId: channelId ?? "",
    resourceId: resourceId ?? undefined,
    channelToken: channelToken ?? undefined,
  });

  if (!parsed.success) {
    return badRequest("Missing channel id");
  }

  try {
    await syncCalendarByChannel({
      channelId: parsed.data.channelId,
      resourceId: parsed.data.resourceId,
      channelToken: parsed.data.channelToken,
    });
  } catch {
    return serverError("Failed to sync calendar");
  }

  return new Response("ok", { status: 200 });
}
