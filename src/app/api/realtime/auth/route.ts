import { createClient } from "@supabase/supabase-js";
import { getPusherServer } from "@/lib/pusher/server";
import { workspaceChannel } from "@/lib/pusher/channels";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const parseChannelId = (channelName: string, prefix: string) => {
  if (!channelName.startsWith(prefix)) return null;
  return channelName.slice(prefix.length);
};

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
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return new Response("Invalid payload.", { status: 400 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const allowedWorkspaceChannel = workspaceChannel(membership.workspace_id);
  if (channelName === allowedWorkspaceChannel) {
    const pusher = getPusherServer();
    const auth =
      "authorizeChannel" in pusher
        ? pusher.authorizeChannel(channelName, socketId)
        : pusher.authenticate(socketId, channelName);
    return Response.json(auth);
  }

  const conversationId = parseChannelId(channelName, "private-conversation-");
  if (!conversationId) {
    return new Response("Channel not allowed.", { status: 403 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Channel not allowed.", { status: 403 });
  }

  const pusher = getPusherServer();
  const auth =
    "authorizeChannel" in pusher
      ? pusher.authorizeChannel(channelName, socketId)
      : pusher.authenticate(socketId, channelName);
  return Response.json(auth);
}
