import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildR2Key, getR2Client, resolveBucket } from "@/lib/r2/server";
import type { StatusConversa } from "@/lib/types";
import {
  badRequest,
  badGateway,
  conflict,
  gone,
  notFound,
  preconditionFailed,
  serverError,
  unsupportedMediaType,
  unauthorized,
  unprocessableEntity,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import {
  type AttachmentMeta,
  mapFileToAttachment,
  normalizeMimeType,
  sanitizarNomeArquivo,
} from "@/lib/inbox/attachments";
import type { Database } from "@/lib/inbox/database";
import {
  atualizarEnvioMensagem,
  isOutsideWhatsappWindow,
  salvarMensagem,
} from "@/lib/inbox/messages";
import {
  sendTextMessage,
  sendWhatsappMedia,
  sendViaBaileys,
  type BaileysSenderConfig,
} from "@/lib/inbox/senders";
import { emitAttachmentCreated } from "@/lib/pusher/events";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const whatsappGraphVersion = getEnv("WHATSAPP_GRAPH_VERSION", "v20.0");
const instagramGraphVersion =
  getEnv("INSTAGRAM_GRAPH_VERSION") || whatsappGraphVersion;
const baileysApiUrl = getEnv("BAILEYS_API_URL");
const baileysApiKey = getEnv("BAILEYS_API_KEY");
const jsonPayloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  clientMessageId: z.string().trim().min(1).optional(),
});

const multipartPayloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  message: z.string().trim().optional().default(""),
  clientMessageId: z.string().trim().min(1).optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  let conversationId = "";
  let message = "";
  let clientMessageId: string | null = null;
  let attachments: AttachmentMeta[] = [];

  if (isMultipart) {
    const formData = await request.formData();
    const conversationValue = formData.get("conversationId");
    const messageValue = formData.get("message");
    const parsed = multipartPayloadSchema.safeParse({
      conversationId:
        typeof conversationValue === "string" ? conversationValue : "",
      message: typeof messageValue === "string" ? messageValue : "",
      clientMessageId:
        typeof formData.get("clientMessageId") === "string"
          ? (formData.get("clientMessageId") as string)
          : undefined,
    });
    if (!parsed.success) {
      return badRequest("Payload invalido.");
    }
    conversationId = parsed.data.conversationId;
    message = parsed.data.message;
    clientMessageId = parsed.data.clientMessageId ?? null;
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);
    attachments = files
      .map((file) => mapFileToAttachment(file))
      .filter((item): item is AttachmentMeta => Boolean(item));
    if (files.length > 0 && attachments.length !== files.length) {
      return unsupportedMediaType(
        "Tipo de arquivo nao suportado. Envie imagens, audio ou documentos (pdf, csv, xlsx, txt)."
      );
    }
  } else {
    const parsed = await parseJsonBody(request, jsonPayloadSchema);
    if (!parsed.ok) {
      return badRequest("Payload invalido.");
    }
    conversationId = parsed.data.conversationId;
    message = parsed.data.message;
    clientMessageId = parsed.data.clientMessageId ?? null;
  }

  if (!conversationId || (!message && attachments.length === 0)) {
    return badRequest("Payload invalido.");
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace nao encontrado.");
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, canal, lead_id, status, integration_account_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversa nao encontrada.");
  }

  if (conversation.canal !== "whatsapp" && conversation.canal !== "instagram") {
    return unprocessableEntity("Canal nao suportado.");
  }

  if (!conversation.lead_id) {
    return notFound("Lead nao encontrado.");
  }

  const { data: lead } = await userClient
    .from("leads")
    .select("id, whatsapp_wa_id, telefone")
    .eq("id", conversation.lead_id)
    .maybeSingle();

  const destinatario = lead?.whatsapp_wa_id ?? lead?.telefone ?? null;
  if (!destinatario) {
    return unprocessableEntity("Contato sem identificador de canal.");
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id, canal, status")
    .eq("workspace_id", membership.workspace_id)
    .eq("canal", conversation.canal)
    .maybeSingle();

  if (!integration) {
    return preconditionFailed("Integracao nao conectada.");
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
    return gone("WhatsApp nao oficial desativado.");
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
      return preconditionFailed("Token da integracao nao encontrado.");
    }
  }
  const accessToken = tokenRow?.access_token ?? "";

  if (
    conversation.canal === "whatsapp" &&
    provider === "whatsapp_oficial"
  ) {
    const outsideWindow = await isOutsideWhatsappWindow(userClient, conversationId);
    if (outsideWindow) {
      return conflict("Janela de 24h expirada. Use um template aprovado no WhatsApp.");
    }
  }

  if (conversation.canal === "whatsapp" && provider === "whatsapp_baileys") {
    if (!baileysApiUrl) {
      return serverError("BAILEYS_API_URL nao configurado.");
    }
    if (integrationAccount?.status && integrationAccount.status !== "conectado") {
      return preconditionFailed("WhatsApp API não oficial desconectado.");
    }
  }

  let phoneNumberId: string | null = null;

  if (conversation.canal === "whatsapp" && provider === "whatsapp_oficial") {
    phoneNumberId =
      integrationAccount?.phone_number_id ??
      integrationAccount?.identificador ??
      null;
    if (!phoneNumberId) {
      return preconditionFailed("Numero WhatsApp nao encontrado.");
    }
  }

  const baileysConfig: BaileysSenderConfig | null =
    conversation.canal === "whatsapp" && provider === "whatsapp_baileys"
      ? integrationAccount?.id
        ? {
          apiUrl: baileysApiUrl,
          apiKey: baileysApiKey || undefined,
          integrationAccountId: integrationAccount.id,
          to: destinatario,
        }
        : null
      : null;

  const textConfig = {
    provider: provider as "whatsapp_oficial" | "whatsapp_baileys" | "instagram",
    canal: conversation.canal as "whatsapp" | "instagram",
    destinatario,
    accessToken,
    whatsappGraphVersion,
    instagramGraphVersion,
    phoneNumberId,
    baileys: baileysConfig || undefined,
  };

  if (message && attachments.length === 0) {
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
        clientMessageId,
      }
    );

    if (saved.error || !saved.data) {
      return serverError(saved.error ?? "Falha ao salvar mensagem.");
    }

    try {
      const providerMessageId = await sendTextMessage(textConfig, message);
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
      return serverError(detalhe ?? "Falha ao enviar mensagem.");
    }
  }

  const r2Client = getR2Client();
  const inboxBucket = resolveBucket("inbox-attachments");
  if (!inboxBucket) {
    return serverError("Bucket de anexos nao configurado.");
  }

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    const nomeArquivo =
      sanitizarNomeArquivo(attachment.file.name) || "arquivo";
    const legendaTexto = index === 0 ? message.trim() : "";
    const hasLegenda = Boolean(legendaTexto);
    const conteudoParaSalvar = hasLegenda ? legendaTexto : nomeArquivo;
    const storagePath = `${membership.workspace_id}/${conversation.id}/${crypto.randomUUID()
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
        conteudo: conteudoParaSalvar,
        providerMessageId: null,
        sendStatus: "sending",
        sendError: null,
        clientMessageId: clientMessageId ? `${clientMessageId}:${index}` : null,
      }
    );

    if (saved.error || !saved.data) {
      return serverError(saved.error ?? "Falha ao salvar mensagem.");
    }

    const objectKey = buildR2Key("inbox-attachments", storagePath);
    try {
      const buffer = Buffer.from(await attachment.file.arrayBuffer());
      await r2Client.send(
        new PutObjectCommand({
          Bucket: inboxBucket,
          Key: objectKey,
          Body: buffer,
          ContentType: baseMimeType,
        })
      );
    } catch (error) {
      const detalhe = error instanceof Error ? error.message : "Falha no upload.";
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: detalhe,
      });
      return serverError(detalhe);
    }

    let providerMessageId: string | null = null;

    try {
      const precisaUrl =
        conversation.canal === "whatsapp" || conversation.canal === "instagram";
      let signedUrl: string | null = null;
      if (precisaUrl) {
        signedUrl = await getSignedUrl(
          r2Client,
          new GetObjectCommand({
            Bucket: inboxBucket,
            Key: objectKey,
          }),
          { expiresIn: 60 * 60 * 24 * 7 }
        );
      }

      if (conversation.canal === "whatsapp" && provider === "whatsapp_baileys") {
        if (!signedUrl) {
          throw new Error("Falha ao gerar URL do arquivo.");
        }
        if (!baileysConfig) {
          throw new Error("Conta da API não oficial não encontrada.");
        }

        const tipoBaileys =
          hasLegenda && attachment.whatsappType === "audio"
            ? "document"
            : attachment.whatsappType === "image"
              ? "image"
              : attachment.whatsappType === "document"
                ? "document"
                : "audio";

        providerMessageId = await sendViaBaileys(baileysConfig, {
          type: tipoBaileys,
          text: tipoBaileys === "audio" ? undefined : hasLegenda ? legendaTexto : undefined,
          mediaUrl: signedUrl,
          mimeType: baileysMimeType,
          fileName: nomeArquivo,
        });
      } else if (conversation.canal === "whatsapp" && provider === "whatsapp_oficial") {
        if (!signedUrl) {
          throw new Error("Falha ao gerar URL do arquivo.");
        }

        const sendType =
          hasLegenda && attachment.whatsappType === "audio"
            ? "document"
            : attachment.whatsappType;

        if (!phoneNumberId) {
          throw new Error("Numero WhatsApp nao encontrado.");
        }

        providerMessageId = await sendWhatsappMedia(
          {
            destinatario,
            accessToken,
            whatsappGraphVersion,
            phoneNumberId,
          },
          {
            type: sendType,
            signedUrl,
            caption: hasLegenda ? legendaTexto : undefined,
            fileName: sendType === "document" ? nomeArquivo : undefined,
          }
        );
      } else if (conversation.canal === "instagram") {
        const partes = [
          hasLegenda ? legendaTexto : null,
          `Arquivo: ${nomeArquivo}`,
          signedUrl,
        ].filter(Boolean) as string[];
        providerMessageId = await sendTextMessage(textConfig, partes.join("\n"));
      }
    } catch (error) {
      const detalhe = error instanceof Error ? error.message : null;
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: detalhe ?? "Falha ao enviar anexo.",
      });
      return serverError(detalhe ?? "Falha ao enviar anexo.");
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
      return badGateway("Falha ao enviar audio via API não oficial.");
    }

    await atualizarEnvioMensagem(userClient, saved.data.id, {
      providerMessageId,
      sendStatus: "sent",
      sendError: null,
    });

    const { data: attachmentRow, error: attachmentError } = await userClient
      .from("attachments")
      .insert({
        workspace_id: membership.workspace_id,
        message_id: saved.data.id,
        storage_path: storagePath,
        tipo: attachment.tipo,
        tamanho_bytes: attachment.file.size,
      })
      .select("id")
      .single();

    if (attachmentError || !attachmentRow) {
      const erroMensagem = attachmentError?.message ?? "Falha ao salvar anexo.";
      await atualizarEnvioMensagem(userClient, saved.data.id, {
        sendStatus: "failed",
        sendError: erroMensagem,
      });
      return serverError(erroMensagem);
    }

    await emitAttachmentCreated({
      workspace_id: membership.workspace_id,
      conversation_id: conversation.id,
      message_id: saved.data.id,
      attachment: {
        id: attachmentRow.id,
        storage_path: storagePath,
        tipo: attachment.tipo,
        tamanho_bytes: attachment.file.size,
      },
    });
  }

  return Response.json({ ok: true });
}
