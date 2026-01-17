import { z } from "zod";
import {
  badGateway,
  badRequest,
  serverError,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

const baseUrl = getEnv("AGENTS_API_URL");
const apiKey = getEnv("AGENTS_API_KEY");

const agentIdSchema = z.string().trim().min(1);

const jsonSchema = z
  .object({
    agentId: z.string().trim().min(1),
    messages: z.array(z.unknown()).optional(),
    inputText: z.string().trim().min(1).optional(),
  })
  .refine((data) => (data.messages?.length ?? 0) > 0 || data.inputText, {
    message: "Invalid payload",
  });

export async function POST(request: Request) {
  if (!baseUrl) {
    return serverError("Missing AGENTS_API_URL");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const url = new URL(request.url);
    const agentIdParam = url.searchParams.get("agentId");
    if (agentIdParam && request.body) {
      const parsedAgent = agentIdSchema.safeParse(agentIdParam);
      if (!parsedAgent.success) {
        return badRequest("Invalid payload");
      }
      const headers: Record<string, string> = {
        "Content-Type": contentType,
      };
      if (apiKey) {
        headers["X-Agents-Key"] = apiKey;
      }
      const response = await fetch(`${baseUrl}/agents/${agentIdParam}/sandbox`, {
        method: "POST",
        headers,
        body: request.body,
        duplex: "half",
      } as RequestInit);

      if (!response.ok) {
        return badGateway("Agent service error");
      }

      const data = await response.json();
      return Response.json(data);
    }

    const form = await request.formData();
    const agentId = (agentIdParam || form.get("agentId")?.toString()) ?? "";
    const parsedAgent = agentIdSchema.safeParse(agentId);

    if (!parsedAgent.success) {
      return badRequest("Invalid payload");
    }

    const payload = new FormData();
    let totalArquivos = 0;
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        payload.append(key, value);
        continue;
      }
      if (value && typeof (value as Blob).arrayBuffer === "function") {
        const fileValue = value as File;
        const nome = fileValue.name || `upload-${totalArquivos}`;
        const bytes = await fileValue.arrayBuffer();
        const blob = new Blob([bytes], {
          type: fileValue.type || "application/octet-stream",
        });
        payload.append(key, blob, nome);
        totalArquivos += 1;
      }
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["X-Agents-Key"] = apiKey;
    }
    const response = await fetch(`${baseUrl}/agents/${agentId}/sandbox`, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      return badGateway("Agent service error");
    }

    const data = await response.json();
    return Response.json(data);
  }

  const parsed = await parseJsonBody(request, jsonSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload");
  }
  const { agentId, messages, inputText } = parsed.data;

  const payload = (messages?.length ?? 0) > 0 ? { messages } : { input_text: inputText };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["X-Agents-Key"] = apiKey;
  }

  const response = await fetch(`${baseUrl}/agents/${agentId}/sandbox`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return badGateway("Agent service error");
  }

  const data = await response.json();
  return Response.json(data);
}
