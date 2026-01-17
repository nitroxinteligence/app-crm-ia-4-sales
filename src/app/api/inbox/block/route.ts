import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { emitConversationUpdated } from "@/lib/pusher/events";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
  conversationId: z.string().trim().min(1),
});

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

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { conversationId } = parsed.data;

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  if (conversation.lead_id) {
    await userClient
      .from("leads")
      .update({ status: "bloqueado" })
      .eq("id", conversation.lead_id)
      .eq("workspace_id", membership.workspace_id);
  }

  const { data: updatedConversation } = await userClient
    .from("conversations")
    .update({ status: "spam" })
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id)
    .select("id, status, owner_id")
    .maybeSingle();

  if (updatedConversation) {
    await emitConversationUpdated({
      workspace_id: membership.workspace_id,
      conversation_id: updatedConversation.id,
      status: updatedConversation.status,
      owner_id: updatedConversation.owner_id ?? null,
    });
  }

  return Response.json({ ok: true });
}
