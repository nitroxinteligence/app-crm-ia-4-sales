import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type BlockPayload = {
  conversationId?: string;
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

  const body = (await request.json()) as BlockPayload;
  const conversationId = body?.conversationId?.trim();
  if (!conversationId) {
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

  if (conversation.lead_id) {
    await userClient
      .from("leads")
      .update({ status: "bloqueado" })
      .eq("id", conversation.lead_id)
      .eq("workspace_id", membership.workspace_id);
  }

  await userClient
    .from("conversations")
    .update({ status: "spam" })
    .eq("id", conversation.id)
    .eq("workspace_id", membership.workspace_id);

  return Response.json({ ok: true });
}
