import { NextResponse } from "next/server";

const baseUrl = process.env.AGENTS_API_URL ?? "";
const apiKey = process.env.AGENTS_API_KEY;

export async function POST(request: Request) {
  if (!baseUrl) {
    return new Response("Missing AGENTS_API_URL", { status: 500 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const url = new URL(request.url);
    const agentIdParam = url.searchParams.get("agentId");
    if (agentIdParam && request.body) {
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
        return new Response("Agent service error", { status: 502 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    const form = await request.formData();
    const agentId = (agentIdParam || form.get("agentId")?.toString()) ?? "";

    if (!agentId) {
      return new Response("Invalid payload", { status: 400 });
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
      return new Response("Agent service error", { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  }

  const body = await request.json();
  const agentId = body?.agentId;
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const inputText = body?.inputText as string | undefined;

  if (!agentId || (!messages.length && !inputText)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const payload = messages.length ? { messages } : { input_text: inputText };
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
    return new Response("Agent service error", { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
