import { createClient } from "@supabase/supabase-js";
import { getPusherServer } from "@/lib/pusher/server";
import { workspaceChannel } from "@/lib/pusher/channels";
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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
    return serverError("Missing Supabase env vars.");
  }

  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return badRequest("Invalid payload.");
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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const allowedWorkspaceChannel = workspaceChannel(membership.workspace_id);
  if (channelName === allowedWorkspaceChannel) {
    const pusher = getPusherServer();
    // Support both old and new Pusher SDK API
    const auth =
      "authorizeChannel" in pusher
        ? (pusher as { authorizeChannel: (channel: string, socketId: string) => object }).authorizeChannel(channelName, socketId)
        : (pusher as { authenticate: (socketId: string, channel: string) => object }).authenticate(socketId, channelName);
    return Response.json(auth);
  }

  const conversationId = parseChannelId(channelName, "private-conversation-");
  if (!conversationId) {
    return forbidden("Channel not allowed.");
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return forbidden("Channel not allowed.");
  }

  const pusher = getPusherServer();
  // Support both old and new Pusher SDK API
  const auth =
    "authorizeChannel" in pusher
      ? (pusher as { authorizeChannel: (channel: string, socketId: string) => object }).authorizeChannel(channelName, socketId)
      : (pusher as { authenticate: (socketId: string, channel: string) => object }).authenticate(socketId, channelName);
  return Response.json(auth);
}
