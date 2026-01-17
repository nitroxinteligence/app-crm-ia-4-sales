import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const roleSchema = z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);

const createSchema = z.object({
  email: z.string().trim().email(),
  role: roleSchema,
});

const deleteSchema = z.object({
  inviteId: z.string().trim().min(1),
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
  | { membership: { workspace_id: string; role: string }; user: { id: string }; userClient: ReturnType<typeof getUserClient> }
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
  const { membership, userClient } = membershipResult;

  const { data, error: invitesError } = await userClient
    .from("workspace_invites")
    .select("id, email, role, status, token, expires_at, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  if (invitesError) {
    return serverError(invitesError.message);
  }

  return Response.json({ invites: data ?? [] });
}

export async function POST(request: Request) {
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

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: insertError } = await userClient
    .from("workspace_invites")
    .insert({
      workspace_id: membership.workspace_id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      status: "pendente",
      expires_at: expiresAt,
    })
    .select("id, email, role, status, token, expires_at, created_at")
    .maybeSingle();

  if (insertError) {
    return serverError(insertError.message);
  }

  return Response.json({ invite: data });
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
    inviteId: searchParams.get("inviteId") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest("Missing inviteId.");
  }

  const { error: deleteError } = await userClient
    .from("workspace_invites")
    .delete()
    .eq("id", parsed.data.inviteId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return serverError(deleteError.message);
  }

  return Response.json({ ok: true });
}
