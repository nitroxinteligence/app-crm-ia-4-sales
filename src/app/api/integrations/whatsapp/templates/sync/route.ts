import { z } from "zod";
import { NextResponse } from "next/server";
import {
  badGateway,
  badRequest,
  serverError,
  serviceUnavailable,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY") || undefined;

const payloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  integrationAccountId: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  if (!baseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Missing workspaceId");
  }
  const { workspaceId, integrationAccountId } = parsed.data;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/integrations/whatsapp/templates/sync?background=true`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspace_id: workspaceId,
          integration_account_id: integrationAccountId,
        }),
      }
    );
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

  const data = await response.json();
  return NextResponse.json(data);
}
