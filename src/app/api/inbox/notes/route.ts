import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  emitConversationUpdated,
  emitMessageCreated,
} from "@/lib/pusher/events";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  content: z.string().trim().min(1),
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
  const { conversationId, content } = parsed.data;

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  const { data: message, error: messageError } = await userClient
    .from("messages")
    .insert({
      workspace_id: membership.workspace_id,
      conversation_id: conversation.id,
      autor: "equipe",
      tipo: "texto",
      conteudo: content,
      interno: true,
    })
    .select("id, created_at")
    .single();

  if (messageError || !message) {
    return serverError(messageError?.message ?? "Failed to save note.");
  }

  await userClient
    .from("conversations")
    .update({
      ultima_mensagem: content,
      ultima_mensagem_em: message.created_at ?? new Date().toISOString(),
    })
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id);

  const dataCriacao = message.created_at ?? new Date().toISOString();

  await emitMessageCreated({
    workspace_id: membership.workspace_id,
    conversation_id: conversation.id,
    message: {
      id: message.id,
      autor: "equipe",
      tipo: "texto",
      conteudo: content,
      created_at: dataCriacao,
      interno: true,
    },
  });

  await emitConversationUpdated({
    workspace_id: membership.workspace_id,
    conversation_id: conversation.id,
    ultima_mensagem: content,
    ultima_mensagem_em: dataCriacao,
  });

  return Response.json({ id: message.id });
}
