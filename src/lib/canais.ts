import type { CanalId } from "@/lib/types";

export const canaisDetalhes: Record<CanalId, { nome: string }> = {
  whatsapp: { nome: "WhatsApp" },
  instagram: { nome: "Instagram" },
  messenger: { nome: "Messenger" },
  email: { nome: "Email" },
  linkedin: { nome: "LinkedIn" },
};

export function nomeCanal(canal: CanalId): string {
  return canaisDetalhes[canal]?.nome ?? canal;
}
