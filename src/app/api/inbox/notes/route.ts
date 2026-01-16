import { createClient } from "@supabase/supabase-js";
import {
  emitConversationUpdated,
  emitMessageCreated,
} from "@/lib/pusher/events";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type NotePayload = {
  conversationId?: string;
  content?: string;
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

  const body = (await request.json()) as NotePayload;
  const conversationId = body?.conversationId?.trim();
  const content = body?.content?.trim();

  if (!conversationId || !content) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversation not found.", { status: 404 });
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
    return new Response(messageError?.message ?? "Failed to save note.", {
      status: 500,
    });
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
