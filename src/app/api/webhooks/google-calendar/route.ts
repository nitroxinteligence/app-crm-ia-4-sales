import { syncCalendarByChannel } from "@/lib/google-calendar/sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const channelToken = request.headers.get("x-goog-channel-token");

  if (!channelId) {
    return new Response("Missing channel id", { status: 400 });
  }

  await syncCalendarByChannel({
    channelId,
    resourceId,
    channelToken,
  });

  return new Response("ok", { status: 200 });
}
