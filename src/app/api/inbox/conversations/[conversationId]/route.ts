import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type UpdatePayload = {
  status?: "aberta" | "pendente" | "resolvida" | "spam";
  ownerId?: string | null;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
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

  const body = (await request.json()) as UpdatePayload;
  const updates: Record<string, unknown> = {};

  if (body?.status) {
    updates.status = body.status;
  }
  if ("ownerId" in body) {
    updates.owner_id = body.ownerId ?? null;
  }

  if (!Object.keys(updates).length) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const conversationId = params.conversationId;
  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversation not found.", { status: 404 });
  }

  if (body?.ownerId) {
    const { data: ownerMembership } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", membership.workspace_id)
      .eq("user_id", body.ownerId)
      .maybeSingle();
    if (!ownerMembership) {
      return new Response("Responsavel invalido.", { status: 422 });
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
    return new Response(updateError.message, { status: 500 });
  }

  if ("ownerId" in body) {
    const ownerId = body.ownerId ?? null;
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

  return Response.json({ conversation: updated });
}
