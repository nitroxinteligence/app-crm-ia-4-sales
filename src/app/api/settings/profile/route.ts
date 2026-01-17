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
    nome: z.string().trim().min(1).optional(),
    avatarUrl: z.string().trim().optional().nullable(),
    idioma: z.enum(["pt-BR", "en-US"]).optional(),
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

type UserResult =
  | { user: { id: string }; userClient: ReturnType<typeof getUserClient> }
  | { error: { status: 401 | 500; message: string } };

async function getUser(request: Request): Promise<UserResult> {
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
  return { user, userClient };
}

export async function GET(request: Request) {
  const userResult = await getUser(request);
  if ("error" in userResult) {
    if (userResult.error.status === 401) {
      return unauthorized(userResult.error.message);
    }
    return serverError(userResult.error.message);
  }
  const { user, userClient } = userResult;

  const { data, error: profileError } = await userClient
    .from("profiles")
    .select("user_id, nome, email, avatar_url, idioma")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return serverError(profileError.message);
  }

  return Response.json({ profile: data });
}

export async function PATCH(request: Request) {
  const userResult = await getUser(request);
  if ("error" in userResult) {
    if (userResult.error.status === 401) {
      return unauthorized(userResult.error.message);
    }
    return serverError(userResult.error.message);
  }
  const { user, userClient } = userResult;

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const updates: Record<string, string | null> = {};
  if (parsed.data.nome) updates.nome = parsed.data.nome;
  if ("avatarUrl" in parsed.data) {
    updates.avatar_url = parsed.data.avatarUrl?.trim() || null;
  }
  if (parsed.data.idioma) updates.idioma = parsed.data.idioma;

  const { data, error: updateError } = await userClient
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select("user_id, nome, email, avatar_url, idioma")
    .maybeSingle();

  if (updateError) {
    return serverError(updateError.message);
  }

  return Response.json({ profile: data });
}
