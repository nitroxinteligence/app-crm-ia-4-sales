import type { CanalId } from "@/lib/types";

export type IntegracaoId =
  | "whatsapp_oficial"
  | "whatsapp_baileys"
  | "instagram";

export type IntegracaoCanal = {
  id: IntegracaoId;
  canalIcone: CanalId;
  titulo: string;
  tituloEn: string;
  descricao: string;
  descricaoEn: string;
  recursos: string[];
  recursosEn: string[];
  conta?: {
    nome: string;
    identificador: string;
    responsavel: string;
    ultimaSincronizacao: string;
  };
};

export const integracoesDisponiveis: IntegracaoCanal[] = [
  {
    id: "whatsapp_oficial",
    canalIcone: "whatsapp",
    titulo: "WhatsApp Business Oficial",
    tituloEn: "Official WhatsApp Business",
    descricao: "Atenda clientes com a API oficial e filas inteligentes.",
    descricaoEn: "Support customers with the official API and smart queues.",
    recursos: ["Cloud API", "Templates aprovados", "Roteamento por time"],
    recursosEn: ["Cloud API", "Approved templates", "Team routing"],
    conta: {
      nome: "VP Atendimento",
      identificador: "WABA-9034",
      responsavel: "Mariana Souza",
      ultimaSincronizacao: "Hoje, 09:32",
    },
  },
  {
    id: "whatsapp_baileys",
    canalIcone: "whatsapp",
    titulo: "WhatsApp (API não oficial)",
    tituloEn: "WhatsApp (Unofficial API)",
    descricao: "Conecte via QR Code e traga o histórico recente.",
    descricaoEn: "Connect via QR Code and load recent history.",
    recursos: ["QRCode", "Histórico 14 dias", "Midias e documentos"],
    recursosEn: ["QR Code", "14-day history", "Media & documents"],
  },
  {
    id: "instagram",
    canalIcone: "instagram",
    titulo: "Instagram Direct",
    tituloEn: "Instagram Direct",
    descricao: "Centralize DMs e comentários em um único painel.",
    descricaoEn: "Centralize DMs and comments in a single workspace.",
    recursos: ["Inbox unificado", "Etiquetas automáticas", "Distribuição por fila"],
    recursosEn: ["Unified inbox", "Automatic labels", "Queue distribution"],
    conta: {
      nome: "@verticalpartners",
      identificador: "IG-2201",
      responsavel: "Equipe Social",
      ultimaSincronizacao: "Hoje, 08:10",
    },
  },
];
