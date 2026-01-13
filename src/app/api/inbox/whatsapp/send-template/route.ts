import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const whatsappGraphVersion = process.env.WHATSAPP_GRAPH_VERSION ?? "v20.0";

type TemplatePayload = {
  conversationId?: string;
  templateName?: string;
  language?: string;
  variables?: string[];
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const parseGraphError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  if (!text) return `Falha ao enviar template (${response.status}).`;
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ignore
  }
  return text;
};

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

  const body = (await request.json()) as TemplatePayload;
  const conversationId = body?.conversationId?.trim();
  const templateName = body?.templateName?.trim();
  const language = body?.language?.trim() || "pt_BR";
  const variables = Array.isArray(body?.variables)
    ? body.variables.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  if (!conversationId || !templateName) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, canal, lead_id, contact_id, status, integration_account_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversation not found.", { status: 404 });
  }

  if (conversation.canal !== "whatsapp") {
    return new Response("Canal nao suportado.", { status: 422 });
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
    return new Response("Contato sem telefone.", { status: 422 });
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id, status")
    .eq("workspace_id", membership.workspace_id)
    .eq("canal", "whatsapp")
    .eq("status", "conectado")
    .maybeSingle();

  if (!integration) {
    return new Response("Integracao nao conectada.", { status: 412 });
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
    return new Response("Conta WhatsApp oficial nao encontrada.", {
      status: 412,
    });
  }

  const phoneNumberId = account?.phone_number_id ?? account?.identificador;
  if (!phoneNumberId) {
    return new Response("Numero WhatsApp nao encontrado.", { status: 412 });
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
    return new Response("Token da integracao nao encontrado.", { status: 412 });
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
    return new Response(await parseGraphError(response), {
      status: response.status,
    });
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
    return new Response(messageError?.message ?? "Failed to save message.", {
      status: 500,
    });
  }

  await userClient
    .from("conversations")
    .update({
      ultima_mensagem: `Template: ${templateName}`,
      ultima_mensagem_em: message.created_at ?? new Date().toISOString(),
      status: conversation.status === "resolvida" ? "aberta" : conversation.status,
    })
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id);

  return Response.json({ id: message.id });
}
