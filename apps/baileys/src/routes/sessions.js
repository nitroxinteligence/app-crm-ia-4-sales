import express from "express";

export const createSessionRoutes = ({
  sessions,
  createSession,
  sessionRepository,
  logger,
  backfillAvatars,
  getParticipantPhoneFromGroup,
  resolveProfileCandidates,
  requestPrivacyToken,
  ensureGroupMetadata,
}) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { integrationAccountId, workspaceId, forceNew } = req.body || {};
    if (!integrationAccountId || !workspaceId) {
      return res.status(400).send("Missing integrationAccountId or workspaceId");
    }

    const account = await sessionRepository.fetchIntegrationAccount(
      integrationAccountId
    );
    if (!account) {
      return res.status(404).send("Integration account not found");
    }

    try {
      const session = await createSession({
        integrationAccountId,
        workspaceId,
        forceNew: Boolean(forceNew),
      });

      return res.json({
        integrationAccountId,
        status: session.status,
        qrcode: session.qr,
        numero: session.numero,
        nome: session.nome,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to create session");
      return res.status(500).send("Failed to create session");
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send("Missing session id");

    const session = sessions.get(id);
    if (!session) {
      const data = await sessionRepository.fetchSessionSnapshot(id);
      if (!data) {
        return res.status(404).send("Session not found");
      }

      return res.json({
        status: data.status,
        qrcode: data.last_qr,
        numero: data.numero,
        nome: data.nome,
        connected: data.status === "conectado",
      });
    }

    return res.json({
      status: session.status,
      qrcode: session.qr,
      numero: session.numero,
      nome: session.nome,
      connected: session.status === "conectado",
    });
  });

  router.post("/:id/disconnect", async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send("Missing session id");

    const session = sessions.get(id);
    if (session?.sock) {
      session.blocked = true;
      try {
        await session.sock.logout();
      } catch (error) {
        logger.warn({ err: error }, "Failed to logout session");
      }
      sessions.delete(id);
    }

    await sessionRepository.updateSessionRow(id, { status: "desconectado" });
    await sessionRepository.updateIntegrationAccount(id, { status: "desconectado" });

    return res.json({ success: true });
  });

  router.post("/:id/backfill-avatars", async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send("Missing session id");

    let session = sessions.get(id);
    if (!session) {
      const account = await sessionRepository.fetchIntegrationAccount(id);
      if (!account) {
        return res.status(404).send("Session not found");
      }
      const workspaceId = Array.isArray(account.integrations)
        ? account.integrations[0]?.workspace_id
        : account.integrations?.workspace_id;
      if (!workspaceId) {
        return res.status(400).send("Missing workspace id");
      }
      try {
        session = await createSession({
          integrationAccountId: id,
          workspaceId,
          forceNew: false,
        });
      } catch (error) {
        logger.warn({ err: error }, "Failed to load session for backfill");
        return res.status(500).send("Failed to load session");
      }
    }

    if (!session || session.status !== "conectado") {
      return res.status(409).json({
        ok: false,
        reason: "Session not connected",
        status: session?.status ?? "desconectado",
      });
    }

    const leadLimit =
      Number.isFinite(Number(req.body?.leadLimit)) &&
      Number(req.body?.leadLimit) > 0
        ? Number(req.body.leadLimit)
        : undefined;
    const messageLimit =
      Number.isFinite(Number(req.body?.messageLimit)) &&
      Number(req.body?.messageLimit) > 0
        ? Number(req.body.messageLimit)
        : undefined;

    const result = await backfillAvatars({
      session,
      integrationAccountId: id,
      ...(leadLimit ? { leadLimit } : {}),
      ...(messageLimit ? { messageLimit } : {}),
      forceRun: req.body?.force === true,
    });

    if (!result.ok) {
      return res.status(409).json(result);
    }

    return res.json(result);
  });

  router.get("/:id/profile-picture", async (req, res) => {
    const { id } = req.params;
    const jidRaw = typeof req.query?.jid === "string" ? req.query.jid : "";
    const phoneRaw = typeof req.query?.phone === "string" ? req.query.phone : "";
    const groupRaw =
      typeof req.query?.groupJid === "string" ? req.query.groupJid : "";
    if (!id || !jidRaw) {
      return res.status(400).send("Missing session id or jid");
    }

    const session = sessions.get(id);
    if (!session || session.status !== "conectado") {
      return res.status(409).send("Session not connected");
    }

    const resolvedPhone =
      phoneRaw ||
      (groupRaw
        ? await getParticipantPhoneFromGroup({
            session,
            groupJid: groupRaw,
            participantJid: jidRaw,
          })
        : null);

    const candidates = await resolveProfileCandidates({
      remoteJid: jidRaw,
      session,
      phone: resolvedPhone || null,
    });
    if (!candidates.length) {
      return res.json({
        candidates: [],
        resolved: null,
        attempts: [],
        resolvedPhone: resolvedPhone ?? null,
      });
    }

    const attempts = [];
    let resolved = null;
    for (const candidate of candidates) {
      try {
        await requestPrivacyToken({ session, jid: candidate });
        const imageUrl = await session.sock.profilePictureUrl(
          candidate,
          "image",
          6000
        );
        attempts.push({
          candidate,
          type: "image",
          url: imageUrl ?? null,
        });
        if (imageUrl) {
          resolved = imageUrl;
          break;
        }
      } catch (error) {
        attempts.push({
          candidate,
          type: "image",
          url: null,
          error: error?.message ?? "error",
        });
      }

      try {
        await requestPrivacyToken({ session, jid: candidate });
        const previewUrl = await session.sock.profilePictureUrl(
          candidate,
          "preview",
          6000
        );
        attempts.push({
          candidate,
          type: "preview",
          url: previewUrl ?? null,
        });
        if (previewUrl) {
          resolved = previewUrl;
          break;
        }
      } catch (error) {
        attempts.push({
          candidate,
          type: "preview",
          url: null,
          error: error?.message ?? "error",
        });
      }
    }

    return res.json({
      candidates,
      resolved,
      attempts,
      resolvedPhone: resolvedPhone ?? null,
    });
  });

  router.get("/:id/group-participants", async (req, res) => {
    const { id } = req.params;
    const groupJid = typeof req.query?.jid === "string" ? req.query.jid : "";
    if (!id || !groupJid) {
      return res.status(400).send("Missing session id or group jid");
    }

    const session = sessions.get(id);
    if (!session || session.status !== "conectado") {
      return res.status(409).send("Session not connected");
    }

    const metadata = await ensureGroupMetadata({ session, groupJid, force: true });
    if (!metadata) {
      return res.status(404).json({
        error: "Group metadata not found",
        details: session.lastGroupMetaError ?? null,
      });
    }

    const participants = (metadata.participants ?? []).map((participant) => ({
      id: participant.id,
      lid: participant.lid ?? null,
      phoneNumber: participant.phoneNumber ?? null,
      admin: participant.admin ?? null,
    }));

    return res.json({
      id: metadata.id,
      subject: metadata.subject,
      addressingMode: metadata.addressingMode ?? null,
      participants,
    });
  });

  router.get("/:id/groups", async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send("Missing session id");

    const session = sessions.get(id);
    if (!session || session.status !== "conectado") {
      return res.status(409).send("Session not connected");
    }

    try {
      const groups = await session.sock.groupFetchAllParticipating();
      const list = Object.values(groups ?? {}).map((group) => ({
        id: group.id,
        subject: group.subject,
        addressingMode: group.addressingMode ?? null,
        size: group.size ?? null,
      }));
      return res.json({ total: list.length, groups: list });
    } catch (error) {
      return res.status(500).json({ error: error?.message ?? "error" });
    }
  });

  return router;
};
