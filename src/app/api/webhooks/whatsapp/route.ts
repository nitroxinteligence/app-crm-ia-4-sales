import { createHmac, timingSafeEqual } from "crypto";
import {
  badRequest,
  badGateway,
  forbidden,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const verifyToken = getEnv("WHATSAPP_VERIFY_TOKEN");
const appSecret = getEnv("WHATSAPP_APP_SECRET");
const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY") || undefined;

function isValidSignature(rawBody: string, signatureHeader: string | null) {
  if (!appSecret || !signatureHeader) return false;
  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!verifyToken) {
    return serverError("Missing WHATSAPP_VERIFY_TOKEN");
  }

  if (mode === "subscribe" && token && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return forbidden("Forbidden");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!appSecret) {
    return serverError("Missing WHATSAPP_APP_SECRET");
  }

  if (!isValidSignature(rawBody, signature)) {
    return unauthorized("Invalid signature");
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return badRequest("Invalid payload");
  }

  const { data, error } = await supabaseServer
    .from("webhook_events")
    .insert({
      payload,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error) {
    return serverError("Database error");
  }

  if (!baseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webhooks/whatsapp/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ event_id: data.id }),
    });
  } catch {
    return serviceUnavailable("Agents service unreachable");
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const mensagem = detalhe
      ? `Agent service error: ${detalhe}`
      : "Agent service error";
    return badGateway(mensagem);
  }

  return new Response("OK", { status: 200 });
}
