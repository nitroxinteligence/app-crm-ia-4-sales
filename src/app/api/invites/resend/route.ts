import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
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

async function getMembership(request: Request) {
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

  const { data: membership, error: membershipError } = await userClient
    .from("workspace_members")
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  return { user, membership, userClient };
}

export async function POST(request: Request) {
  const membershipResult = await getMembership(request);
  if (membershipResult instanceof Response) {
    return membershipResult;
  }
  const { membership, userClient } = membershipResult;

  if (membership.role !== "ADMIN") {
    return forbidden("Forbidden.");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { inviteId } = parsed.data;

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
    if (updateError) {
      return badRequest(updateError.message);
    }
    return notFound("Invite not found.");
  }

  return Response.json({ invite: data });
}
