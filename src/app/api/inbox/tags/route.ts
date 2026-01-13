import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type TagsPayload = {
  conversationId?: string;
  tagIds?: string[];
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
  if (conversation.lead_id) {
    await userClient.from("lead_tags").upsert(
      tagsFiltradas.map((tagId) => ({
        workspace_id: membership.workspace_id,
        lead_id: conversation.lead_id,
        tag_id: tagId,
      })),
      { onConflict: "lead_id,tag_id" }
    );
  }

  if (conversation.contact_id) {
    await userClient.from("contact_tags").upsert(
      tagsFiltradas.map((tagId) => ({
        workspace_id: membership.workspace_id,
        contact_id: conversation.contact_id,
        tag_id: tagId,
      })),
      { onConflict: "contact_id,tag_id" }
    );
  }

  return Response.json({ ok: true });
}
