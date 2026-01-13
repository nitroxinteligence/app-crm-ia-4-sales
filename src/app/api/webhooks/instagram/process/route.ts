export const runtime = "nodejs";

const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

export async function POST(request: Request) {
  if (!baseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
  }

  const { eventId } = await request.json();
  if (!eventId) {
    return new Response("Missing eventId", { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webhooks/instagram/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ event_id: eventId }),
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
