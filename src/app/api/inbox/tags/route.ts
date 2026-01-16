import { createClient } from "@supabase/supabase-js";
import { emitTagsUpdated } from "@/lib/pusher/events";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type TagsPayload = {
  conversationId?: string;
  tagIds?: string[];
  action?: "add" | "remove";
};

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

  const body = (await request.json()) as TagsPayload;
  const conversationId = body?.conversationId?.trim();
  const tagIds = (body?.tagIds ?? []).filter(Boolean);
  const action = body?.action ?? "add";

  if (!conversationId || !tagIds.length) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversation not found.", { status: 404 });
  }

  const uniqueTags = Array.from(new Set(tagIds));
  const { data: validTags } = await userClient
    .from("tags")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .in("id", uniqueTags);
  const validIds = new Set((validTags ?? []).map((tag) => tag.id));
  if (!validIds.size) {
    return new Response("Tags invalidas.", { status: 422 });
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
        return new Response(leadDeleteError.message ?? "Failed to remove tags.", {
          status: 500,
        });
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
        return new Response(leadUpsertError.message ?? "Failed to add tags.", {
          status: 500,
        });
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
        return new Response(
          contactDeleteError.message ?? "Failed to remove tags.",
          { status: 500 }
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
        return new Response(contactUpsertError.message ?? "Failed to add tags.", {
          status: 500,
        });
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
    return new Response(tagsResponse.error.message ?? "Failed to load tags.", {
      status: 500,
    });
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
