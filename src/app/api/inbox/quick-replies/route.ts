import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { buildR2Key, getR2Client, resolveBucket } from "@/lib/r2/server";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const createSchema = z.object({
  titulo: z.string().trim().min(1),
  atalho: z.string().trim().regex(/^\/\S+$/),
  conteudo: z.string().trim().min(1),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
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

export async function GET(request: Request) {
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

  const { data, error } = await userClient
    .from("quick_replies")
    .select(
      "id, titulo, atalho, conteudo, quick_reply_media (id, tipo, nome, mime_type, tamanho_bytes, storage_path, ordem)"
    )
    .eq("workspace_id", membership.workspace_id)
    .order("titulo", { ascending: true });

  if (error) {
    return serverError(error.message);
  }

  const quickReplies =
    data?.map((item: any) => {
      const mediaItems = (item.quick_reply_media ?? []) as Array<{
        id: string;
        tipo: string;
        nome: string;
        mime_type: string | null;
        tamanho_bytes: number | null;
        storage_path: string;
        ordem: number | null;
      }>;
      const sorted = [...mediaItems].sort(
        (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
      );
      const audio = sorted.find((media) => media.tipo === "audio") ?? null;
      const anexos = sorted.filter((media) => media.tipo !== "audio");
      return {
        id: item.id,
        titulo: item.titulo,
        atalho: item.atalho,
        conteudo: item.conteudo,
        media: {
          anexos: anexos.map((media) => ({
            id: media.id,
            tipo: media.tipo,
            nome: media.nome,
            mimeType: media.mime_type ?? undefined,
            tamanhoBytes: media.tamanho_bytes ?? undefined,
            storagePath: media.storage_path,
            ordem: media.ordem ?? 0,
          })),
          audio: audio
            ? {
              id: audio.id,
              tipo: audio.tipo,
              nome: audio.nome,
              mimeType: audio.mime_type ?? undefined,
              tamanhoBytes: audio.tamanho_bytes ?? undefined,
              storagePath: audio.storage_path,
              ordem: audio.ordem ?? 0,
            }
            : null,
        },
      };
    }) ?? [];

  return Response.json({ quickReplies });
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
  const { titulo, conteudo, atalho } = parsed.data;

  const { data, error } = await userClient
    .from("quick_replies")
    .insert({
      workspace_id: membership.workspace_id,
      titulo,
      atalho,
      conteudo,
    })
    .select("id, titulo, atalho, conteudo")
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "Failed to create quick reply.");
  }

  return Response.json({ quickReply: data });
}

export async function DELETE(request: Request) {
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

  const parsed = await parseJsonBody(request, deleteSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { id } = parsed.data;

  const { data: mediaItems } = await userClient
    .from("quick_reply_media")
    .select("storage_path")
    .eq("workspace_id", membership.workspace_id)
    .eq("quick_reply_id", id);

  if (mediaItems?.length) {
    const bucketName = resolveBucket("inbox-attachments");
    if (!bucketName) {
      return serverError("Bucket invalido.");
    }
    let client;
    try {
      client = getR2Client();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "R2 not configured.";
      return serverError(detail);
    }

    for (const media of mediaItems) {
      const storagePath = String(media.storage_path || "");
      if (!storagePath) continue;
      const objectKey = buildR2Key("inbox-attachments", storagePath);
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          })
        );
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Falha ao remover arquivo.";
        return serverError(detail);
      }
    }
  }

  const { error } = await userClient
    .from("quick_replies")
    .delete()
    .eq("workspace_id", membership.workspace_id)
    .eq("id", id);

  if (error) {
    return serverError(error.message);
  }

  return new Response(null, { status: 204 });
}

const updateSchema = z.object({
  id: z.string().trim().min(1),
  titulo: z.string().trim().min(1),
  atalho: z.string().trim().regex(/^\/\S+$/),
  conteudo: z.string().trim().min(1),
});

export async function PUT(request: Request) {
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

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { id, titulo, conteudo, atalho } = parsed.data;

  // Verify ownership/workspace match
  const { data: existing } = await userClient
    .from("quick_replies")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", membership.workspace_id)
    .single();

  if (!existing) {
    return badRequest("Quick reply not found or access denied.");
  }

  const { data, error } = await userClient
    .from("quick_replies")
    .update({
      titulo,
      atalho,
      conteudo,
    })
    .eq("id", id)
    .select("id, titulo, atalho, conteudo")
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "Failed to update quick reply.");
  }

  return Response.json({ quickReply: data });
}
