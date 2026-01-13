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
  const { user, membership, userClient, error } = await getMembership(request);
  if (!user || !membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { data: membros, error: membrosError } = await userClient
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: true });

  if (membrosError) {
    return new Response(membrosError.message, { status: 500 });
  }

  const userIds = (membros ?? []).map((item) => item.user_id);
  const { data: perfis, error: perfisError } = await userClient
    .from("profiles")
    .select("user_id, nome, email, avatar_url")
    .in("user_id", userIds);

  if (perfisError) {
    return new Response(perfisError.message, { status: 500 });
  }

  const perfilMap = new Map(
    (perfis ?? []).map((perfil) => [perfil.user_id, perfil])
  );

  const members = (membros ?? []).map((membro) => {
    const perfil = perfilMap.get(membro.user_id);
    return {
      id: membro.id,
      userId: membro.user_id,
      nome: perfil?.nome ?? "Usuário",
      email: perfil?.email ?? "",
      avatarUrl: perfil?.avatar_url ?? null,
      role: membro.role as Role,
      criadoEm: membro.created_at,
      atual: membro.user_id === user.id,
    };
  });

  return Response.json({
    members,
    currentRole: membership.role,
  });
}

export async function PATCH(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const memberId = body?.memberId as string | undefined;
  const role = body?.role as Role | undefined;

  if (!memberId || !role) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { data, error: updateError } = await userClient
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .eq("workspace_id", membership.workspace_id)
    .select("id, user_id, role")
    .maybeSingle();

  if (updateError) {
    return new Response(updateError.message, { status: 500 });
  }

  return Response.json({ member: data });
}

export async function DELETE(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) {
    return new Response("Missing memberId", { status: 400 });
  }

  const { error: deleteError } = await userClient
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return new Response(deleteError.message, { status: 500 });
  }

  return Response.json({ ok: true });
}
