import "server-only";
import { getEnv } from "@/lib/config";

type DispararAgenteParams = {
  agentId: string;
  conversationId: string;
};

const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY") || undefined;

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
