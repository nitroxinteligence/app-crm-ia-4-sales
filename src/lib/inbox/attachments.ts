export type AttachmentKind = "imagem" | "pdf" | "audio"

export type AttachmentMeta = {
  file: File
  tipo: AttachmentKind
  whatsappType: "image" | "document" | "audio"
  mimeType: string
}

export const normalizeMimeType = (mimeType: string) =>
  mimeType.split(";")[0]?.trim() || mimeType

export const mapFileToAttachment = (file: File): AttachmentMeta | null => {
  const mimeType = normalizeMimeType(file.type || "")
  if (mimeType.startsWith("image/")) {
    return { file, tipo: "imagem", whatsappType: "image", mimeType }
  }
  if (
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return { file, tipo: "pdf", whatsappType: "document", mimeType }
  }
  if (mimeType.startsWith("audio/")) {
    return { file, tipo: "audio", whatsappType: "audio", mimeType }
  }
  return null
}

export const sanitizarNomeArquivo = (nome: string) =>
  nome
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
