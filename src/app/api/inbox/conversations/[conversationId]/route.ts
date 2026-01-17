import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { emitConversationUpdated } from "@/lib/pusher/events";
import {
  badRequest,
  notFound,
  serverError,
  unauthorized,
  unprocessableEntity,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z
  .object({
    status: z.enum(["aberta", "pendente", "resolvida", "spam"]).optional(),
    ownerId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => data.status || data.ownerId !== undefined, {
    message: "Invalid payload",
  });

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
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
  const updates: Record<string, unknown> = {};
  if (parsed.data.status) {
    updates.status = parsed.data.status;
  }
  if (parsed.data.ownerId !== undefined) {
    updates.owner_id = parsed.data.ownerId ?? null;
  }

  const { conversationId } = await context.params;
  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  if (parsed.data.ownerId) {
    const { data: ownerMembership } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", membership.workspace_id)
      .eq("user_id", parsed.data.ownerId)
      .maybeSingle();
    if (!ownerMembership) {
      return unprocessableEntity("Responsavel invalido.");
    }
  }

  const { data: updated, error: updateError } = await userClient
    .from("conversations")
    .update(updates)
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id)
    .select("id, status, owner_id")
    .maybeSingle();

  if (updateError) {
    return serverError(updateError.message);
  }

  if (parsed.data.ownerId !== undefined) {
    const ownerId = parsed.data.ownerId ?? null;
    if (conversation.lead_id) {
      await userClient
        .from("leads")
        .update({ owner_id: ownerId })
        .eq("id", conversation.lead_id)
        .eq("workspace_id", membership.workspace_id);
    }
    if (conversation.contact_id) {
      await userClient
        .from("contacts")
        .update({ owner_id: ownerId })
        .eq("id", conversation.contact_id)
        .eq("workspace_id", membership.workspace_id);
    }
  }

  if (updated) {
    await emitConversationUpdated({
      workspace_id: membership.workspace_id,
      conversation_id: updated.id,
      status: updated.status,
      owner_id: updated.owner_id ?? null,
    });
  }

  return Response.json({ conversation: updated });
}
