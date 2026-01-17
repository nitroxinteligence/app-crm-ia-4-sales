import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  emitConversationUpdated,
  emitMessageCreated,
} from "@/lib/pusher/events";
import {
  badRequest,
  httpError,
  notFound,
  preconditionFailed,
  serverError,
  unauthorized,
  unprocessableEntity,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { parseGraphError } from "@/lib/whatsapp/graph";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const whatsappGraphVersion = getEnv("WHATSAPP_GRAPH_VERSION", "v20.0");

const payloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  templateName: z.string().trim().min(1),
  language: z.string().trim().min(2).optional(),
  variables: z
    .array(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
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
  const { conversationId, templateName } = parsed.data;
  const language = parsed.data.language ?? "pt_BR";
  const variables = (parsed.data.variables ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean);

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, canal, lead_id, contact_id, status, integration_account_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  if (conversation.canal !== "whatsapp") {
    return unprocessableEntity("Canal nao suportado.");
  }

  let destinatario: string | null = null;
  if (conversation.lead_id) {
    const { data: lead } = await userClient
      .from("leads")
      .select("whatsapp_wa_id, telefone")
      .eq("id", conversation.lead_id)
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();
    destinatario = lead?.whatsapp_wa_id ?? lead?.telefone ?? null;
  }

  if (!destinatario && conversation.contact_id) {
    const { data: contact } = await userClient
      .from("contacts")
      .select("telefone")
      .eq("id", conversation.contact_id)
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();
    destinatario = contact?.telefone ?? null;
  }

  if (!destinatario) {
    return unprocessableEntity("Contato sem telefone.");
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id, status")
    .eq("workspace_id", membership.workspace_id)
    .eq("canal", "whatsapp")
    .eq("status", "conectado")
    .maybeSingle();

  if (!integration) {
    return preconditionFailed("Integracao nao conectada.");
  }

  const accountQuery = supabaseServer
    .from("integration_accounts")
    .select("id, phone_number_id, identificador, provider")
    .eq("integration_id", integration.id)
    .eq("provider", "whatsapp_oficial");

  if (conversation.integration_account_id) {
    accountQuery.eq("id", conversation.integration_account_id);
  }

  const { data: account } = await accountQuery.maybeSingle();

  if (!account) {
    return preconditionFailed("Conta WhatsApp oficial nao encontrada.");
  }

  const phoneNumberId = account?.phone_number_id ?? account?.identificador;
  if (!phoneNumberId) {
    return preconditionFailed("Numero WhatsApp nao encontrado.");
  }

  const { data: tokenRow } = await supabaseServer
    .from("integration_tokens")
    .select("access_token")
    .eq("integration_account_id", account?.id ?? "")
    .maybeSingle();

  let accessToken = tokenRow?.access_token ?? null;
  if (!accessToken) {
    const { data: tokenFallback } = await supabaseServer
      .from("integration_tokens")
      .select("access_token")
      .eq("integration_id", integration.id)
      .maybeSingle();
    accessToken = tokenFallback?.access_token ?? null;
  }

  if (!accessToken) {
    return preconditionFailed("Token da integracao nao encontrado.");
  }

  const templatePayload: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  };

  if (variables.length > 0) {
    templatePayload.components = [
      {
        type: "body",
        parameters: variables.map((value) => ({ type: "text", text: value })),
      },
    ];
  }

  const response = await fetch(
    `https://graph.facebook.com/${whatsappGraphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario,
        type: "template",
        template: templatePayload,
      }),
    }
  );

  if (!response.ok) {
    return httpError(
      await parseGraphError(response, "Falha ao enviar template"),
      response.status
    );
  }

  const payload = (await response.json()) as {
    messages?: Array<{ id?: string }>;
  };
  const messageId = payload.messages?.[0]?.id ?? null;

  const { data: message, error: messageError } = await userClient
    .from("messages")
    .insert({
      workspace_id: membership.workspace_id,
      conversation_id: conversation.id,
      autor: "equipe",
      tipo: "texto",
      conteudo: `Template: ${templateName}`,
      whatsapp_message_id: messageId,
    })
    .select("id, created_at")
    .single();

  if (messageError || !message) {
    return serverError(messageError?.message ?? "Failed to save message.");
  }

  await userClient
    .from("conversations")
    .update({
      ultima_mensagem: `Template: ${templateName}`,
      ultima_mensagem_em: message.created_at ?? new Date().toISOString(),
      status:
        conversation.status === "resolvida" || conversation.status === "pendente"
          ? "aberta"
          : conversation.status,
    })
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id);

  const dataCriacao = message.created_at ?? new Date().toISOString();
  const statusAtualizado =
    conversation.status === "resolvida" || conversation.status === "pendente"
      ? "aberta"
      : conversation.status;

  await emitMessageCreated({
    workspace_id: membership.workspace_id,
    conversation_id: conversation.id,
    message: {
      id: message.id,
      autor: "equipe",
      tipo: "texto",
      conteudo: `Template: ${templateName}`,
      created_at: dataCriacao,
      interno: false,
    },
  });

  await emitConversationUpdated({
    workspace_id: membership.workspace_id,
    conversation_id: conversation.id,
    status: statusAtualizado,
    ultima_mensagem: `Template: ${templateName}`,
    ultima_mensagem_em: dataCriacao,
  });

  return Response.json({ id: message.id });
}
