import { z } from "zod";
import { badGateway, badRequest, serverError } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY");

const payloadSchema = z.object({
  agentId: z.string().trim().min(1),
  fileId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!baseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload");
  }
  const { agentId, fileId } = parsed.data;

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
    return Response.json(
      { status: "pending", reason: "service_unreachable" },
      { status: 202 }
    );
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    const mensagem = detalhe
      ? `Agent service error: ${detalhe}`
      : "Agent service error";
    return badGateway(mensagem);
  }

  try {
    const data = await response.json();
    return Response.json(data ?? { status: "processed" });
  } catch {
    return Response.json({ status: "processed" });
  }
}
