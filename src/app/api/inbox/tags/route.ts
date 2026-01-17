import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { emitTagsUpdated } from "@/lib/pusher/events";
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

const payloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  tagIds: z.array(z.string().trim().min(1)).min(1),
  action: z.enum(["add", "remove"]).optional(),
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
  const { conversationId, tagIds, action = "add" } = parsed.data;

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  const uniqueTags = Array.from(new Set(tagIds));
  const { data: validTags } = await userClient
    .from("tags")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .in("id", uniqueTags);
  const validIds = new Set((validTags ?? []).map((tag) => tag.id));
  if (!validIds.size) {
    return unprocessableEntity("Tags invalidas.");
  }
  const tagsFiltradas = uniqueTags.filter((tagId) => validIds.has(tagId));
  const remover = action === "remove";

  if (conversation.lead_id) {
    if (remover) {
      const { error: leadDeleteError } = await userClient
        .from("lead_tags")
        .delete()
        .eq("lead_id", conversation.lead_id)
        .eq("workspace_id", membership.workspace_id)
        .in("tag_id", tagsFiltradas);
      if (leadDeleteError) {
        return serverError(leadDeleteError.message ?? "Failed to remove tags.");
      }
    } else {
      const { error: leadUpsertError } = await userClient.from("lead_tags").upsert(
        tagsFiltradas.map((tagId) => ({
          workspace_id: membership.workspace_id,
          lead_id: conversation.lead_id,
          tag_id: tagId,
        })),
        { onConflict: "lead_id,tag_id" }
      );
      if (leadUpsertError) {
        return serverError(leadUpsertError.message ?? "Failed to add tags.");
      }
    }
  }

  if (conversation.contact_id) {
    if (remover) {
      const { error: contactDeleteError } = await userClient
        .from("contact_tags")
        .delete()
        .eq("contact_id", conversation.contact_id)
        .eq("workspace_id", membership.workspace_id)
        .in("tag_id", tagsFiltradas);
      if (contactDeleteError) {
        return serverError(
          contactDeleteError.message ?? "Failed to remove tags."
        );
      }
    } else {
      const { error: contactUpsertError } =
        await userClient.from("contact_tags").upsert(
        tagsFiltradas.map((tagId) => ({
          workspace_id: membership.workspace_id,
          contact_id: conversation.contact_id,
          tag_id: tagId,
        })),
        { onConflict: "contact_id,tag_id" }
      );
      if (contactUpsertError) {
        return serverError(
          contactUpsertError.message ?? "Failed to add tags."
        );
      }
    }
  }

  const tagsResponse = await userClient
    .from(conversation.lead_id ? "lead_tags" : "contact_tags")
    .select("tags (nome)")
    .eq("workspace_id", membership.workspace_id)
    .eq(
      conversation.lead_id ? "lead_id" : "contact_id",
      conversation.lead_id ?? conversation.contact_id
    );
  if (tagsResponse.error) {
    return serverError(tagsResponse.error.message ?? "Failed to load tags.");
  }

  const tagsAtualizadas = (tagsResponse.data ?? [])
    .map((registro) => {
      const tagItem = Array.isArray(registro.tags)
        ? registro.tags[0]
        : registro.tags;
      return tagItem?.nome ?? null;
    })
    .filter(Boolean) as string[];

  await emitTagsUpdated({
    workspace_id: membership.workspace_id,
    conversation_id: conversation.id,
    tags: tagsAtualizadas,
  });

  return Response.json({ ok: true, tags: tagsAtualizadas });
}
