import type { StatusConversa } from "@/lib/types"
import { emitConversationUpdated, emitMessageCreated } from "@/lib/pusher/events"
import type { AttachmentKind } from "@/lib/inbox/attachments"
import type { Database, UserClient } from "@/lib/inbox/database"

export const isOutsideWhatsappWindow = async (
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
    .maybeSingle()
  if (!data?.created_at) return false
  const lastAt = new Date(data.created_at)
  if (Number.isNaN(lastAt.getTime())) return false
  return Date.now() - lastAt.getTime() > 24 * 60 * 60 * 1000
}

export const salvarMensagem = async (
  userClient: UserClient,
  workspaceId: string,
  conversation: { id: string; status: string },
  payload: {
    tipo: "texto" | AttachmentKind
    conteudo: string
    providerMessageId?: string | null
    sendStatus?: string | null
    sendError?: string | null
    clientMessageId?: string | null
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
  }

  let insertAttempt = await userClient
    .from("messages")
    .insert(baseInsert)
    .select("id, created_at")
    .single()
  if (!insertAttempt.error) {
    const createdMessage = insertAttempt.data as
      | { id: string; created_at: string | null }
      | null
    if (!createdMessage) {
      return { error: "Falha ao salvar mensagem." }
    }
    const dataCriacao = createdMessage.created_at ?? new Date().toISOString()
    const statusAtualizado =
      (conversation.status === "resolvida" || conversation.status === "pendente"
        ? "aberta"
        : conversation.status) as StatusConversa

    await userClient
      .from("conversations")
      .update({
        ultima_mensagem: payload.conteudo,
        ultima_mensagem_em: dataCriacao,
        status: statusAtualizado,
      })
      .eq("id", conversation.id)
      .eq("workspace_id", workspaceId)

    await emitMessageCreated({
      workspace_id: workspaceId,
      conversation_id: conversation.id,
      message: {
        id: createdMessage.id,
        autor: "equipe",
        tipo: payload.tipo,
        conteudo: payload.conteudo,
        created_at: dataCriacao,
        interno: false,
        client_message_id: payload.clientMessageId ?? null,
      },
    })

    await emitConversationUpdated({
      workspace_id: workspaceId,
      conversation_id: conversation.id,
      status: statusAtualizado,
      ultima_mensagem: payload.conteudo,
      ultima_mensagem_em: dataCriacao,
    })

    return { data: createdMessage }
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
      .single()
  }

  const createdMessage = insertAttempt.data as
    | { id: string; created_at: string | null }
    | null
  if (insertAttempt.error || !createdMessage) {
    return { error: insertAttempt.error?.message ?? "Falha ao salvar mensagem." }
  }

  const dataCriacao = createdMessage.created_at ?? new Date().toISOString()
  const statusAtualizado =
    (conversation.status === "resolvida" || conversation.status === "pendente"
      ? "aberta"
      : conversation.status) as StatusConversa

  await userClient
    .from("conversations")
    .update({
      ultima_mensagem: payload.conteudo,
      ultima_mensagem_em: dataCriacao,
      status: statusAtualizado,
    })
    .eq("id", conversation.id)
    .eq("workspace_id", workspaceId)

  await emitMessageCreated({
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    message: {
      id: createdMessage.id,
      autor: "equipe",
      tipo: payload.tipo,
      conteudo: payload.conteudo,
      created_at: dataCriacao,
      interno: false,
      client_message_id: payload.clientMessageId ?? null,
    },
  })

  await emitConversationUpdated({
    workspace_id: workspaceId,
    conversation_id: conversation.id,
    status: statusAtualizado,
    ultima_mensagem: payload.conteudo,
    ultima_mensagem_em: dataCriacao,
  })

  return { data: createdMessage }
}

export const atualizarEnvioMensagem = async (
  userClient: UserClient,
  messageId: string,
  payload: {
    providerMessageId?: string | null
    sendStatus?: string
    sendError?: string | null
  }
) => {
  const updatePayload: Database["public"]["Tables"]["messages"]["Update"] = {}
  if (payload.providerMessageId !== undefined) {
    updatePayload.whatsapp_message_id = payload.providerMessageId
  }
  if (payload.sendStatus) {
    updatePayload.send_status = payload.sendStatus
  }
  if (payload.sendError !== undefined) {
    updatePayload.send_error = payload.sendError
  }
  if (Object.keys(updatePayload).length === 0) return

  const updated = await userClient.from("messages").update(updatePayload).eq("id", messageId)
  if (
    updated.error?.message?.includes("send_status") ||
    updated.error?.message?.includes("send_error")
  ) {
    const fallback: Record<string, unknown> = {}
    if (payload.providerMessageId !== undefined) {
      fallback.whatsapp_message_id = payload.providerMessageId
    }
    if (Object.keys(fallback).length === 0) return
    await userClient.from("messages").update(fallback).eq("id", messageId)
  }
}
