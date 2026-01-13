import { NextResponse } from "next/server";

const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

export async function POST(request: Request) {
  if (!baseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
  }

  let body: { workspaceId?: string; integrationAccountId?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const workspaceId = body?.workspaceId;
  const integrationAccountId = body?.integrationAccountId;
  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

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
    return new Response("Agents service unreachable", { status: 503 });
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const mensagem = detalhe
      ? `Agent service error: ${detalhe}`
      : "Agent service error";
    return new Response(mensagem, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
