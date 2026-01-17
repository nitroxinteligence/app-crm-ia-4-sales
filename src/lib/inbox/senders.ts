import { parseGraphError } from "@/lib/whatsapp/graph";

type BaileysPayload = {
  type: "text" | "image" | "audio" | "document";
  text?: string;
  mediaUrl?: string | null;
  mimeType?: string;
  fileName?: string;
};

export type BaileysSenderConfig = {
  apiUrl: string;
  apiKey?: string;
  integrationAccountId: string;
  to: string;
};

export const sendViaBaileys = async (
  config: BaileysSenderConfig,
  payload: BaileysPayload
) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["X-API-KEY"] = config.apiKey;
  }
  const response = await fetch(`${config.apiUrl}/messages/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      integrationAccountId: config.integrationAccountId,
      to: config.to,
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

type WhatsappMediaConfig = {
  destinatario: string;
  accessToken: string;
  whatsappGraphVersion: string;
  phoneNumberId: string;
};

type WhatsappMediaPayload = {
  type: "image" | "document" | "audio";
  signedUrl: string;
  caption?: string;
  fileName?: string;
};

export const sendWhatsappMedia = async (
  config: WhatsappMediaConfig,
  payload: WhatsappMediaPayload
) => {
  const messageBody: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: config.destinatario,
    type: payload.type,
  };

  if (payload.type === "image") {
    messageBody.image = {
      link: payload.signedUrl,
      caption: payload.caption,
    };
  } else if (payload.type === "document") {
    messageBody.document = {
      link: payload.signedUrl,
      filename: payload.fileName,
      caption: payload.caption,
    };
  } else {
    messageBody.audio = { link: payload.signedUrl };
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.whatsappGraphVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageBody),
    }
  );

  if (!response.ok) {
    throw new Error(await parseGraphError(response, "Falha ao enviar mensagem"));
  }

  const mediaPayload = (await response.json()) as {
    messages?: Array<{ id?: string }>;
  };
  return mediaPayload.messages?.[0]?.id ?? null;
};

type TextMessageConfig = {
  provider: "whatsapp_oficial" | "whatsapp_baileys" | "instagram";
  canal: "whatsapp" | "instagram";
  destinatario: string;
  accessToken: string;
  whatsappGraphVersion: string;
  instagramGraphVersion: string;
  phoneNumberId?: string | null;
  baileys?: BaileysSenderConfig;
};

export const sendTextMessage = async (
  config: TextMessageConfig,
  texto: string
) => {
  if (config.provider === "whatsapp_baileys") {
    if (!config.baileys) {
      throw new Error("Conta da API não oficial não encontrada.");
    }
    return sendViaBaileys(config.baileys, { type: "text", text: texto });
  }

  if (config.canal === "whatsapp") {
    if (!config.phoneNumberId) {
      throw new Error("Numero WhatsApp nao encontrado.");
    }
    const response = await fetch(
      `https://graph.facebook.com/${config.whatsappGraphVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: config.destinatario,
          type: "text",
          text: { body: texto },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        await parseGraphError(response, "Falha ao enviar mensagem")
      );
    }

    const payload = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };
    return payload.messages?.[0]?.id ?? null;
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.instagramGraphVersion}/me/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "instagram",
        recipient: { id: config.destinatario },
        message: { text: texto },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseGraphError(response, "Falha ao enviar mensagem"));
  }

  const payload = (await response.json()) as { message_id?: string };
  return payload.message_id ?? null;
};
