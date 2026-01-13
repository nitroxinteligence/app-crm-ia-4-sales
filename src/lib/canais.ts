import type { CanalId } from "@/lib/types";

export const canaisDetalhes: Record<CanalId, { nome: string }> = {
  whatsapp: { nome: "WhatsApp" },
  instagram: { nome: "Instagram" },
};

export function nomeCanal(canal: CanalId): string {
  return canaisDetalhes[canal]?.nome ?? canal;
}
