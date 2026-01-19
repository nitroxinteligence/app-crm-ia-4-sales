export type QuickReplyMediaFile = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type QuickReplyMedia = {
  anexos?: QuickReplyMediaFile[];
  audio?: QuickReplyMediaFile | null;
};

const STORAGE_KEY = "vpcrm_quick_reply_media";

export const lerQuickReplyMediaMap = (): Record<string, QuickReplyMedia> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, QuickReplyMedia>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

export const salvarQuickReplyMedia = (
  id: string,
  media: QuickReplyMedia | null
) => {
  if (typeof window === "undefined") return;
  const atual = lerQuickReplyMediaMap();
  if (!media || (!media.anexos?.length && !media.audio)) {
    delete atual[id];
  } else {
    atual[id] = media;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
};

export const removerQuickReplyMedia = (id: string) => {
  if (typeof window === "undefined") return;
  const atual = lerQuickReplyMediaMap();
  delete atual[id];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
};

export const mergeQuickRepliesWithMedia = <T extends { id: string }>(
  replies: T[]
) => {
  const mediaMap = lerQuickReplyMediaMap();
  return replies.map((reply) => ({
    ...reply,
    media: mediaMap[reply.id] ?? undefined,
  }));
};

export const dataUrlToFile = (
  dataUrl: string,
  filename: string,
  fallbackType = "application/octet-stream"
) => {
  const [header, base64] = dataUrl.split(",");
  const match = header?.match(/data:(.*?);base64/);
  const mime = match?.[1] || fallbackType;
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
};

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
