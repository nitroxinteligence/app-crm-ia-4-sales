import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Payload = {
  inviteId?: string;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getMembership(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Missing Supabase env vars." };
  }
  const userClient = getUserClient(request);
  if (!userClient) {
    return { error: "Missing auth header." };
  }
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: "Invalid auth." };
  }

  const { data: membership, error: membershipError } = await userClient
    .from("workspace_members")
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { error: "Workspace not found." };
  }

  return { user, membership, userClient };
}

export async function POST(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  if (membership.role !== "ADMIN") {
    return new Response("Forbidden.", { status: 403 });
  }

  const body = (await request.json()) as Payload;
  const inviteId =
    typeof body?.inviteId === "string" ? body.inviteId.trim() : "";

  if (!inviteId) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: updateError } = await userClient
    .from("workspace_invites")
    .update({
      token,
      expires_at: expiresAt,
      status: "pendente",
    })
    .eq("id", inviteId)
    .eq("workspace_id", membership.workspace_id)
    .select("id, email, role, status, token, expires_at, created_at")
    .maybeSingle();

  if (updateError || !data) {
    return new Response(updateError?.message ?? "Invite not found.", {
      status: 400,
    });
  }

  return Response.json({ invite: data });
}
