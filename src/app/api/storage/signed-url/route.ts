import { createClient } from "@supabase/supabase-js";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildR2Key,
  getR2Client,
  isBucketAllowed,
  resolveBucket,
  stripR2Prefix,
} from "@/lib/r2/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const body = (await request.json()) as SignedUrlPayload;
  const action = body?.action ?? "download";
  const bucketAlias = body?.bucket?.trim() ?? "";
  const key = body?.key?.trim() ?? "";

  if (!bucketAlias || !key) {
    return new Response("Invalid payload.", { status: 400 });
  }

  if (!["upload", "download", "delete"].includes(action)) {
    return new Response("Acao invalida.", { status: 400 });
  }

  if (!isBucketAllowed(bucketAlias)) {
    return new Response("Bucket nao permitido.", { status: 403 });
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
    return new Response("Chave nao permitida.", { status: 403 });
  }

  const bucketName = resolveBucket(bucketAlias);
  if (!bucketName) {
    return new Response("Bucket invalido.", { status: 400 });
  }

  const objectKey = buildR2Key(bucketAlias, key);

  let client;
  try {
    client = getR2Client();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "R2 not configured.";
    return new Response(detail, { status: 500 });
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
