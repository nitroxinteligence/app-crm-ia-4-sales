type R2Action = "upload" | "download" | "delete";

type R2SignedUrlPayload = {
  action: R2Action;
  bucket: string;
  key: string;
  contentType?: string;
  expiresIn?: number;
  scopeId?: string;
};

type R2SignedUrlResponse = {
  url?: string;
  error?: string;
};

export async function getR2SignedUrl(
  token: string,
  payload: R2SignedUrlPayload
) {
  const response = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Falha ao gerar URL.");
  }

  const data = (await response.json()) as R2SignedUrlResponse;
  if (!data?.url) {
    throw new Error(data?.error || "URL nao gerada.");
  }
  return data.url;
}

export async function uploadFileToR2(params: {
  token: string;
  bucket: string;
  key: string;
  file: File;
  scopeId?: string;
}) {
  const uploadUrl = await getR2SignedUrl(params.token, {
    action: "upload",
    bucket: params.bucket,
    key: params.key,
    contentType: params.file.type || undefined,
    scopeId: params.scopeId,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.file.type || "application/octet-stream",
    },
    body: params.file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar arquivo.");
  }
}

export async function deleteR2Object(params: {
  token: string;
  bucket: string;
  key: string;
  scopeId?: string;
}) {
  const response = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "delete",
      bucket: params.bucket,
      key: params.key,
      scopeId: params.scopeId,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Falha ao remover arquivo.");
  }
}
