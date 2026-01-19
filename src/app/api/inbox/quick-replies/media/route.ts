import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const createSchema = z.object({
  quickReplyId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        tipo: z.string().trim().min(1),
        nome: z.string().trim().min(1),
        mimeType: z.string().trim().optional(),
        tamanhoBytes: z.number().int().optional(),
        storagePath: z.string().trim().min(1),
        ordem: z.number().int().optional(),
      })
    )
    .min(1),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getMembership(userClient: any, userId: string) {
  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .maybeSingle();
  return membership;
}

export async function POST(request: Request) {
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

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { quickReplyId, items } = parsed.data;

  const { data: quickReply, error: quickReplyError } = await userClient
    .from("quick_replies")
    .select("id, workspace_id")
    .eq("id", quickReplyId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (quickReplyError || !quickReply) {
    return badRequest("Quick reply not found.");
  }

  const payload = items.map((item, index) => ({
    workspace_id: membership.workspace_id,
    quick_reply_id: quickReplyId,
    tipo: item.tipo,
    nome: item.nome,
    mime_type: item.mimeType ?? null,
    tamanho_bytes: item.tamanhoBytes ?? null,
    storage_path: item.storagePath,
    ordem: item.ordem ?? index,
  }));

  const { data, error } = await userClient
    .from("quick_reply_media")
    .insert(payload)
    .select("id, tipo, nome, mime_type, tamanho_bytes, storage_path, ordem");

  if (error) {
    return serverError(error.message);
  }

  const media = (data ?? []).map((item) => ({
    id: item.id,
    tipo: item.tipo,
    nome: item.nome,
    mimeType: item.mime_type ?? undefined,
    tamanhoBytes: item.tamanho_bytes ?? undefined,
    storagePath: item.storage_path,
    ordem: item.ordem ?? 0,
  }));

  return Response.json({ media });
}
