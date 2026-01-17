import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const updateSchema = z
  .object({
    mascarar_viewer: z.boolean().optional(),
    retencao_dias: z.number().int().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No changes provided",
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
  | { membership: { workspace_id: string }; userClient: ReturnType<typeof getUserClient> }
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

  return { membership, userClient };
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

  const { data, error: settingsError } = await userClient
    .from("workspace_settings")
    .select("workspace_id, mascarar_viewer, retencao_dias")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (settingsError) {
    return serverError(settingsError.message);
  }

  return Response.json({
    settings: data ?? {
      workspace_id: membership.workspace_id,
      mascarar_viewer: true,
      retencao_dias: 365,
    },
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

  const updates: Record<string, unknown> = { ...parsed.data };

  const { data, error: updateError } = await userClient
    .from("workspace_settings")
    .upsert({
      workspace_id: membership.workspace_id,
      ...updates,
    })
    .select("workspace_id, mascarar_viewer, retencao_dias")
    .maybeSingle();

  if (updateError) {
    return serverError(updateError.message);
  }

  return Response.json({ settings: data });
}
