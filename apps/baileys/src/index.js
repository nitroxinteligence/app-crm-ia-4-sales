import "dotenv/config";
import crypto from "crypto";
import express from "express";
import QRCode from "qrcode";
import P from "pino";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  BufferJSON,
  Browsers,
  DisconnectReason,
  addTransactionCapability,
  downloadMediaMessage,
  extractMessageContent,
  fetchLatestBaileysVersion,
  initAuthCreds,
  isJidStatusBroadcast,
  isLidUser,
  isPnUser,
  jidNormalizedUser,
  makeWASocket,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import { createRetryQueue } from "./retry-queue.js";
import { createRealtime } from "./realtime.js";
import { createSessionRepository } from "./session-repository.js";
import { createSessionRoutes } from "./routes/sessions.js";
import { bootstrapSessions } from "./session-bootstrap.js";
import { createMessageRoutes } from "./routes/messages.js";
import { validateEnv } from "./validate-env.js";
import {
  badSessionState,
  clearRestartState,
  restartState,
  sessions,
} from "./session-state.js";
import {
  AGENTS_API_KEY,
  AGENTS_API_URL,
  API_KEY,
  BAILEYS_BAD_SESSION_THRESHOLD,
  BAILEYS_BAD_SESSION_WINDOW_MS,
  BAILEYS_CONNECT_TIMEOUT_MS,
  BAILEYS_DEFAULT_QUERY_TIMEOUT_MS,
  BAILEYS_KEEP_ALIVE_MS,
  BAILEYS_RESTART_BACKOFF_MS,
  BAILEYS_RESTART_MAX_ATTEMPTS,
  BAILEYS_RESTART_MAX_BACKOFF_MS,
  BAILEYS_RETRY_QUEUE_COOLDOWN_MS,
  BAILEYS_RETRY_QUEUE_ENABLED,
  BAILEYS_RETRY_QUEUE_FLUSH_INTERVAL_MS,
  BAILEYS_RETRY_QUEUE_MAX,
  BAILEYS_RETRY_QUEUE_PATH,
  BAILEYS_RETRY_REQUEST_DELAY_MS,
  BAILEYS_SYNC_FULL_HISTORY,
  PORT,
  PUSHER_APP_ID,
  PUSHER_CLUSTER,
  PUSHER_KEY,
  PUSHER_SECRET,
  R2_ACCESS_KEY_ID,
  R2_BUCKET_INBOX_ATTACHMENTS,
  R2_ENDPOINT,
  R2_SECRET_ACCESS_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./config.js";

const logger = P({ level: process.env.LOG_LEVEL ?? "info" });

validateEnv({ logger });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const buildR2Key = (prefix, key) => {
  const cleanKey = `${key}`.replace(/^\/+/, "");
  if (cleanKey.startsWith(`${prefix}/`)) {
    return cleanKey;
  }
  return `${prefix}/${cleanKey}`;
};

const SESSION_TABLE = "whatsapp_baileys_sessions";
const DAYS_HISTORY = 14;

const sessionRepository = createSessionRepository({
  supabase,
  sessionTable: SESSION_TABLE,
  logger,
});

const realtime = createRealtime({
  logger,
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
});

const isPusherEnabled = Boolean(
  PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
);
logger.info(
  { pusherEnabled: isPusherEnabled },
  "Baileys realtime configuration"
);

const resolveErrorMessage = (error) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  return String(error);
};

const isTransientDbError = (error) => {
  if (!error) return false;
  const cause = error?.cause;
  const message = resolveErrorMessage(error).toLowerCase();
  const causeMessage = resolveErrorMessage(cause).toLowerCase();
  const combinedMessage = `${message} ${causeMessage}`;
  const code = error?.code || cause?.code;
  const status = error?.status || cause?.status;

  if (typeof status === "number" && status >= 500) return true;
  if (
    typeof code === "string" &&
    [
      "ENOTFOUND",
      "EAI_AGAIN",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ECONNRESET",
      "UND_ERR_CONNECT_TIMEOUT",
    ].includes(code)
  ) {
    return true;
  }
  return [
    "enotfound",
    "eai_again",
    "econnrefused",
    "etimedout",
    "econnreset",
    "fetch failed",
    "network",
    "timeout",
    "socket hang up",
    "tls",
  ].some((token) => combinedMessage.includes(token));
};

const buildSupabaseError = (error, label) => {
  const detail =
    error && typeof error.message === "string" ? `: ${error.message}` : "";
  const err = new Error(`${label}${detail}`);
  err.cause = error;
  return err;
};

const throwIfSupabaseError = (error, label) => {
  if (error) {
    throw buildSupabaseError(error, label);
  }
};

let processMessage;
const retryQueue = createRetryQueue({
  enabled: BAILEYS_RETRY_QUEUE_ENABLED,
  maxSize: BAILEYS_RETRY_QUEUE_MAX,
  queuePath: BAILEYS_RETRY_QUEUE_PATH,
  flushIntervalMs: BAILEYS_RETRY_QUEUE_FLUSH_INTERVAL_MS,
  cooldownMs: BAILEYS_RETRY_QUEUE_COOLDOWN_MS,
  logger,
  bufferJSON: BufferJSON,
  processMessage: (...args) => processMessage(...args),
  getSession: (integrationAccountId) => sessions.get(integrationAccountId),
  buildChatMap: (...args) => buildChatMap(...args),
  isTransientDbError,
});

const scheduleRestart = ({
  integrationAccountId,
  workspaceId,
  forceNew,
  delayOverrideMs,
  errorLabel,
}) => {
  const current = restartState.get(integrationAccountId);
  if (current?.timer) return;
  const attempts = (current?.attempts ?? 0) + 1;
  if (attempts > BAILEYS_RESTART_MAX_ATTEMPTS) {
    logger.warn(
      { integrationAccountId, attempts },
      "Muitas tentativas de reconexao; aguardando acao manual"
    );
    clearRestartState(integrationAccountId);
    void sessionRepository.updateSessionRow(integrationAccountId, {
      status: "desconectado",
      last_qr: null,
    });
    void sessionRepository.updateIntegrationAccount(integrationAccountId, {
      status: "desconectado",
      sync_last_error: errorLabel || "Baileys: excesso de tentativas",
    });
    return;
  }
  const delay =
    typeof delayOverrideMs === "number"
      ? delayOverrideMs
      : Math.min(
          BAILEYS_RESTART_BACKOFF_MS * 2 ** (attempts - 1),
          BAILEYS_RESTART_MAX_BACKOFF_MS
        );
  const timer = setTimeout(async () => {
    clearRestartState(integrationAccountId);
    if (sessions.has(integrationAccountId)) return;
    try {
      await createSession({
        integrationAccountId,
        workspaceId,
        forceNew,
      });
    } catch (error) {
      logger.warn({ err: error }, "Falha ao reiniciar sessao");
    }
  }, delay);
  restartState.set(integrationAccountId, {
    attempts,
    firstAt: current?.firstAt ?? Date.now(),
    timer,
  });
};

const registerBadSession = (integrationAccountId) => {
  const now = Date.now();
  const current = badSessionState.get(integrationAccountId);
  if (!current || now - current.firstAt > BAILEYS_BAD_SESSION_WINDOW_MS) {
    badSessionState.set(integrationAccountId, { count: 1, firstAt: now });
    return false;
  }
  const count = current.count + 1;
  badSessionState.set(integrationAccountId, {
    count,
    firstAt: current.firstAt,
  });
  return count >= BAILEYS_BAD_SESSION_THRESHOLD;
};

const clearBadSession = (integrationAccountId) => {
  badSessionState.delete(integrationAccountId);
};

const notifyAgents = async ({
  workspaceId,
  integrationAccountId,
  conversationId,
  messageRowId,
  messageExternalId,
  text,
  isGroup,
}) => {
  if (!AGENTS_API_URL) return;
  try {
    const headers = { "Content-Type": "application/json" };
    if (AGENTS_API_KEY) {
      headers["X-Agents-Key"] = AGENTS_API_KEY;
    }
    const response = await fetch(`${AGENTS_API_URL.replace(/\/$/, "")}/integrations/whatsapp-baileys/notify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspace_id: workspaceId,
        integration_account_id: integrationAccountId,
        conversation_id: conversationId,
        message_row_id: messageRowId ?? null,
        message_external_id: messageExternalId ?? null,
        text: text ?? null,
        is_group: Boolean(isGroup),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.warn(
        {
          status: response.status,
          workspaceId,
          integrationAccountId,
          conversationId,
          detail: detail?.slice(0, 300),
        },
        "Agents notify request failed"
      );
    } else {
      logger.info(
        {
          workspaceId,
          integrationAccountId,
          conversationId,
          isGroup: Boolean(isGroup),
          textChars: (text ?? "").length,
        },
        "Agents notified"
      );
    }
  } catch (error) {
    logger.warn({ err: error }, "Failed to notify agents");
  }
};

const requireApiKey = (req, res, next) => {
  if (!API_KEY) return next();
  const header = req.header("x-api-key");
  if (header !== API_KEY) {
    return res.status(401).send("Unauthorized");
  }
  return next();
};

const sanitizeFilename = (name) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const inferExtension = (mimeType) => {
  if (!mimeType) return "";
  if (mimeType.includes("/")) {
    const base = mimeType.split(";")[0];
    const ext = base.split("/")[1];
    if (ext) return `.${ext}`;
  }
  return "";
};

const isGroupJid = (jid) => jid?.endsWith("@g.us");

const normalizeJid = (value) => {
  if (!value) return "";
  if (value.includes("@")) return value;
  const digits = value.replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : value;
};

const resolvePnFromLid = async ({ session, lid }) => {
  if (!lid || !session?.sock?.signalRepository?.lidMapping?.getPNForLID) {
    return null;
  }
  try {
    const mapped = await session.sock.signalRepository.lidMapping.getPNForLID(lid);
    if (!mapped) return null;
    return jidNormalizedUser(mapped);
  } catch (error) {
    logger.warn({ err: error }, "Failed to resolve LID to PN for lead/name");
    return null;
  }
};

const resolveLidFromPn = async ({ session, pn }) => {
  if (!pn || !session?.sock?.signalRepository?.lidMapping?.getLIDForPN) {
    return null;
  }
  try {
    const mapped = await session.sock.signalRepository.lidMapping.getLIDForPN(pn);
    if (!mapped) return null;
    return jidNormalizedUser(mapped);
  } catch (error) {
    logger.warn({ err: error }, "Failed to resolve PN to LID for lead/name");
    return null;
  }
};

const normalizeContactId = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    return jidNormalizedUser(trimmed) || trimmed;
  }
  const jid = normalizeJid(trimmed);
  return jid ? jidNormalizedUser(jid) || jid : trimmed;
};

const resolveContactName = (contact) => {
  const name =
    (typeof contact?.name === "string" && contact.name) ||
    (typeof contact?.notify === "string" && contact.notify) ||
    (typeof contact?.verifiedName === "string" && contact.verifiedName) ||
    (typeof contact?.pushName === "string" && contact.pushName) ||
    (typeof contact?.short === "string" && contact.short) ||
    null;
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed.length ? trimmed : null;
};

const resolveSelfNameFromUser = (user) => {
  const candidate =
    (typeof user?.name === "string" && user.name) ||
    (typeof user?.verifiedName === "string" && user.verifiedName) ||
    (typeof user?.notify === "string" && user.notify) ||
    null;
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return trimmed.length ? trimmed : null;
};

const collectContactIds = (contact) => {
  const ids = new Set();
  const candidates = [
    contact?.id,
    contact?.jid,
    contact?.lid,
    contact?.phoneNumber,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeContactId(candidate);
    if (!normalized) continue;
    ids.add(normalized);
    if (isPnUser(normalized)) {
      const digits = normalized.split("@")[0];
      if (digits) ids.add(digits);
    }
  }
  return Array.from(ids);
};

const isSelfContactId = async ({ session, id }) => {
  if (!session?.numero || !id) return false;
  const self = jidNormalizedUser(session.numero) || session.numero;
  const normalized = jidNormalizedUser(id) || id;
  if (normalized === self) return true;
  const selfDigits = extractPhoneCandidate(self);
  const idDigits = extractPhoneCandidate(normalized);
  if (selfDigits && idDigits && selfDigits === idDigits) return true;
  if (isLidUser(normalized)) {
    const pnJid = await resolvePnFromLid({ session, lid: normalized });
    if (pnJid) {
      const pnNormalized = jidNormalizedUser(pnJid) || pnJid;
      if (pnNormalized === self) return true;
      const pnDigits = extractPhoneCandidate(pnNormalized);
      if (selfDigits && pnDigits && selfDigits === pnDigits) return true;
    }
  }
  if (isPnUser(normalized)) {
    const lidJid = await resolveLidFromPn({ session, pn: normalized });
    if (lidJid) {
      const lidNormalized = jidNormalizedUser(lidJid) || lidJid;
      if (lidNormalized === self) return true;
    }
  }
  return false;
};

const syncSelfProfile = async ({ session, name, avatarUrl }) => {
  if (!session?.integrationAccountId) return;
  const payload = {};
  if (name) {
    payload.nome = name;
    session.nome = name;
  }
  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
    session.selfAvatarUrl = avatarUrl;
  }
  if (Object.keys(payload).length > 0) {
    await sessionRepository.updateIntegrationAccount(session.integrationAccountId, payload);
  }
};

const syncSelfProfileFromContact = async ({ session, contact }) => {
  if (!session?.numero || !contact) return;
  const ids = collectContactIds(contact);
  if (!ids.length) return;
  let match = false;
  for (const id of ids) {
    if (await isSelfContactId({ session, id })) {
      match = true;
      break;
    }
  }
  if (!match) return;
  const name = resolveContactName(contact) ?? null;
  const rawAvatar =
    contact?.imgUrl ||
    contact?.profilePicUrl ||
    contact?.profilePic ||
    null;
  let avatar = rawAvatar === "changed" ? null : rawAvatar;
  if (!avatar) {
    avatar = await resolveAvatarUrl({
      remoteJid: session.numero,
      session,
      chatMeta: session.contactMap?.get(session.numero),
      force: true,
    });
  }
  await syncSelfProfile({ session, name, avatarUrl: avatar });
};

const extractPhoneCandidate = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.includes("@")) {
    if (!isPnUser(value)) return null;
    const digits = value.split("@")[0];
    return digits || null;
  }
  const digits = value.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  return digits;
};

const expandContactIds = async ({ session, contact }) => {
  const baseIds = collectContactIds(contact);
  const ids = new Set(baseIds);
  for (const id of baseIds) {
    if (isLidUser(id)) {
      const pnJid = await resolvePnFromLid({ session, lid: id });
      if (pnJid) {
        ids.add(pnJid);
        const digits = extractPhoneCandidate(pnJid);
        if (digits) ids.add(digits);
      }
    }
    if (isPnUser(id)) {
      const lidJid = await resolveLidFromPn({ session, pn: id });
      if (lidJid) ids.add(lidJid);
      const digits = extractPhoneCandidate(id);
      if (digits) ids.add(digits);
    }
  }

  const phones = new Set();
  for (const id of ids) {
    const digits = extractPhoneCandidate(id);
    if (digits) phones.add(digits);
  }

  return { ids: Array.from(ids), phones: Array.from(phones) };
};

const normalizeLeadIdentity = async ({ remoteJid, session }) => {
  const normalized = jidNormalizedUser(remoteJid);
  if (!normalized) {
    return { waId: remoteJid, phone: null };
  }

  if (isGroupJid(normalized)) {
    return { waId: normalized, phone: normalized };
  }

  let waId = normalized;
  let phone = normalized.split("@")[0] ?? null;

  if (isLidUser(normalized)) {
    const pnJid = await resolvePnFromLid({ session, lid: normalized });
    if (pnJid) {
      waId = pnJid;
      phone = pnJid.split("@")[0] ?? phone;
    }
  }

  return { waId, phone };
};

const resolveProfileCandidates = async ({
  remoteJid,
  session,
  phone,
}) => {
  if (!remoteJid) return [];
  const normalized = jidNormalizedUser(remoteJid);
  if (!normalized || isJidStatusBroadcast(normalized)) return [];
  const candidates = new Set();

  if (isLidUser(normalized)) {
    try {
      const mapped =
        await session?.sock?.signalRepository?.lidMapping?.getPNForLID(
          normalized
        );
      if (mapped) {
        candidates.add(jidNormalizedUser(mapped));
      }
    } catch (error) {
      logger.warn({ err: error }, "Failed to resolve LID to PN");
    }
    candidates.add(normalized);
  } else {
    candidates.add(normalized);
  }

  if (phone) {
    const pnJid = normalizeJid(phone);
    if (pnJid) {
      candidates.add(jidNormalizedUser(pnJid));
    }
  }

  return Array.from(candidates);
};

const requestPrivacyToken = async ({ session, jid }) => {
  if (!jid || !session?.sock?.getPrivacyTokens) return;
  try {
    await session.sock.getPrivacyTokens([jid]);
  } catch (error) {
    logger.debug({ err: error, jid }, "Failed to request privacy token");
  }
};

const cacheGroupParticipants = ({ session, metadata }) => {
  if (!metadata?.participants || !session) return;
  if (!session.participantPhoneMap) {
    session.participantPhoneMap = new Map();
  }
  for (const participant of metadata.participants) {
    const participantId = participant?.id || participant?.jid;
    const lid =
      participant?.lid && isLidUser(participant.lid)
        ? participant.lid
        : isLidUser(participantId)
          ? participantId
          : null;
    const pn =
      participant?.phoneNumber && isPnUser(participant.phoneNumber)
        ? participant.phoneNumber
        : isPnUser(participantId)
          ? participantId
          : null;
    if (lid && pn) {
      session.participantPhoneMap.set(lid, pn);
    }
  }
};

const ensureGroupMetadata = async ({ session, groupJid, force = false }) => {
  if (!session?.sock?.groupMetadata || !groupJid) return null;
  if (!session.groupMetaCache) {
    session.groupMetaCache = new Map();
  }
  const cached = session.groupMetaCache.get(groupJid);
  const now = Date.now();
  if (!force && cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return cached.metadata;
  }
  try {
    const metadata = await session.sock.groupMetadata(groupJid);
    session.groupMetaCache.set(groupJid, { metadata, fetchedAt: now });
    cacheGroupParticipants({ session, metadata });
    return metadata;
  } catch (error) {
    session.lastGroupMetaError = {
      groupJid,
      message: error?.message ?? "error",
    };
    logger.warn({ err: error }, "Failed to fetch group metadata");
    return null;
  }
};

const getParticipantPhoneFromGroup = async ({
  session,
  groupJid,
  participantJid,
}) => {
  if (!session || !groupJid || !participantJid) return null;
  await ensureGroupMetadata({ session, groupJid });
  return session.participantPhoneMap?.get(participantJid) ?? null;
};

const getTimestampMs = (message) => {
  const raw = message?.messageTimestamp || message?.timestamp;
  if (!raw) return Date.now();
  const value = Number(raw);
  if (Number.isNaN(value)) return Date.now();
  return value > 1_000_000_000_000 ? value : value * 1000;
};

const serializeAuth = (state) =>
  JSON.parse(JSON.stringify(state, BufferJSON.replacer));

const deserializeAuth = (state) =>
  JSON.parse(JSON.stringify(state), BufferJSON.reviver);

const uploadAttachment = async ({
  buffer,
  workspaceId,
  conversationId,
  filename,
  contentType,
}) => {
  const fileExt = inferExtension(contentType) || "";
  const safeName = sanitizeFilename(filename || "arquivo");
  const storagePath = `${workspaceId}/${conversationId}/${crypto.randomUUID()}-${safeName}${
    safeName.endsWith(fileExt) ? "" : fileExt
  }`;

  try {
    const objectKey = buildR2Key("inbox-attachments", storagePath);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_INBOX_ATTACHMENTS,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      })
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha ao subir arquivo";
    throw new Error(detail);
  }

  return storagePath;
};

const upsertLead = async ({
  workspaceId,
  waId,
  name,
  phone,
  avatarUrl,
}) => {
  const payload = {
    workspace_id: workspaceId,
    whatsapp_wa_id: waId,
    telefone: phone || null,
    canal_origem: "whatsapp",
    status: "novo",
  };
  if (name && name.trim()) {
    payload.nome = name.trim();
  }
  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
  }

  const { data, error } = await supabase
    .from("leads")
    .upsert(payload, { onConflict: "workspace_id,whatsapp_wa_id" })
    .select("id")
    .maybeSingle();
  throwIfSupabaseError(error, "Falha ao salvar lead");

  if (!data?.id) {
    throw new Error("Failed to upsert lead");
  }

  return data.id;
};

const upsertConversation = async ({
  workspaceId,
  leadId,
  integrationAccountId,
  lastMessage,
  lastAt,
}) => {
  const payload = {
    workspace_id: workspaceId,
    lead_id: leadId,
    integration_account_id: integrationAccountId,
    canal: "whatsapp",
    status: "aberta",
    ultima_mensagem: lastMessage,
    ultima_mensagem_em: lastAt,
  };

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("canal", "whatsapp")
    .order("ultima_mensagem_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfSupabaseError(existingError, "Falha ao consultar conversa");

  if (existing?.id) {
    const { data, error } = await supabase
      .from("conversations")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
    throwIfSupabaseError(error, "Falha ao atualizar conversa");

    if (!data?.id) {
      throw new Error("Failed to update conversation");
    }

    return { id: data.id, isNew: false };
  }

  const { data: inserted, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("id")
    .maybeSingle();
  throwIfSupabaseError(error, "Falha ao criar conversa");

  if (!inserted?.id) {
    throw new Error("Failed to insert conversation");
  }

  return { id: inserted.id, isNew: true };
};

const upsertMessage = async ({
  workspaceId,
  conversationId,
  messageId,
  author,
  messageType,
  content,
  createdAt,
  senderId,
  senderName,
  senderAvatarUrl,
  quotedMessageId,
  quotedContent,
  quotedType,
  quotedAuthor,
  quotedSenderId,
  quotedSenderName,
}) => {
  let authorToSave = author;
  let isNew = true;
  if (messageId) {
    const existing = await supabase
      .from("messages")
      .select("id, autor")
      .eq("workspace_id", workspaceId)
      .eq("whatsapp_message_id", messageId)
      .maybeSingle();
    throwIfSupabaseError(existing.error, "Falha ao verificar mensagem");
    if (existing.data?.id) {
      isNew = false;
    }
    const existingAuthor = existing.data?.autor ?? null;
    if (existingAuthor === "agente") {
      authorToSave = "agente";
    }
  }
  const payload = {
    workspace_id: workspaceId,
    conversation_id: conversationId,
    whatsapp_message_id: messageId,
    autor: authorToSave,
    tipo: messageType,
    conteudo: content,
    created_at: createdAt,
    sender_id: senderId || null,
    sender_nome: senderName || null,
    sender_avatar_url: senderAvatarUrl || null,
    quoted_message_id: quotedMessageId || null,
    quoted_conteudo: quotedContent || null,
    quoted_tipo: quotedType || null,
    quoted_autor: quotedAuthor || null,
    quoted_sender_id: quotedSenderId || null,
    quoted_sender_nome: quotedSenderName || null,
  };

  const { error: upsertError } = await supabase
    .from("messages")
    .upsert(payload, { onConflict: "workspace_id,whatsapp_message_id" });
  throwIfSupabaseError(upsertError, "Falha ao salvar mensagem");

  const { data, error: selectError } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("whatsapp_message_id", messageId)
    .maybeSingle();
  throwIfSupabaseError(selectError, "Falha ao buscar id da mensagem");

  return {
    id: data?.id ?? null,
    isNew,
  };
};

const insertAttachment = async ({
  workspaceId,
  messageId,
  storagePath,
  tipo,
  tamanhoBytes,
}) => {
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      workspace_id: workspaceId,
      message_id: messageId,
      storage_path: storagePath,
      tipo,
      tamanho_bytes: tamanhoBytes ?? null,
    })
    .select("id")
    .maybeSingle();
  throwIfSupabaseError(error, "Falha ao salvar anexo");
  return data?.id ?? null;
};

const unwrapContent = (container) => {
  if (!container) return { content: null, viewOnce: false };
  let current = container;
  let viewOnce = false;
  for (let i = 0; i < 5; i += 1) {
    const wrapper =
      current?.ephemeralMessage ||
      current?.viewOnceMessage ||
      current?.documentWithCaptionMessage ||
      current?.viewOnceMessageV2 ||
      current?.viewOnceMessageV2Extension ||
      current?.editedMessage;
    if (!wrapper?.message) break;
    if (
      current?.viewOnceMessage ||
      current?.viewOnceMessageV2 ||
      current?.viewOnceMessageV2Extension
    ) {
      viewOnce = true;
    }
    current = wrapper.message;
  }
  const extracted = extractMessageContent
    ? extractMessageContent(current)
    : current;
  return { content: extracted ?? current, viewOnce };
};

const unwrapMessage = (message) => {
  if (!message?.message) return { content: null, viewOnce: false };
  return unwrapContent(message.message);
};

const getContextInfo = (content) =>
  content?.extendedTextMessage?.contextInfo ||
  content?.imageMessage?.contextInfo ||
  content?.videoMessage?.contextInfo ||
  content?.audioMessage?.contextInfo ||
  content?.documentMessage?.contextInfo ||
  content?.stickerMessage?.contextInfo ||
  content?.buttonsMessage?.contextInfo ||
  content?.listResponseMessage?.contextInfo ||
  content?.buttonsResponseMessage?.contextInfo ||
  content?.templateButtonReplyMessage?.contextInfo ||
  content?.messageContextInfo ||
  null;

const extractPayloadFromContent = (content) => {
  if (!content) {
    return { tipo: "texto", texto: "Mensagem recebida", media: null };
  }

  if (content.conversation) {
    return { tipo: "texto", texto: content.conversation, media: null };
  }

  if (content.extendedTextMessage?.text) {
    return { tipo: "texto", texto: content.extendedTextMessage.text, media: null };
  }

  if (content.imageMessage) {
    return {
      tipo: "imagem",
      texto: content.imageMessage.caption || "Midia recebida",
      media: {
        type: "image",
        mimetype: content.imageMessage.mimetype,
        fileName: content.imageMessage.fileName || "imagem",
      },
    };
  }

  if (content.videoMessage) {
    return {
      tipo: "imagem",
      texto: content.videoMessage.caption || "Video recebido",
      media: {
        type: "video",
        mimetype: content.videoMessage.mimetype,
        fileName: content.videoMessage.fileName || "video",
      },
    };
  }

  if (content.documentMessage) {
    return {
      tipo: "pdf",
      texto: content.documentMessage.fileName || "Documento recebido",
      media: {
        type: "document",
        mimetype: content.documentMessage.mimetype,
        fileName: content.documentMessage.fileName || "documento",
      },
    };
  }

  if (content.audioMessage) {
    return {
      tipo: "audio",
      texto: "Mensagem de audio",
      media: {
        type: "audio",
        mimetype: content.audioMessage.mimetype,
        fileName: "audio",
      },
    };
  }

  if (content.stickerMessage) {
    return {
      tipo: "imagem",
      texto: "Sticker",
      media: {
        type: "sticker",
        mimetype: content.stickerMessage.mimetype,
        fileName: "sticker",
      },
    };
  }

  return { tipo: "texto", texto: "Mensagem recebida", media: null };
};

const extractMessagePayload = (message) => {
  const { content, viewOnce } = unwrapMessage(message);
  const base = extractPayloadFromContent(content);
  const contextInfo = getContextInfo(content);
  const mentions = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid
    : [];
  const quotedMessage = contextInfo?.quotedMessage ?? null;
  let quoted = null;

  if (quotedMessage) {
    const { content: quotedContent, viewOnce: quotedViewOnce } =
      unwrapContent(quotedMessage);
    const quotedPayload = extractPayloadFromContent(quotedContent);
    const quotedMediaType = quotedPayload.media?.type;
    const quotedText = quotedViewOnce
      ? "Visualize este conteúdo em seu WhatsApp Mobile"
      : quotedPayload.texto;
    const resolvedQuotedType = quotedViewOnce
      ? "visualizacao_unica"
      : quotedMediaType === "video"
        ? "video"
        : quotedMediaType === "sticker"
          ? "sticker"
          : quotedMediaType === "audio"
            ? "audio"
            : quotedMediaType === "document"
              ? "documento"
              : quotedPayload.tipo;
    quoted = {
      messageId: contextInfo?.stanzaId ?? null,
      senderId: contextInfo?.participant ?? null,
      tipo: resolvedQuotedType,
      texto: quotedText,
      viewOnce: quotedViewOnce,
    };
  }

  if (viewOnce) {
    return {
      tipo: "texto",
      texto: "Visualize este conteúdo em seu WhatsApp Mobile",
      media: null,
      quoted,
      viewOnce: true,
      mentions,
      content,
    };
  }

  return {
    ...base,
    quoted,
    viewOnce: false,
    mentions,
    content,
  };
};

const buildChatMap = (chats = []) => {
  const map = new Map();
  for (const chat of chats) {
    const id = chat?.id || chat?.jid || chat?.remoteJid;
    if (!id) continue;
    const normalizedId = jidNormalizedUser(id) || id;
    if (isJidStatusBroadcast(normalizedId)) continue;
    const name =
      chat?.name ||
      chat?.subject ||
      chat?.notify ||
      chat?.pushName ||
      null;
    const avatar = chat?.profilePicUrl || chat?.profilePic || null;
    map.set(id, { name, avatar });
  }
  return map;
};

const buildContactMap = (contacts = []) => {
  const map = new Map();
  for (const contact of contacts) {
    const ids = collectContactIds(contact);
    if (!ids.length) continue;
    const name = resolveContactName(contact);
    const rawAvatar =
      contact?.imgUrl ||
      contact?.profilePicUrl ||
      contact?.profilePic ||
      null;
    const avatar = rawAvatar === "changed" ? null : rawAvatar;
    for (const id of ids) {
      map.set(id, { name, avatar });
    }
  }
  return map;
};

const mergeChatMap = (target, source) => {
  if (!target || !source) return target;
  for (const [id, meta] of source.entries()) {
    const atual = target.get(id) || {};
    target.set(id, { ...atual, ...meta });
  }
  return target;
};

const resolveChatName = async ({ remoteJid, session, chatMeta, message }) => {
  if (chatMeta?.name) return chatMeta.name;
  if (isGroupJid(remoteJid) && session?.sock?.groupMetadata) {
    try {
      const metadata = await ensureGroupMetadata({ session, groupJid: remoteJid });
      const subject = metadata?.subject ?? null;
      if (subject) {
        mergeChatMap(session.chatMap, new Map([[remoteJid, { name: subject }]]));
        return subject;
      }
    } catch (error) {
      logger.warn({ err: error }, "Failed to fetch group metadata");
    }
  }
  if (!isGroupJid(remoteJid)) {
    let contactName = session?.contactMap?.get(remoteJid)?.name ?? null;
    if (!contactName && isLidUser(remoteJid)) {
      const pnJid = await resolvePnFromLid({ session, lid: remoteJid });
      if (pnJid) {
        contactName = session?.contactMap?.get(pnJid)?.name ?? null;
        if (contactName && session?.contactMap) {
          mergeChatMap(session.contactMap, new Map([[remoteJid, { name: contactName }]]));
        }
      }
    }
    if (!contactName && isPnUser(remoteJid)) {
      const lidJid = await resolveLidFromPn({ session, pn: remoteJid });
      if (lidJid) {
        contactName = session?.contactMap?.get(lidJid)?.name ?? null;
        if (contactName && session?.contactMap) {
          mergeChatMap(session.contactMap, new Map([[remoteJid, { name: contactName }]]));
        }
      }
    }
    let pushName = message?.pushName ?? null;
    if (message?.key?.fromMe || message?.fromMe) {
      pushName = null;
    }
    if (pushName && session?.nome) {
      const normalized = pushName.trim().toLowerCase();
      const selfName = session.nome.trim().toLowerCase();
      if (normalized === selfName) {
        pushName = null;
      }
    }
    return pushName || contactName || null;
  }
  return null;
};

const resolveParticipantName = async ({
  participantJid,
  session,
  phone,
  fallbackName,
}) => {
  if (!participantJid) return fallbackName ?? null;
  const normalized = jidNormalizedUser(participantJid) || participantJid;
  let name = session?.contactMap?.get(normalized)?.name ?? null;

  if (!name && phone) {
    const pnJid = normalizeJid(phone);
    const pnNormalized = pnJid ? jidNormalizedUser(pnJid) : null;
    if (pnNormalized) {
      name = session?.contactMap?.get(pnNormalized)?.name ?? null;
    }
  }

  if (!name && isLidUser(normalized)) {
    const pnJid = await resolvePnFromLid({ session, lid: normalized });
    if (pnJid) {
      name = session?.contactMap?.get(pnJid)?.name ?? null;
    }
  }

  if (!name && isPnUser(normalized)) {
    const lidJid = await resolveLidFromPn({ session, pn: normalized });
    if (lidJid) {
      name = session?.contactMap?.get(lidJid)?.name ?? null;
    }
  }

  return fallbackName || name || null;
};

const formatMentions = async ({ text, mentions, session, remoteJid }) => {
  if (!text || !mentions?.length) return text;
  let formatted = text;
  const isGroup = isGroupJid(remoteJid);
  for (const mention of mentions) {
    if (!mention) continue;
    let name = null;
    const normalized = jidNormalizedUser(mention) || mention;
    if (session?.numero && (await isSelfContactId({ session, id: normalized }))) {
      name = session.nome ?? null;
    }
    if (!name && isGroup) {
      const phone = await getParticipantPhoneFromGroup({
        session,
        groupJid: remoteJid,
        participantJid: mention,
      });
      name = await resolveParticipantName({
        participantJid: mention,
        session,
        phone,
        fallbackName: null,
      });
    }
    if (!name) {
      const contact = session?.contactMap?.get(normalized);
      name = contact?.name ?? null;
    }
    const digits = extractPhoneCandidate(normalized);
    if (!name || !digits) continue;
    const token = `@${digits}`;
    formatted = formatted.split(token).join(`@${name}`);
  }
  return formatted;
};

const resolveAvatarUrl = async ({
  remoteJid,
  session,
  chatMeta,
  phone,
  force = false,
}) => {
  if (chatMeta?.avatar) return chatMeta.avatar;
  const contactAvatar = session?.contactMap?.get(remoteJid)?.avatar;
  if (contactAvatar) return contactAvatar;
  if (!session?.sock?.profilePictureUrl) return null;
  if (!session.avatarCache) session.avatarCache = new Map();
  if (!force && session.avatarCache.has(remoteJid)) {
    return session.avatarCache.get(remoteJid) || null;
  }
  const candidates = await resolveProfileCandidates({
    remoteJid,
    session,
    phone,
  });
  if (!candidates.length) return null;
  try {
    let url = null;
    for (const candidate of candidates) {
      try {
        await requestPrivacyToken({ session, jid: candidate });
        url = await session.sock.profilePictureUrl(candidate, "image", 6000);
        if (url) break;
        url = await session.sock.profilePictureUrl(candidate, "preview", 6000);
        if (url) break;
      } catch (error) {
        continue;
      }
    }

    if (url) {
      session.avatarCache.set(remoteJid, url);
      mergeChatMap(session.chatMap, new Map([[remoteJid, { avatar: url }]]));
      if (!isGroupJid(remoteJid) && session.contactMap) {
        mergeChatMap(session.contactMap, new Map([[remoteJid, { avatar: url }]]));
      }
      return url;
    }

    const shouldCacheNull =
      !force && !isLidUser(remoteJid) && !isGroupJid(remoteJid);
    if (shouldCacheNull) {
      session.avatarCache.set(remoteJid, null);
    }
    return null;
  } catch (error) {
    const shouldCacheNull =
      !force && !isLidUser(remoteJid) && !isGroupJid(remoteJid);
    if (shouldCacheNull) {
      session.avatarCache.set(remoteJid, null);
    }
    return null;
  }
};

const updateLeadNameFromContact = async ({ session, contact }) => {
  if (!session?.workspaceId || !contact) return;
  const name = resolveContactName(contact);
  if (!name) return;
  const { ids, phones } = await expandContactIds({ session, contact });
  if (!ids.length && !phones.length) return;
  if (session?.contactMap && ids.length) {
    mergeChatMap(
      session.contactMap,
      new Map(ids.map((id) => [id, { name }]))
    );
  }

  const updates = [];
  if (ids.length) {
    updates.push(
      supabase
        .from("leads")
        .update({ nome: name })
        .eq("workspace_id", session.workspaceId)
        .in("whatsapp_wa_id", ids)
        .or("nome.is.null,nome.eq.")
    );
  }
  if (phones.length) {
    updates.push(
      supabase
        .from("leads")
        .update({ nome: name })
        .eq("workspace_id", session.workspaceId)
        .in("telefone", phones)
        .or("nome.is.null,nome.eq.")
    );
  }

  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;
  if (error) {
    logger.debug({ err: error, ids }, "Failed to update lead name from contact");
  }
};

const syncContactAliases = async ({ session, contact }) => {
  if (!session?.contactMap || !contact) return;
  const name = resolveContactName(contact);
  if (!name) return;
  const { ids } = await expandContactIds({ session, contact });
  if (!ids.length) return;
  mergeChatMap(
    session.contactMap,
    new Map(ids.map((id) => [id, { name }]))
  );
};

const backfillLeadNames = async ({
  session,
  integrationAccountId,
  leadLimit = 300,
  forceRun = false,
}) => {
  if (!session || session.status !== "conectado") {
    return { ok: false, reason: "Session not connected" };
  }

  if (session.nameBackfillRunning && !forceRun) {
    return { ok: true, skipped: true };
  }
  if (session.nameBackfillRunning && forceRun) {
    logger.warn(
      { integrationAccountId },
      "Name backfill forced while already running"
    );
  }

  session.nameBackfillRunning = true;
  const startedAt = new Date().toISOString();
  let leadsUpdated = 0;

  try {
    let rounds = 0;
    while (rounds < 25) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, whatsapp_wa_id, telefone")
        .eq("workspace_id", session.workspaceId)
        .eq("canal_origem", "whatsapp")
        .or("nome.is.null,nome.eq.")
        .limit(leadLimit);

      if (!leads?.length) break;

      let updatedThisRound = 0;
      for (const lead of leads ?? []) {
        const waIdRaw = lead?.whatsapp_wa_id;
        if (!waIdRaw) continue;
        const waId = waIdRaw.includes("@") ? waIdRaw : normalizeJid(waIdRaw);
        if (!waId) continue;
        const chatMeta =
          session.contactMap?.get(waId) ?? session.chatMap?.get(waId);
        const name = await resolveChatName({
          remoteJid: waId,
          session,
          chatMeta,
          message: { pushName: null },
        });
        if (!name) continue;
        const { error } = await supabase
          .from("leads")
          .update({ nome: name })
          .eq("id", lead.id);
        if (!error) {
          leadsUpdated += 1;
          updatedThisRound += 1;
        }
      }

      rounds += 1;
      if (updatedThisRound === 0) break;
    }

    logger.info(
      { integrationAccountId, leadsUpdated },
      "Name backfill completed"
    );
  } catch (error) {
    logger.warn({ err: error }, "Name backfill failed");
    return { ok: false, error: error?.message ?? "Unknown error" };
  } finally {
    session.nameBackfillRunning = false;
    session.lastNameBackfillAt = startedAt;
  }

  return { ok: true, leadsUpdated };
};

const backfillSenderNames = async ({
  session,
  integrationAccountId,
  messageLimit = 400,
  forceRun = false,
}) => {
  if (!session || session.status !== "conectado") {
    return { ok: false, reason: "Session not connected" };
  }

  if (session.senderNameBackfillRunning && !forceRun) {
    return { ok: true, skipped: true };
  }
  if (session.senderNameBackfillRunning && forceRun) {
    logger.warn(
      { integrationAccountId },
      "Sender name backfill forced while already running"
    );
  }

  session.senderNameBackfillRunning = true;
  const startedAt = new Date().toISOString();
  let messagesUpdated = 0;

  try {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender_id, sender_nome, conversation_id")
      .eq("workspace_id", session.workspaceId)
      .not("sender_id", "is", null)
      .neq("sender_id", "")
      .or("sender_nome.is.null,sender_nome.eq.")
      .limit(messageLimit);

    const conversationIds = Array.from(
      new Set(
        (messages ?? [])
          .map((message) => message.conversation_id)
          .filter(Boolean)
      )
    );

    const conversationMap = new Map();
    if (conversationIds.length) {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, lead_id, canal")
        .in("id", conversationIds);
      const leadIds = Array.from(
        new Set((conversations ?? []).map((item) => item.lead_id).filter(Boolean))
      );
      const { data: leads } = await supabase
        .from("leads")
        .select("id, whatsapp_wa_id, telefone")
        .in("id", leadIds);
      const leadMap = new Map((leads ?? []).map((lead) => [lead.id, lead]));
      for (const convo of conversations ?? []) {
        const lead = leadMap.get(convo.lead_id ?? "");
        if (!lead) continue;
        conversationMap.set(convo.id, {
          canal: convo.canal,
          whatsappWaId: lead.whatsapp_wa_id ?? null,
          telefone: lead.telefone ?? null,
        });
      }
    }

    for (const message of messages ?? []) {
      const senderRaw = message?.sender_id;
      if (!senderRaw) continue;
      const senderJid = senderRaw.includes("@")
        ? senderRaw
        : normalizeJid(senderRaw);
      if (!senderJid) continue;
      const conversationData = conversationMap.get(message.conversation_id);
      const groupJid =
        conversationData?.canal === "whatsapp" &&
        isGroupJid(conversationData?.whatsappWaId)
          ? conversationData.whatsappWaId
          : null;
      const participantPhone = groupJid
        ? await getParticipantPhoneFromGroup({
            session,
            groupJid,
            participantJid: senderJid,
          })
        : null;

      const senderName = await resolveParticipantName({
        participantJid: senderJid,
        session,
        phone: participantPhone ?? conversationData?.telefone ?? null,
        fallbackName: null,
      });
      if (!senderName) continue;
      const { error } = await supabase
        .from("messages")
        .update({ sender_nome: senderName })
        .eq("id", message.id);
      if (!error) messagesUpdated += 1;
    }

    logger.info(
      { integrationAccountId, messagesUpdated },
      "Sender name backfill completed"
    );
  } catch (error) {
    logger.warn({ err: error }, "Sender name backfill failed");
    return { ok: false, error: error?.message ?? "Unknown error" };
  } finally {
    session.senderNameBackfillRunning = false;
    session.lastSenderNameBackfillAt = startedAt;
  }

  return { ok: true, messagesUpdated };
};

const backfillAvatars = async ({
  session,
  integrationAccountId,
  leadLimit = 200,
  messageLimit = 300,
  forceRun = false,
}) => {
  if (!session || session.status !== "conectado") {
    return { ok: false, reason: "Session not connected" };
  }

  if (session.backfillRunning && !forceRun) {
    return { ok: true, skipped: true };
  }
  if (session.backfillRunning && forceRun) {
    logger.warn(
      { integrationAccountId },
      "Backfill forced while already running"
    );
  }

  session.backfillRunning = true;
  const startedAt = new Date().toISOString();
  let leadsUpdated = 0;
  let messagesUpdated = 0;

  try {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, whatsapp_wa_id, avatar_url, telefone")
      .eq("workspace_id", session.workspaceId)
      .eq("canal_origem", "whatsapp")
      .or("avatar_url.is.null,avatar_url.eq.")
      .limit(leadLimit);

    for (const lead of leads ?? []) {
      const waIdRaw = lead?.whatsapp_wa_id;
      if (!waIdRaw) continue;
      const waId = waIdRaw.includes("@") ? waIdRaw : normalizeJid(waIdRaw);
      const avatarUrl = await resolveAvatarUrl({
        remoteJid: waId,
        session,
        chatMeta: session.contactMap?.get(waId) ?? session.chatMap?.get(waId),
        phone: lead?.telefone ?? null,
        force: true,
      });
      if (!avatarUrl) continue;
      const { error } = await supabase
        .from("leads")
        .update({ avatar_url: avatarUrl })
        .eq("id", lead.id);
      if (!error) leadsUpdated += 1;
    }

    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender_id, sender_avatar_url, conversation_id")
      .eq("workspace_id", session.workspaceId)
      .not("sender_id", "is", null)
      .or("sender_avatar_url.is.null,sender_avatar_url.eq.")
      .limit(messageLimit);

    const conversationIds = Array.from(
      new Set(
        (messages ?? [])
          .map((message) => message.conversation_id)
          .filter(Boolean)
      )
    );

    const conversationMap = new Map();
    if (conversationIds.length) {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, lead_id, canal")
        .in("id", conversationIds);
      const leadIds = Array.from(
        new Set((conversations ?? []).map((item) => item.lead_id).filter(Boolean))
      );
      const { data: leads } = await supabase
        .from("leads")
        .select("id, whatsapp_wa_id, telefone")
        .in("id", leadIds);
      const leadMap = new Map((leads ?? []).map((lead) => [lead.id, lead]));
      for (const convo of conversations ?? []) {
        const lead = leadMap.get(convo.lead_id ?? "");
        if (!lead) continue;
        conversationMap.set(convo.id, {
          canal: convo.canal,
          whatsappWaId: lead.whatsapp_wa_id ?? null,
          telefone: lead.telefone ?? null,
        });
      }
    }

    for (const message of messages ?? []) {
      const senderRaw = message?.sender_id;
      if (!senderRaw) continue;
      const senderJid = senderRaw.includes("@")
        ? senderRaw
        : normalizeJid(senderRaw);
      const conversationData = conversationMap.get(message.conversation_id);
      const groupJid =
        conversationData?.canal === "whatsapp" &&
        isGroupJid(conversationData?.whatsappWaId)
          ? conversationData.whatsappWaId
          : null;
      const participantPhone = groupJid
        ? await getParticipantPhoneFromGroup({
            session,
            groupJid,
            participantJid: senderJid,
          })
        : null;
      const avatarUrl = await resolveAvatarUrl({
        remoteJid: senderJid,
        session,
        chatMeta: session.contactMap?.get(senderJid),
        phone: participantPhone ?? conversationData?.telefone ?? null,
        force: true,
      });
      if (!avatarUrl) continue;
      const { error } = await supabase
        .from("messages")
        .update({ sender_avatar_url: avatarUrl })
        .eq("id", message.id);
      if (!error) messagesUpdated += 1;
    }

    logger.info(
      {
        integrationAccountId,
        leadsUpdated,
        messagesUpdated,
      },
      "Avatar backfill completed"
    );
  } catch (error) {
    logger.warn({ err: error }, "Avatar backfill failed");
    return { ok: false, error: error?.message ?? "Unknown error" };
  } finally {
    session.backfillRunning = false;
    session.lastBackfillAt = startedAt;
  }

  return {
    ok: true,
    leadsUpdated,
    messagesUpdated,
  };
};

const syncLeadFromChat = async ({ session, chat }) => {
  const remoteJid = chat?.id || chat?.jid || chat?.remoteJid;
  if (!remoteJid || !session?.workspaceId) return;
  if (session.blocked || session.status === "desconectado") return;
  const normalizedJid = jidNormalizedUser(remoteJid) || remoteJid;
  if (isJidStatusBroadcast(normalizedJid)) return;
  const identity = await normalizeLeadIdentity({ remoteJid, session });
  if (!identity?.waId) return;
  const chatMeta = buildChatMap([chat]).get(remoteJid);
  const messageStub = {
    pushName:
      chat?.name ||
      chat?.subject ||
      chat?.notify ||
      chat?.pushName ||
      null,
  };
  const name = await resolveChatName({
    remoteJid,
    session,
    chatMeta,
    message: messageStub,
  });
  const avatarUrl = await resolveAvatarUrl({ remoteJid, session, chatMeta });
  const phone = identity.phone ?? null;
  if (!name && !avatarUrl && !phone) return;
  try {
    await upsertLead({
      workspaceId: session.workspaceId,
      waId: identity.waId,
      name,
      phone,
      avatarUrl,
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to sync lead from chat");
  }
};

const shouldSyncMessage = (message) => {
  const cutoff = Date.now() - DAYS_HISTORY * 24 * 60 * 60 * 1000;
  return getTimestampMs(message) >= cutoff;
};

processMessage = async ({
  message,
  session,
  chatMap,
  source,
  queueOnDbFail = true,
}) => {
  if (!message?.key?.remoteJid) return;

  const remoteJid = message.key.remoteJid;
  if (session?.blocked || session?.status === "desconectado") return;
  const normalizedJid = jidNormalizedUser(remoteJid) || remoteJid;
  if (isJidStatusBroadcast(normalizedJid)) return;
  const processingStartedAt = Date.now();

  if (queueOnDbFail && retryQueue.isDbUnavailable()) {
    await retryQueue.enqueue({
      integrationAccountId: session.integrationAccountId,
      message,
      source,
    });
    return;
  }

  try {
    const chatStore = session.chatMap ?? chatMap;
    const chatMeta = chatStore?.get(remoteJid);
    const identity = await normalizeLeadIdentity({ remoteJid, session });
    if (!identity?.waId) return;
    const waId = identity.waId;
    const phone = identity.phone ?? null;
    const displayName = await resolveChatName({
      remoteJid,
      session,
      chatMeta,
      message,
    });
    const avatarUrl = await resolveAvatarUrl({ remoteJid, session, chatMeta });

    const payload = extractMessagePayload(message);
    const createdAt = new Date(getTimestampMs(message)).toISOString();
    const normalizedText = await formatMentions({
      text: payload.texto,
      mentions: payload.mentions,
      session,
      remoteJid,
    });

    const leadId = await upsertLead({
      workspaceId: session.workspaceId,
      waId,
      name: displayName,
      phone,
      avatarUrl,
    });

    const conversationResult = await upsertConversation({
      workspaceId: session.workspaceId,
      leadId,
      integrationAccountId: session.integrationAccountId,
      lastMessage: normalizedText,
      lastAt: createdAt,
    });
    const conversationId = conversationResult.id;
    const isNewConversation = conversationResult.isNew;

    const author = message.key.fromMe ? "equipe" : "contato";
    let senderId = null;
    let senderPhone = null;
    let senderName = null;
    let senderAvatarUrl = null;

    if (message.key.fromMe) {
      senderId = session.numero ?? null;
      senderName = session.nome ?? null;
      if (!senderName && message.pushName) {
        senderName = message.pushName;
      }
      senderAvatarUrl = session.selfAvatarUrl ?? null;
    }

    if (!message.key.fromMe && isGroupJid(remoteJid) && message.key.participant) {
      senderId = message.key.participant;
      await ensureGroupMetadata({ session, groupJid: remoteJid });
      senderPhone = session.participantPhoneMap?.get(senderId) ?? null;
      senderName = await resolveParticipantName({
        participantJid: senderId,
        session,
        phone: senderPhone,
        fallbackName: message.pushName ?? null,
      });
      senderAvatarUrl = await resolveAvatarUrl({
        remoteJid: message.key.participant,
        session,
        chatMeta: session?.contactMap?.get(message.key.participant),
        phone: senderPhone,
      });
    }

    const quoted = payload.quoted ?? null;
    const quotedSenderId = quoted?.senderId ?? null;
    let quotedSenderName = null;
    let quotedAuthor = null;
    if (quotedSenderId) {
      const normalizedQuoted = jidNormalizedUser(quotedSenderId) || quotedSenderId;
      const normalizedSelf = session.numero
        ? jidNormalizedUser(session.numero) || session.numero
        : null;
      quotedAuthor =
        normalizedSelf && normalizedQuoted === normalizedSelf ? "equipe" : "contato";
      if (isGroupJid(remoteJid)) {
        const quotedPhone = await getParticipantPhoneFromGroup({
          session,
          groupJid: remoteJid,
          participantJid: quotedSenderId,
        });
        quotedSenderName = await resolveParticipantName({
          participantJid: quotedSenderId,
          session,
          phone: quotedPhone,
          fallbackName: null,
        });
      } else if (quotedAuthor === "equipe") {
        quotedSenderName = session.nome ?? null;
      } else {
        quotedSenderName = displayName ?? null;
      }
    }

    const messageResult = await upsertMessage({
      workspaceId: session.workspaceId,
      conversationId,
      messageId: message.key.id,
      author,
      messageType: payload.tipo,
      content: normalizedText,
      createdAt,
      senderId,
      senderName,
      senderAvatarUrl,
      quotedMessageId: quoted?.messageId ?? null,
      quotedContent: quoted?.texto ?? null,
      quotedType: quoted?.tipo ?? null,
      quotedAuthor,
      quotedSenderId,
      quotedSenderName,
    });
    const messageId = messageResult?.id ?? null;

    const createdAtMs = Date.parse(createdAt);
    const nowMs = Date.now();
    const isRecent =
      Number.isFinite(createdAtMs) &&
      nowMs - createdAtMs < 2 * 60 * 1000;
    const shouldEmitRealtime = source === "realtime" || isRecent;
    const shouldEmitConversationUpdate =
      shouldEmitRealtime || (source === "history" && isNewConversation);
    const processingMs = nowMs - processingStartedAt;
    const messageLagMs = Number.isFinite(createdAtMs)
      ? nowMs - createdAtMs
      : null;
    if (
      (shouldEmitRealtime || shouldEmitConversationUpdate) &&
      processingMs > 1000
    ) {
      logger.warn(
        {
          processingMs,
          messageLagMs,
          source,
          conversationId,
          messageExternalId: message.key.id || null,
        },
        "Message processing latency"
      );
    }
    const shouldNotifyAgents =
      author === "contato" &&
      (source === "realtime" ||
        (Number.isFinite(createdAtMs) &&
          Date.now() - createdAtMs < 2 * 60 * 1000));

    if (shouldNotifyAgents) {
      void notifyAgents({
        workspaceId: session.workspaceId,
        integrationAccountId: session.integrationAccountId,
        conversationId,
        messageRowId: messageId,
        messageExternalId: message.key.id,
        text: normalizedText,
        isGroup: isGroupJid(remoteJid),
      });
    }

    if (shouldEmitRealtime && messageId && messageResult?.isNew) {
      void realtime.emitMessageCreated({
        workspaceId: session.workspaceId,
        conversationId,
        message: {
          id: messageId,
          autor: author,
          tipo: payload.tipo,
          conteudo: normalizedText ?? null,
          created_at: createdAt,
          interno: false,
          sender_id: senderId || null,
          sender_nome: senderName || null,
          sender_avatar_url: senderAvatarUrl || null,
          quoted_message_id: quoted?.messageId ?? null,
          quoted_autor: quotedAuthor ?? null,
          quoted_sender_id: quotedSenderId ?? null,
          quoted_sender_nome: quotedSenderName ?? null,
          quoted_tipo: quoted?.tipo ?? null,
          quoted_conteudo: quoted?.texto ?? null,
        },
      });
      if (shouldEmitConversationUpdate) {
        void realtime.emitConversationUpdated({
          workspaceId: session.workspaceId,
          conversationId,
          status: "aberta",
          lastMessage: normalizedText,
          lastAt: createdAt,
        });
      }
    } else if (shouldEmitConversationUpdate) {
      void realtime.emitConversationUpdated({
        workspaceId: session.workspaceId,
        conversationId,
        status: "aberta",
        lastMessage: normalizedText,
        lastAt: createdAt,
      });
    }

    if (!messageId || !payload.media || payload.viewOnce) return;

    const messageForDownload = payload.content
      ? { ...message, message: payload.content }
      : message;

    const existingAttachments = await supabase
      .from("attachments")
      .select("id")
      .eq("message_id", messageId)
      .limit(1);
    throwIfSupabaseError(
      existingAttachments.error,
      "Falha ao checar anexos"
    );

    if ((existingAttachments.data ?? []).length > 0) return;

    const buffer = await downloadMediaMessage(
      messageForDownload,
      "buffer",
      {},
      {
        logger,
        reuploadRequest: session.sock.updateMediaMessage,
      }
    );

    const storagePath = await uploadAttachment({
      buffer,
      workspaceId: session.workspaceId,
      conversationId,
      filename: payload.media.fileName || "arquivo",
      contentType: payload.media.mimetype || "application/octet-stream",
    });

    const attachmentType =
      payload.media.type === "audio"
        ? "audio"
        : payload.media.type === "document"
          ? "pdf"
          : payload.media.type === "video"
            ? "video"
            : payload.media.type === "sticker"
              ? "sticker"
              : "imagem";
    const attachmentId = await insertAttachment({
      workspaceId: session.workspaceId,
      messageId,
      storagePath,
      tipo: attachmentType,
      tamanhoBytes: buffer?.length ?? null,
    });

    if (shouldEmitRealtime && attachmentId) {
      void realtime.emitAttachmentCreated({
        workspaceId: session.workspaceId,
        conversationId,
        messageId,
        attachment: {
          id: attachmentId,
          storage_path: storagePath,
          tipo: attachmentType,
          tamanho_bytes: buffer?.length ?? null,
        },
      });
    }
  } catch (error) {
    if (queueOnDbFail && isTransientDbError(error)) {
      retryQueue.markDbUnavailable();
      await retryQueue.enqueue({
        integrationAccountId: session.integrationAccountId,
        message,
        source,
      });
      logger.warn({ err: error }, "Supabase indisponivel; mensagem enfileirada");
      return;
    }
    throw error;
  }
};

const createSession = async ({ integrationAccountId, workspaceId, forceNew }) => {
  if (!forceNew && sessions.has(integrationAccountId)) {
    const existing = sessions.get(integrationAccountId);
    const reusable =
      existing &&
      !existing.blocked &&
      existing.sock &&
      existing.status &&
      existing.status !== "desconectado";
    if (reusable) {
      return existing;
    }
    sessions.delete(integrationAccountId);
  }
  if (forceNew && sessions.has(integrationAccountId)) {
    const existing = sessions.get(integrationAccountId);
    try {
      await existing?.sock?.logout();
    } catch (error) {
      logger.warn({ err: error }, "Failed to close existing session");
    }
    sessions.delete(integrationAccountId);
  }

  await sessionRepository.ensureSessionRow(integrationAccountId, workspaceId);

  const { data: sessionRow } = await supabase
    .from(SESSION_TABLE)
    .select("auth_state")
    .eq("integration_account_id", integrationAccountId)
    .maybeSingle();

  const stored =
    !forceNew && sessionRow?.auth_state
      ? deserializeAuth(sessionRow.auth_state)
      : { creds: initAuthCreds(), keys: {} };

  const keyData = stored.keys ?? {};
  let saveTimer = null;

  const saveAuthState = async () => {
    const payload = serializeAuth({ creds: stored.creds, keys: keyData });
    await supabase
      .from(SESSION_TABLE)
      .update({ auth_state: payload })
      .eq("integration_account_id", integrationAccountId);
  };

  const scheduleSave = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      try {
        await saveAuthState();
      } catch (error) {
        logger.error({ err: error }, "Failed to persist auth state");
      }
    }, 1000);
  };

  const keyStore = {
    get: async (type, ids) => {
      const store = keyData[type] || {};
      const entries = {};
      for (const id of ids) {
        if (store[id]) {
          entries[id] = store[id];
        }
      }
      return entries;
    },
    set: async (data) => {
      for (const [type, values] of Object.entries(data)) {
        if (!keyData[type]) {
          keyData[type] = {};
        }
        Object.assign(keyData[type], values);
      }
      scheduleSave();
    },
  };

  const { version } = await fetchLatestBaileysVersion();

  const keyStoreWithTx = addTransactionCapability(keyStore, logger, {
    maxCommitRetries: 3,
    delayBetweenTriesMs: 250,
  });
  const cachedKeyStore = makeCacheableSignalKeyStore(keyStoreWithTx, logger);

  const sock = makeWASocket({
    version,
    auth: {
      creds: stored.creds,
      keys: cachedKeyStore,
    },
    logger,
    browser: Browsers.appropriate("Desktop"),
    printQRInTerminal: false,
    syncFullHistory: BAILEYS_SYNC_FULL_HISTORY,
    keepAliveIntervalMs: BAILEYS_KEEP_ALIVE_MS,
    connectTimeoutMs: BAILEYS_CONNECT_TIMEOUT_MS,
    defaultQueryTimeoutMs: BAILEYS_DEFAULT_QUERY_TIMEOUT_MS,
    retryRequestDelayMs: BAILEYS_RETRY_REQUEST_DELAY_MS,
  });

  const session = {
    integrationAccountId,
    workspaceId,
    sock,
    qr: null,
    status: "conectando",
    numero: null,
    nome: null,
    selfAvatarUrl: null,
    chatMap: new Map(),
    avatarCache: new Map(),
    contactMap: new Map(),
    participantPhoneMap: new Map(),
    groupMetaCache: new Map(),
    blocked: false,
    backfillRunning: false,
    backfillScheduled: false,
    nameBackfillRunning: false,
    nameBackfillScheduled: false,
    lastNameBackfillAt: null,
    senderNameBackfillRunning: false,
    senderNameBackfillScheduled: false,
    lastSenderNameBackfillAt: null,
  };

  sessions.set(integrationAccountId, session);

  sock.ev.on("creds.update", () => {
    scheduleSave();
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      session.qr = qrDataUrl;
      session.status = "conectando";
      await sessionRepository.updateSessionRow(integrationAccountId, {
        status: "conectando",
        last_qr: qrDataUrl,
      });
      await sessionRepository.updateIntegrationAccount(integrationAccountId, {
        status: "conectando",
      });
    }

    if (connection === "open") {
      clearRestartState(integrationAccountId);
      clearBadSession(integrationAccountId);
      logger.info({ integrationAccountId }, "Conexao aberta");
      const numero = sock.user?.id ? normalizeJid(sock.user.id) : null;
      session.status = "conectado";
      session.qr = null;
      session.numero = numero;
      session.nome =
        resolveSelfNameFromUser(sock.user) ??
        resolveSelfNameFromUser(stored?.creds?.me) ??
        null;
      const avatarUrl = numero
        ? await resolveAvatarUrl({
            remoteJid: numero,
            session,
            chatMeta: session.contactMap?.get(numero),
            force: true,
          })
        : null;
      if (avatarUrl) {
        session.selfAvatarUrl = avatarUrl;
      }
      await sessionRepository.updateSessionRow(integrationAccountId, {
        status: "conectado",
        last_qr: null,
        numero,
        nome: session.nome,
      });
      await sessionRepository.updateIntegrationAccount(integrationAccountId, {
        status: "conectado",
        connected_at: new Date().toISOString(),
        numero,
        ...(session.nome ? { nome: session.nome } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        sync_last_error: null,
      });
      if (session.nome || avatarUrl) {
        await syncSelfProfile({
          session,
          name: session.nome,
          avatarUrl,
        });
      }

      if (!session.backfillScheduled) {
        session.backfillScheduled = true;
        setTimeout(() => {
          void backfillAvatars({
            session,
            integrationAccountId,
          });
        }, 4000);
      }
      setTimeout(() => {
        void syncSelfProfile({
          session,
          name: session.nome,
          avatarUrl: session.selfAvatarUrl,
        });
      }, 8000);
      if (!session.nameBackfillScheduled) {
        session.nameBackfillScheduled = true;
        setTimeout(() => {
          void backfillLeadNames({
            session,
            integrationAccountId,
          });
        }, 7000);
      }
      if (!session.senderNameBackfillScheduled) {
        session.senderNameBackfillScheduled = true;
        setTimeout(() => {
          void backfillSenderNames({
            session,
            integrationAccountId,
          });
        }, 9000);
      }
      if (retryQueue.hasPending()) {
        void retryQueue.flush();
      }
    }

    if (connection === "close") {
      if (session.blocked) return;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason =
        statusCode && DisconnectReason[statusCode]
          ? DisconnectReason[statusCode]
          : null;
      const message = lastDisconnect?.error?.message ?? "unknown";
      logger.warn(
        { statusCode, reason, message },
        "Connection closed"
      );

      const errorLabel = reason ? `Baileys: ${reason}` : `Baileys: ${message}`;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const isBadSession = statusCode === DisconnectReason.badSession;
      const restartRequired = statusCode === DisconnectReason.restartRequired;
      const shouldForceReauth =
        isBadSession && registerBadSession(integrationAccountId);

      if (loggedOut) {
        session.status = "desconectado";
        session.qr = null;
        sessions.delete(integrationAccountId);
        clearRestartState(integrationAccountId);
        clearBadSession(integrationAccountId);
        await sessionRepository.updateSessionRow(integrationAccountId, {
          status: "desconectado",
          last_qr: null,
          auth_state: null,
        });
        await sessionRepository.updateIntegrationAccount(integrationAccountId, {
          status: "desconectado",
          sync_last_error: errorLabel,
        });
        return;
      }

      if (shouldForceReauth) {
        session.status = "desconectado";
        session.qr = null;
        sessions.delete(integrationAccountId);
        clearRestartState(integrationAccountId);
        await sessionRepository.updateSessionRow(integrationAccountId, {
          status: "desconectado",
          last_qr: null,
          auth_state: null,
        });
        await sessionRepository.updateIntegrationAccount(integrationAccountId, {
          status: "desconectado",
          sync_last_error: `${errorLabel} - reautenticacao necessaria`,
        });
        return;
      }

      session.status = "conectando";
      session.qr = null;
      const reconnectWorkspaceId = session.workspaceId;
      sessions.delete(integrationAccountId);

      await sessionRepository.updateSessionRow(integrationAccountId, {
        status: "conectando",
        last_qr: null,
      });
      await sessionRepository.updateIntegrationAccount(integrationAccountId, {
        status: "conectando",
        sync_last_error: errorLabel,
      });

      scheduleRestart({
        integrationAccountId,
        workspaceId: reconnectWorkspaceId,
        forceNew: false,
        delayOverrideMs: restartRequired ? 250 : undefined,
        errorLabel,
      });
    }
  });

  sock.ev.on("messaging-history.set", async ({ messages, chats, contacts }) => {
    if (session.blocked || session.status === "desconectado") return;
    logger.info(
      {
        totalMessages: messages?.length ?? 0,
        totalChats: chats?.length ?? 0,
      },
      "Received messaging history"
    );
    if (Array.isArray(contacts) && contacts.length) {
      mergeChatMap(session.contactMap, buildContactMap(contacts));
      for (const contact of contacts) {
        await updateLeadNameFromContact({ session, contact });
        await syncContactAliases({ session, contact });
      }
    }
    const chatMap = mergeChatMap(
      session.chatMap,
      buildChatMap(chats ?? [])
    );
    for (const chat of chats ?? []) {
      await syncLeadFromChat({ session, chat });
    }
    const chatIds = new Set(
      (chats ?? [])
        .map((chat) => chat?.id || chat?.jid || chat?.remoteJid)
        .filter(Boolean)
    );
    const validMessages = (messages ?? [])
      .filter(shouldSyncMessage)
      .sort((a, b) => getTimestampMs(a) - getTimestampMs(b));
    const total = validMessages.length;
    const totalChats = chatIds.size;
    await sessionRepository.updateSyncStatus(integrationAccountId, {
      sync_status: "running",
      sync_total: total,
      sync_done: 0,
      sync_total_chats: totalChats,
      sync_done_chats: 0,
      sync_started_at: new Date().toISOString(),
      sync_finished_at: null,
      sync_last_error: null,
    });

    let processed = 0;
    const seenChats = new Set();
    for (const message of validMessages) {
      const chatId = message?.key?.remoteJid;
      const chatChanged = chatId && chatIds.has(chatId) && !seenChats.has(chatId);
      if (chatChanged) {
        seenChats.add(chatId);
      }
      try {
        await processMessage({ message, session, chatMap, source: "history" });
      } catch (error) {
        logger.error({ err: error }, "Failed to process history message");
      } finally {
        processed += 1;
        if (chatChanged || processed % 50 === 0 || processed === total) {
          await sessionRepository.updateSyncStatus(integrationAccountId, {
            sync_done: processed,
            sync_done_chats: seenChats.size,
          });
        }
      }
    }

    await sessionRepository.updateSyncStatus(integrationAccountId, {
      sync_status: "done",
      sync_finished_at: new Date().toISOString(),
      sync_done_chats: totalChats,
    });
    logger.info(
      { processed, total },
      "Messaging history sync completed"
    );
  });

  sock.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type !== "notify") return;
    const chatMap = session.chatMap ?? buildChatMap();
    for (const message of messages ?? []) {
      try {
        await processMessage({ message, session, chatMap, source: "realtime" });
      } catch (error) {
        logger.error({ err: error }, "Failed to process message");
      }
    }
  });

  sock.ev.on("chats.upsert", (chats) => {
    mergeChatMap(session.chatMap, buildChatMap(chats ?? []));
    (chats ?? []).forEach((chat) => {
      void syncLeadFromChat({ session, chat });
    });
  });

  sock.ev.on("chats.update", (updates) => {
    mergeChatMap(session.chatMap, buildChatMap(updates ?? []));
    (updates ?? []).forEach((chat) => {
      void syncLeadFromChat({ session, chat });
    });
  });

  sock.ev.on("contacts.upsert", (contacts) => {
    const list = contacts ?? [];
    mergeChatMap(session.contactMap, buildContactMap(list));
    list.forEach((contact) => {
      void updateLeadNameFromContact({ session, contact });
      void syncSelfProfileFromContact({ session, contact });
    });
  });

  sock.ev.on("contacts.update", (updates) => {
    const list = updates ?? [];
    mergeChatMap(session.contactMap, buildContactMap(list));
    list.forEach((contact) => {
      void updateLeadNameFromContact({ session, contact });
      void syncSelfProfileFromContact({ session, contact });
    });
  });

  sock.ev.on("contacts.set", ({ contacts }) => {
    const list = contacts ?? [];
    mergeChatMap(session.contactMap, buildContactMap(list));
    list.forEach((contact) => {
      void syncContactAliases({ session, contact });
      void syncSelfProfileFromContact({ session, contact });
    });
    if (!session.nameBackfillScheduled) {
      session.nameBackfillScheduled = true;
      setTimeout(() => {
        void backfillLeadNames({
          session,
          integrationAccountId: session.integrationAccountId,
        });
      }, 4000);
    }
    if (!session.senderNameBackfillScheduled) {
      session.senderNameBackfillScheduled = true;
      setTimeout(() => {
        void backfillSenderNames({
          session,
          integrationAccountId: session.integrationAccountId,
        });
      }, 6000);
    }
  });

  return session;
};

const app = express();
app.use(express.json({ limit: "6mb" }));
app.use(requireApiKey);
app.use(
  "/sessions",
  createSessionRoutes({
    sessions,
    createSession,
    sessionRepository,
    logger,
    backfillAvatars,
    getParticipantPhoneFromGroup,
    resolveProfileCandidates,
    requestPrivacyToken,
    ensureGroupMetadata,
  })
);
app.use(
  "/messages",
  createMessageRoutes({
    sessions,
    normalizeJid,
    logger,
  })
);

app.get("/health", (_req, res) => {
  const pusherEnabled = Boolean(
    PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
  );
  res.json({
    ok: true,
    pusher: { enabled: pusherEnabled },
  });
});

app.listen(PORT, () => {
  logger.info(`Baileys service running on :${PORT}`);
  retryQueue
    .loadFromDisk()
    .then(() => {
      retryQueue.start();
      return bootstrapSessions({ supabase, createSession, logger });
    })
    .catch((error) => {
      logger.warn({ err: error }, "Failed to bootstrap sessions");
    });
});
