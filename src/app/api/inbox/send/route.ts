import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const whatsappGraphVersion = process.env.WHATSAPP_GRAPH_VERSION ?? "v20.0";
const instagramGraphVersion =
  process.env.INSTAGRAM_GRAPH_VERSION ?? whatsappGraphVersion;
const baileysApiUrl = process.env.BAILEYS_API_URL ?? "";
const baileysApiKey = process.env.BAILEYS_API_KEY ?? "";
type SendPayload = {
  conversationId?: string;
  message?: string;
};

type AttachmentKind = "imagem" | "pdf" | "audio";

type AttachmentMeta = {
  file: File;
  tipo: AttachmentKind;
  whatsappType: "image" | "document" | "audio";
  mimeType: string;
};

type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string;
          workspace_id: string;
          conversation_id: string;
          autor: "contato" | "equipe" | "agente";
          tipo: "texto" | "imagem" | "pdf" | "audio";
          conteudo: string | null;
          interno: boolean;
          whatsapp_message_id: string | null;
          send_status: string | null;
          send_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          conversation_id: string;
          autor?: "contato" | "equipe" | "agente";
          tipo?: "texto" | "imagem" | "pdf" | "audio";
          conteudo?: string | null;
          interno?: boolean;
          whatsapp_message_id?: string | null;
          send_status?: string | null;
          send_error?: string | null;
        };
        Update: {
          autor?: "contato" | "equipe" | "agente";
          tipo?: "texto" | "imagem" | "pdf" | "audio";
          conteudo?: string | null;
          interno?: boolean;
          whatsapp_message_id?: string | null;
          send_status?: string | null;
          send_error?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          workspace_id: string;
          canal: string;
          lead_id: string | null;
          integration_account_id: string | null;
          status: string;
          ultima_mensagem: string | null;
          ultima_mensagem_em: string | null;
        };
        Insert: {
          workspace_id: string;
          canal: string;
          lead_id?: string | null;
          integration_account_id?: string | null;
          status?: string;
          ultima_mensagem?: string | null;
          ultima_mensagem_em?: string | null;
        };
        Update: {
          canal?: string;
          lead_id?: string | null;
          integration_account_id?: string | null;
          status?: string;
          ultima_mensagem?: string | null;
          ultima_mensagem_em?: string | null;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          workspace_id: string;
          message_id: string;
          storage_path: string;
          tipo: string;
          tamanho_bytes: number | null;
        };
        Insert: {
          workspace_id: string;
          message_id: string;
          storage_path: string;
          tipo: string;
          tamanho_bytes?: number | null;
        };
        Update: {
          storage_path?: string;
          tipo?: string;
          tamanho_bytes?: number | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: { workspace_id: string; user_id: string; role: string };
        Insert: { workspace_id: string; user_id: string; role?: string };
        Update: { role?: string };
        Relationships: [];
      };
      leads: {
        Row: { id: string; whatsapp_wa_id: string | null; telefone: string | null };
        Insert: { id?: string; whatsapp_wa_id?: string | null; telefone?: string | null };
        Update: { whatsapp_wa_id?: string | null; telefone?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type UserClient = ReturnType<typeof createClient<Database>>;

const normalizeMimeType = (mimeType: string) =>
  mimeType.split(";")[0]?.trim() || mimeType;

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const parseGraphError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  if (!text) return `Falha ao enviar mensagem (${response.status}).`;
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    if (payload?.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ignore parse errors and fall back to raw text
  }
  return text;
};

const mapFileToAttachment = (file: File): AttachmentMeta | null => {
  const mimeType = normalizeMimeType(file.type || "");
  if (mimeType.startsWith("image/")) {
    return { file, tipo: "imagem", whatsappType: "image", mimeType };
  }
  if (
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return { file, tipo: "pdf", whatsappType: "document", mimeType };
  }
  if (mimeType.startsWith("audio/")) {
    return { file, tipo: "audio", whatsappType: "audio", mimeType };
  }
  return null;
};

const sanitizarNomeArquivo = (nome: string) =>
  nome
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const isOutsideWhatsappWindow = async (
  userClient: UserClient,
  conversationId: string
) => {
  const { data } = await userClient
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversationId)
    .eq("autor", "contato")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return false;
  const lastAt = new Date(data.created_at);
  if (Number.isNaN(lastAt.getTime())) return false;
  return Date.now() - lastAt.getTime() > 24 * 60 * 60 * 1000;
};

const salvarMensagem = async (
  userClient: UserClient,
  workspaceId: string,
  conversation: { id: string; status: string },
  payload: {
    tipo: "texto" | AttachmentKind;
    conteudo: string;
    providerMessageId?: string | null;
    sendStatus?: string | null;
    sendError?: string | null;
  }
) => {
  const baseInsert: Database["public"]["Tables"]["messages"]["Insert"] = {
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    autor: "equipe",
    tipo: payload.tipo,
    conteudo: payload.conteudo,
    whatsapp_message_id: payload.providerMessageId ?? null,
    ...(payload.sendStatus ? { send_status: payload.sendStatus } : {}),
    ...(payload.sendError ? { send_error: payload.sendError } : {}),
  };

  let insertAttempt = await userClient
    .from("messages")
    .insert(baseInsert)
    .select("id, created_at")
    .single();
  if (!insertAttempt.error) {
    const createdMessage = insertAttempt.data as { id: string; created_at: string | null } | null;
    if (!createdMessage) {
      return { error: "Falha ao salvar mensagem." };
    }

    await userClient
      .from("conversations")
      .update({
        ultima_mensagem: payload.conteudo,
        ultima_mensagem_em: createdMessage.created_at ?? new Date().toISOString(),
        status:
          conversation.status === "resolvida" ? "aberta" : conversation.status,
      })
      .eq("id", conversation.id)
      .eq("workspace_id", workspaceId);

    return { data: createdMessage };
  }

  if (
    insertAttempt.error?.message?.includes("send_status") ||
    insertAttempt.error?.message?.includes("send_error")
  ) {
    insertAttempt = await userClient
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversation.id,
        autor: "equipe",
        tipo: payload.tipo,
        conteudo: payload.conteudo,
        whatsapp_message_id: payload.providerMessageId ?? null,
      })
      .select("id, created_at")
      .single();
  }

  const createdMessage = insertAttempt.data as { id: string; created_at: string | null } | null;
  if (insertAttempt.error || !createdMessage) {
    return { error: insertAttempt.error?.message ?? "Falha ao salvar mensagem." };
  }

  await userClient
    .from("conversations")
    .update({
      ultima_mensagem: payload.conteudo,
      ultima_mensagem_em: createdMessage.created_at ?? new Date().toISOString(),
      status:
        conversation.status === "resolvida" ? "aberta" : conversation.status,
    })
    .eq("id", conversation.id)
    .eq("workspace_id", workspaceId);

  return { data: createdMessage };
};

const atualizarEnvioMensagem = async (
  userClient: UserClient,
  messageId: string,
  payload: { providerMessageId?: string | null; sendStatus?: string; sendError?: string | null }
) => {
  const updatePayload: Database["public"]["Tables"]["messages"]["Update"] = {};
  if (payload.providerMessageId !== undefined) {
    updatePayload.whatsapp_message_id = payload.providerMessageId;
  }
  if (payload.sendStatus) {
    updatePayload.send_status = payload.sendStatus;
  }
  if (payload.sendError !== undefined) {
    updatePayload.send_error = payload.sendError;
  }
  if (Object.keys(updatePayload).length === 0) return;

  const updated = await userClient.from("messages").update(updatePayload).eq("id", messageId);
  if (
    updated.error?.message?.includes("send_status") ||
    updated.error?.message?.includes("send_error")
  ) {
    const fallback: Record<string, unknown> = {};
    if (payload.providerMessageId !== undefined) {
      fallback.whatsapp_message_id = payload.providerMessageId;
    }
    if (Object.keys(fallback).length === 0) return;
    await userClient.from("messages").update(fallback).eq("id", messageId);
  }
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

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  let conversationId = "";
  let message = "";
  let attachments: AttachmentMeta[] = [];

  if (isMultipart) {
    const formData = await request.formData();
    const conversationValue = formData.get("conversationId");
    const messageValue = formData.get("message");
    conversationId =
      typeof conversationValue === "string" ? conversationValue.trim() : "";
    message = typeof messageValue === "string" ? messageValue.trim() : "";
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);
    attachments = files
      .map((file) => mapFileToAttachment(file))
      .filter((item): item is AttachmentMeta => Boolean(item));
    if (files.length > 0 && attachments.length !== files.length) {
      return new Response(
        "Tipo de arquivo nao suportado. Envie imagens, audio ou documentos (pdf, csv, xlsx, txt).",
        { status: 415 }
      );
    }
  } else {
    const body = (await request.json()) as SendPayload;
    conversationId = body?.conversationId?.trim() ?? "";
    message = body?.message?.trim() ?? "";
  }

  if (!conversationId || (!message && attachments.length === 0)) {
    return new Response("Payload invalido.", { status: 400 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace nao encontrado.", { status: 400 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, canal, lead_id, status, integration_account_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversa nao encontrada.", { status: 404 });
  }

  if (conversation.canal !== "whatsapp" && conversation.canal !== "instagram") {
    return new Response("Canal nao suportado.", { status: 422 });
  }

  if (!conversation.lead_id) {
    return new Response("Lead nao encontrado.", { status: 404 });
  }

  const { data: lead } = await userClient
    .from("leads")
    .select("id, whatsapp_wa_id, telefone")
    .eq("id", conversation.lead_id)
    .maybeSingle();

  const destinatario = lead?.whatsapp_wa_id ?? lead?.telefone ?? null;
  if (!destinatario) {
    return new Response("Contato sem identificador de canal.", { status: 422 });
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id, canal, status")
    .eq("workspace_id", membership.workspace_id)
    .eq("canal", conversation.canal)
    .maybeSingle();

  if (!integration) {
    return new Response("Integracao nao conectada.", { status: 412 });
  }

  let integrationAccount:
    | {
        id: string;
        provider: string | null;
        status: string | null;
        phone_number_id: string | null;
        identificador: string | null;
        instance_id: string | null;
      }
    | null = null;

  if (conversation.canal === "whatsapp") {
    const accountQuery = supabaseServer
      .from("integration_accounts")
      .select("id, provider, status, phone_number_id, identificador, instance_id")
      .eq("integration_id", integration.id);

    if (conversation.integration_account_id) {
      accountQuery.eq("id", conversation.integration_account_id);
    } else {
      accountQuery.eq("provider", "whatsapp_oficial");
    }

    const { data: account } = await accountQuery.maybeSingle();
    integrationAccount = account ?? null;
  }

  const provider =
    integrationAccount?.provider ??
    (conversation.canal === "whatsapp" ? "whatsapp_oficial" : "instagram");

  if (provider === "whatsapp_nao_oficial") {
    return new Response("WhatsApp nao oficial desativado.", { status: 410 });
  }

  let tokenRow: { access_token: string } | null = null;

  if (provider !== "whatsapp_baileys") {
    const tokenQuery = supabaseServer
      .from("integration_tokens")
      .select("access_token");

    if (integrationAccount?.id) {
      tokenQuery.eq("integration_account_id", integrationAccount.id);
    } else {
      tokenQuery.eq("integration_id", integration.id);
    }

    const { data } = await tokenQuery.maybeSingle();
    tokenRow = data ?? null;

    if (!tokenRow?.access_token) {
      return new Response("Token da integracao nao encontrado.", { status: 412 });
    }
  }
  const accessToken = tokenRow?.access_token ?? "";

  if (
    conversation.canal === "whatsapp" &&
    provider === "whatsapp_oficial"
  ) {
    const outsideWindow = await isOutsideWhatsappWindow(userClient, conversationId);
    if (outsideWindow) {
      return new Response(
        "Janela de 24h expirada. Use um template aprovado no WhatsApp.",
        { status: 409 }
      );
    }
  }

  if (conversation.canal === "whatsapp" && provider === "whatsapp_baileys") {
    if (!baileysApiUrl) {
      return new Response("BAILEYS_API_URL nao configurado.", { status: 500 });
    }
    if (integrationAccount?.status && integrationAccount.status !== "conectado") {
      return new Response("WhatsApp API não oficial desconectado.", {
        status: 412,
      });
    }
  }

  let phoneNumberId: string | null = null;

  if (conversation.canal === "whatsapp" && provider === "whatsapp_oficial") {
    phoneNumberId =
      integrationAccount?.phone_number_id ??
      integrationAccount?.identificador ??
      null;
    if (!phoneNumberId) {
      return new Response("Numero WhatsApp nao encontrado.", { status: 412 });
    }
  }

  const enviarViaBaileys = async (payload: {
    type: "text" | "image" | "audio" | "document";
    text?: string;
    mediaUrl?: string | null;
    mimeType?: string;
    fileName?: string;
  }) => {
    if (!integrationAccount?.id) {
      throw new Error("Conta da API não oficial não encontrada.");
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (baileysApiKey) {
      headers["X-API-KEY"] = baileysApiKey;
    }
    const response = await fetch(`${baileysApiUrl}/messages/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        integrationAccountId: integrationAccount.id,
        to: destinatario,
        type: payload.type,
        text: payload.text ?? null,
        mediaUrl: payload.mediaUrl ?? null,
        mimeType: payload.mimeType ?? null,
        fileName: payload.fileName ?? null,
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => "");
      throw new Error(detalhe || "Falha ao enviar via API não oficial.");
    }

    const data = (await response.json()) as { messageId?: string | null };
    return data.messageId ?? null;
  };

  const enviarTexto = async (texto: string) => {
    if (conversation.canal === "whatsapp" && provider === "whatsapp_baileys") {
      return enviarViaBaileys({ type: "text", text: texto });
    }

    if (conversation.canal === "whatsapp") {
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
            type: "text",
            text: { body: texto },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await parseGraphError(response));
      }

      const payload = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      return payload.messages?.[0]?.id ?? null;
    }

    const response = await fetch(
      `https://graph.facebook.com/${instagramGraphVersion}/me/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "instagram",
          recipient: { id: destinatario },
          message: { text: texto },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await parseGraphError(response));
    }

    const payload = (await response.json()) as { message_id?: string };
    return payload.message_id ?? null;
  };

  if (message) {
    const saved = await salvarMensagem(
      userClient,
      membership.workspace_id,
      conversation,
      {
        tipo: "texto",
        conteudo: message,
        providerMessageId: null,
        sendStatus: "sending",
        sendError: null,
      }
    );

    if (saved.error || !saved.data) {
      return new Response(saved.error ?? "Falha ao salvar mensagem.", {
        status: 500,
      });
    }

    try {
      const providerMessageId = await enviarTexto(message);
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        providerMessageId,
        sendStatus: "sent",
        sendError: null,
      });
    } catch (error) {
      const detalhe = error instanceof Error ? error.message : null;
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: detalhe ?? "Falha ao enviar mensagem.",
      });
      return new Response(detalhe ?? "Falha ao enviar mensagem.", {
        status: 500,
      });
    }
  }

  for (const attachment of attachments) {
    const nomeArquivo =
      sanitizarNomeArquivo(attachment.file.name) || "arquivo";
    const storagePath = `${membership.workspace_id}/${conversation.id}/${
      crypto.randomUUID()
    }-${nomeArquivo}`;
    const baseMimeType = normalizeMimeType(attachment.mimeType);
    const baileysMimeType =
      attachment.tipo === "audio"
        ? baseMimeType === "audio/ogg"
          ? "audio/ogg; codecs=opus"
          : baseMimeType
        : baseMimeType;

    const saved = await salvarMensagem(
      userClient,
      membership.workspace_id,
      conversation,
      {
        tipo: attachment.tipo,
        conteudo: nomeArquivo,
        providerMessageId: null,
        sendStatus: "sending",
        sendError: null,
      }
    );

    if (saved.error || !saved.data) {
      return new Response(saved.error ?? "Falha ao salvar mensagem.", {
        status: 500,
      });
    }

    const { error: uploadError } = await userClient.storage
      .from("inbox-attachments")
      .upload(storagePath, attachment.file, {
        contentType: baseMimeType,
        upsert: false,
    });

    if (uploadError) {
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: uploadError.message,
      });
      return new Response(uploadError.message, { status: 500 });
    }

    let providerMessageId: string | null = null;

    try {
      if (conversation.canal === "whatsapp" && provider === "whatsapp_baileys") {
        const { data: signed } = await userClient.storage
          .from("inbox-attachments")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

        if (!signed?.signedUrl) {
          throw new Error("Falha ao gerar URL do arquivo.");
        }

        const tipoBaileys =
          attachment.whatsappType === "image"
            ? "image"
            : attachment.whatsappType === "document"
              ? "document"
              : "audio";

        providerMessageId = await enviarViaBaileys({
          type: tipoBaileys,
          text: tipoBaileys === "audio" ? undefined : nomeArquivo,
          mediaUrl: signed.signedUrl,
          mimeType: baileysMimeType,
          fileName: nomeArquivo,
        });
      } else if (conversation.canal === "whatsapp" && provider === "whatsapp_oficial") {
        const mediaForm = new FormData();
        mediaForm.append("messaging_product", "whatsapp");
        mediaForm.append("file", attachment.file, nomeArquivo);
        mediaForm.append("type", baseMimeType);

        const uploadResponse = await fetch(
          `https://graph.facebook.com/${whatsappGraphVersion}/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: mediaForm,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(await parseGraphError(uploadResponse));
        }

        const uploadPayload = (await uploadResponse.json()) as {
          id?: string;
        };
        const mediaId = uploadPayload.id;
        if (!mediaId) {
          throw new Error("Falha ao enviar midia.");
        }

        const messageBody: Record<string, unknown> = {
          messaging_product: "whatsapp",
          to: destinatario,
          type: attachment.whatsappType,
        };

        if (attachment.whatsappType === "image") {
          messageBody.image = { id: mediaId };
        } else if (attachment.whatsappType === "document") {
          messageBody.document = { id: mediaId, filename: nomeArquivo };
        } else {
          messageBody.audio = { id: mediaId };
        }

        const mediaResponse = await fetch(
          `https://graph.facebook.com/${whatsappGraphVersion}/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messageBody),
          }
        );

        if (!mediaResponse.ok) {
          throw new Error(await parseGraphError(mediaResponse));
        }

        const mediaPayload = (await mediaResponse.json()) as {
          messages?: Array<{ id?: string }>;
        };
        providerMessageId = mediaPayload.messages?.[0]?.id ?? null;
      } else if (conversation.canal === "instagram") {
        const { data: signed } = await userClient.storage
          .from("inbox-attachments")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        const texto = signed?.signedUrl
          ? `Arquivo: ${nomeArquivo}\n${signed.signedUrl}`
          : `Arquivo: ${nomeArquivo}`;
        providerMessageId = await enviarTexto(texto);
      }
    } catch (error) {
      const detalhe = error instanceof Error ? error.message : null;
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: detalhe ?? "Falha ao enviar anexo.",
      });
      return new Response(detalhe ?? "Falha ao enviar anexo.", { status: 500 });
    }

    if (
      conversation.canal === "whatsapp" &&
      provider === "whatsapp_baileys" &&
      attachment.tipo === "audio" &&
      !providerMessageId
    ) {
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: "Falha ao enviar audio via API não oficial.",
      });
      return new Response("Falha ao enviar audio via API não oficial.", {
        status: 502,
      });
    }

    await atualizarEnvioMensagem(userClient, saved.data.id, {
      providerMessageId,
      sendStatus: "sent",
      sendError: null,
    });

    const { error: attachmentError } = await userClient
      .from("attachments")
      .insert({
        workspace_id: membership.workspace_id,
        message_id: saved.data.id,
        storage_path: storagePath,
        tipo: attachment.tipo,
        tamanho_bytes: attachment.file.size,
      });

    if (attachmentError) {
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: attachmentError.message,
      });
      return new Response(attachmentError.message, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
