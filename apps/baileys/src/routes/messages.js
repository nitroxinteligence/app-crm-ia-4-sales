import express from "express";

export const createMessageRoutes = ({ sessions, normalizeJid, logger }) => {
  const router = express.Router();

  router.post("/send", async (req, res) => {
    const { integrationAccountId, to, type, text, mediaUrl, mimeType, fileName } =
      req.body || {};

    if (!integrationAccountId || !to || !type) {
      return res.status(400).send("Missing send parameters");
    }

    const session = sessions.get(integrationAccountId);
    if (!session || session.status !== "conectado") {
      return res.status(409).send("Session not connected");
    }

    const jid = normalizeJid(to);

    try {
      let response = null;

      if (type === "text") {
        response = await session.sock.sendMessage(jid, {
          text: text || "",
        });
      } else {
        if (!mediaUrl) {
          return res.status(400).send("Missing mediaUrl");
        }
        const rawMimeType = typeof mimeType === "string" ? mimeType : "";
        const baseMimeType = rawMimeType.split(";")[0]?.trim() || "";

        if (type === "image") {
          response = await session.sock.sendMessage(jid, {
            image: { url: mediaUrl },
            caption: text || undefined,
            mimetype: baseMimeType || undefined,
          });
        } else if (type === "audio") {
          const isVoiceNote =
            typeof fileName === "string" &&
            fileName.startsWith("audio-") &&
            baseMimeType === "audio/ogg";
          response = await session.sock.sendMessage(jid, {
            audio: { url: mediaUrl },
            mimetype:
              baseMimeType === "audio/ogg"
                ? "audio/ogg; codecs=opus"
                : rawMimeType || undefined,
            ptt: isVoiceNote,
          });
        } else {
          response = await session.sock.sendMessage(jid, {
            document: { url: mediaUrl },
            fileName: fileName || "arquivo",
            mimetype: baseMimeType || undefined,
            caption: text || undefined,
          });
        }
      }

      return res.json({ messageId: response?.key?.id ?? null });
    } catch (error) {
      logger.error({ err: error }, "Failed to send message");
      return res.status(500).send("Failed to send message");
    }
  });

  return router;
};
