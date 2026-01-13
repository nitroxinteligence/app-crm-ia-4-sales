import { NextResponse } from "next/server";

const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

export async function POST(request: Request) {
  if (!baseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
  }

  let body: { agentId?: string; fileId?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  const agentId = body?.agentId;
  const fileId = body?.fileId;

  if (!agentId || !fileId) {
    return new Response("Invalid payload", { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  let response: Response;
  try {
    const url = new URL(`${baseUrl}/agents/${agentId}/knowledge/process`);
    url.searchParams.set("background", "false");
    response = await fetch(
      url.toString(),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ file_id: fileId }),
      }
    );
  } catch {
    return NextResponse.json(
      { status: "pending", reason: "service_unreachable" },
      { status: 202 }
    );
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const mensagem = detalhe
      ? `Agent service error: ${detalhe}`
      : "Agent service error";
    return NextResponse.json({ status: "error", detail: mensagem });
  }

  try {
    const data = await response.json();
    return NextResponse.json(data ?? { status: "processed" });
  } catch {
    return NextResponse.json({ status: "processed" });
  }
}
