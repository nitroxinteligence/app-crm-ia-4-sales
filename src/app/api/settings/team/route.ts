import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const roleSchema = z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);

const updateSchema = z.object({
  memberId: z.string().trim().min(1),
  role: roleSchema,
});

const deleteSchema = z.object({
  memberId: z.string().trim().min(1),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type MembershipResult =
  | { user: { id: string }; membership: { workspace_id: string; role: string }; userClient: NonNullable<ReturnType<typeof getUserClient>> }
  | { error: { status: 400 | 401 | 500; message: string } };

async function getMembership(request: Request): Promise<MembershipResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: { status: 500, message: "Missing Supabase env vars." } };
  }
  const userClient = getUserClient(request);
  if (!userClient) {
    return { error: { status: 401, message: "Missing auth header." } };
  }
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: { status: 401, message: "Invalid auth." } };
  }

  const { data: membership, error: membershipError } = await userClient
    .from("workspace_members")
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { error: { status: 400, message: "Workspace not found." } };
  }

  return { user, membership, userClient };
}

export async function GET(request: Request) {
  const membershipResult = await getMembership(request);
  if ("error" in membershipResult) {
    if (membershipResult.error.status === 400) {
      return badRequest(membershipResult.error.message);
    }
    if (membershipResult.error.status === 401) {
      return unauthorized(membershipResult.error.message);
    }
    return serverError(membershipResult.error.message);
  }
  const { user, membership, userClient } = membershipResult;

  const { data: membros, error: membrosError } = await userClient
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: true });

  if (membrosError) {
    return serverError(membrosError.message);
  }

  const userIds = (membros ?? []).map((item) => item.user_id);
  const { data: perfis, error: perfisError } = await userClient
    .from("profiles")
    .select("user_id, nome, email, avatar_url")
    .in("user_id", userIds);

  if (perfisError) {
    return serverError(perfisError.message);
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
      role: membro.role,
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
  const membershipResult = await getMembership(request);
  if ("error" in membershipResult) {
    if (membershipResult.error.status === 400) {
      return badRequest(membershipResult.error.message);
    }
    if (membershipResult.error.status === 401) {
      return unauthorized(membershipResult.error.message);
    }
    return serverError(membershipResult.error.message);
  }
  const { membership, userClient } = membershipResult;

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const { data, error: updateError } = await userClient
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", membership.workspace_id)
    .select("id, user_id, role")
    .maybeSingle();

  if (updateError) {
    return serverError(updateError.message);
  }

  return Response.json({ member: data });
}

export async function DELETE(request: Request) {
  const membershipResult = await getMembership(request);
  if ("error" in membershipResult) {
    if (membershipResult.error.status === 400) {
      return badRequest(membershipResult.error.message);
    }
    if (membershipResult.error.status === 401) {
      return unauthorized(membershipResult.error.message);
    }
    return serverError(membershipResult.error.message);
  }
  const { membership, userClient } = membershipResult;

  const { searchParams } = new URL(request.url);
  const parsed = deleteSchema.safeParse({
    memberId: searchParams.get("memberId") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest("Missing memberId.");
  }

  const { error: deleteError } = await userClient
    .from("workspace_members")
    .delete()
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return serverError(deleteError.message);
  }

  return Response.json({ ok: true });
}
