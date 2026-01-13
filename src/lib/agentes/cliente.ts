import "server-only";

type DispararAgenteParams = {
  agentId: string;
  conversationId: string;
};

const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

export async function dispararAgenteWhatsApp({
  agentId,
  conversationId,
}: DispararAgenteParams) {
  if (!baseUrl) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  await fetch(`${baseUrl}/agents/${agentId}/run?background=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}
