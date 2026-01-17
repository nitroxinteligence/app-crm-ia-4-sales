import { z } from "zod";
import {
  badGateway,
  badRequest,
  serverError,
  serviceUnavailable,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY") || undefined;

const payloadSchema = z.object({
  eventId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!baseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Missing eventId");
  }
  const { eventId } = parsed.data;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webhooks/whatsapp/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ event_id: eventId }),
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
