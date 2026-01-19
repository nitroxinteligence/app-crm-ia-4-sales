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
    id: "whatsapp_baileys",
    canalIcone: "whatsapp",
    titulo: "WhatsApp (API não oficial)",
    tituloEn: "WhatsApp (Unofficial API)",
    descricao: "Conecte por QR Code, veja suas mensagens e conecte o seu Agente de IA.",
    descricaoEn: "Connect via QR Code, see your messages and connect your AI Agent.",
    recursos: ["QRCode", "Histórico 14 dias", "Midias e documentos"],
    recursosEn: ["QR Code", "14-day history", "Media & documents"],
  },
  {
    id: "whatsapp_oficial",
    canalIcone: "whatsapp",
    titulo: "WhatsApp Business Oficial",
    tituloEn: "Official WhatsApp Business",
    descricao: "Atenda clientes com Agente de IA, API oficial e filas inteligentes.",
    descricaoEn: "Support customers with AI Agent, official API and smart queues.",
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
    id: "instagram",
    canalIcone: "instagram",
    titulo: "Instagram Direct",
    tituloEn: "Instagram Direct",
    descricao: "Centralize DMs em um único inbox.",
    descricaoEn: "Centralize DMs in a single inbox.",
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
