import { createClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

export async function GET(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { data, error: invitesError } = await userClient
    .from("workspace_invites")
    .select("id, email, role, status, token, expires_at, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  if (invitesError) {
    return new Response(invitesError.message, { status: 500 });
  }

  return Response.json({ invites: data ?? [] });
}

export async function POST(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const role = body?.role as Role | undefined;

  if (!email || !role) {
    return new Response("Invalid payload", { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: insertError } = await userClient
    .from("workspace_invites")
    .insert({
      workspace_id: membership.workspace_id,
      email,
      role,
      token,
      status: "pendente",
      expires_at: expiresAt,
    })
    .select("id, email, role, status, token, expires_at, created_at")
    .maybeSingle();

  if (insertError) {
    return new Response(insertError.message, { status: 500 });
  }

  return Response.json({ invite: data });
}

export async function DELETE(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get("inviteId");
  if (!inviteId) {
    return new Response("Missing inviteId", { status: 400 });
  }

  const { error: deleteError } = await userClient
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return new Response(deleteError.message, { status: 500 });
  }

  return Response.json({ ok: true });
}
