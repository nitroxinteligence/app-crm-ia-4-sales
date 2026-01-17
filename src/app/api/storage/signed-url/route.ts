import { createClient } from "@supabase/supabase-js";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildR2Key,
  getR2Client,
  isBucketAllowed,
  resolveBucket,
  stripR2Prefix,
} from "@/lib/r2/server";
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
  action: z.enum(["upload", "download", "delete"]).optional(),
  bucket: z.string().trim().min(1),
  key: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
  expiresIn: z.number().int().optional(),
  scopeId: z.string().trim().optional(),
});

type SignedUrlPayload = {
  action?: "upload" | "download" | "delete";
  bucket?: string;
  key?: string;
  contentType?: string;
  expiresIn?: number;
  scopeId?: string;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isKeyAllowed(params: {
  bucket: string;
  key: string;
  workspaceId: string;
  userId: string;
  scopeId?: string;
}) {
  if (params.bucket === "user-avatars") {
    return params.key.startsWith(`${params.userId}/`);
  }

  if (params.bucket === "agent-knowledge") {
    if (!params.scopeId) return false;
    return params.key.startsWith(`${params.scopeId}/`);
  }

  return params.key.startsWith(`${params.workspaceId}/`);
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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const body = parsed.data as SignedUrlPayload;
  const action = body.action ?? "download";
  const bucketAlias = body.bucket?.trim() ?? "";
  const key = body.key?.trim() ?? "";

  if (!isBucketAllowed(bucketAlias)) {
    return forbidden("Bucket nao permitido.");
  }

  const keyForAuth = stripR2Prefix(bucketAlias, key);
  if (
    !isKeyAllowed({
      bucket: bucketAlias,
      key: keyForAuth,
      workspaceId: membership.workspace_id,
      userId: user.id,
      scopeId: body.scopeId,
    })
  ) {
    return forbidden("Chave nao permitida.");
  }

  const bucketName = resolveBucket(bucketAlias);
  if (!bucketName) {
    return badRequest("Bucket invalido.");
  }

  const objectKey = buildR2Key(bucketAlias, key);

  let client;
  try {
    client = getR2Client();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "R2 not configured.";
    return serverError(detail);
  }

  if (action === "delete") {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      })
    );
    return Response.json({ ok: true });
  }

  const expiresIn = Math.min(Math.max(body.expiresIn ?? 3600, 60), 604800);

  const command =
    action === "upload"
      ? new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          ContentType: body.contentType || undefined,
        })
      : new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  return Response.json({ url: signedUrl });
}
