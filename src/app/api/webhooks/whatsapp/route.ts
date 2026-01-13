import { createHmac, timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

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

  if (mode === "subscribe" && token && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
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
    return new Response("Database error", { status: 500 });
  }

  if (!baseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
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
    return new Response("Agents service unreachable", { status: 503 });
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const mensagem = detalhe
      ? `Agent service error: ${detalhe}`
      : "Agent service error";
    return new Response(mensagem, { status: 502 });
  }

  return new Response("OK", { status: 200 });
}
