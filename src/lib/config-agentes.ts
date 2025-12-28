import { Bot, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import type {
  CanalId,
  IdiomaAgente,
  ModoAgente,
  StatusAgente,
  TipoAgente,
  TomAgente,
} from "@/lib/types";
import { canaisDetalhes } from "@/lib/canais";

export type PermissaoAgente = {
  id: string;
  label: string;
  habilitado: boolean;
  bloqueado?: boolean;
};

export const tiposAgente: { value: TipoAgente; label: string }[] = [
  { value: "sdr", label: "SDR" },
  { value: "atendimento", label: "Atendimento" },
  { value: "suporte", label: "Suporte" },
  { value: "copiloto", label: "Copiloto" },
  { value: "propostas", label: "Propostas" },
  { value: "voice", label: "Voice" },
];

export const tonsAgente: { value: TomAgente; label: string }[] = [
  { value: "profissional", label: "Profissional" },
  { value: "amigavel", label: "Amigável" },
  { value: "consultivo", label: "Consultivo" },
  { value: "direto", label: "Direto" },
];

export const idiomasAgente: { value: IdiomaAgente; label: string }[] = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
];

export const horariosAgente: { value: string; label: string }[] = [
  { value: "comercial", label: "Horário comercial" },
  { value: "24x7", label: "24/7" },
  { value: "personalizado", label: "Personalizado" },
];

export const modosAgente: { value: ModoAgente; label: string }[] = [
  { value: "autonomo", label: "Autônomo" },
  { value: "assistido", label: "Assistido" },
  { value: "rascunho", label: "Somente rascunho" },
];

export const canaisDisponiveis: CanalId[] = Object.keys(canaisDetalhes) as CanalId[];

export const permissoesBase: PermissaoAgente[] = [
  { id: "enviarMensagem", label: "Enviar mensagem", habilitado: true },
  { id: "criarEditarLead", label: "Criar/editar lead", habilitado: true },
  { id: "criarEditarDeal", label: "Criar/editar deal", habilitado: true },
  { id: "moverEtapa", label: "Mover etapa", habilitado: true },
  { id: "criarTicket", label: "Criar ticket", habilitado: true },
  { id: "criarTarefa", label: "Criar tarefa", habilitado: false, bloqueado: true },
  { id: "enviarEmail", label: "Enviar email", habilitado: true },
  { id: "usarTemplateWhatsapp", label: "Usar template WhatsApp", habilitado: true },
  { id: "transferirHumano", label: "Transferir para humano", habilitado: true },
  { id: "bloquearContato", label: "Bloquear contato", habilitado: false, bloqueado: true },
  { id: "excluir", label: "Excluir registros", habilitado: false, bloqueado: true },
];

export const templatesAgente: {
  id: TipoAgente;
  nome: string;
  descricao: string;
  icone: typeof Bot;
}[] = [
  {
    id: "sdr",
    nome: "SDR",
    descricao: "Qualificação de leads e follow-ups comerciais.",
    icone: Sparkles,
  },
  {
    id: "atendimento",
    nome: "Atendimento",
    descricao: "Triagem e respostas rápidas em canais omnichannel.",
    icone: MessageSquare,
  },
  {
    id: "suporte",
    nome: "Suporte",
    descricao: "Resolução de tickets e suporte técnico.",
    icone: Wand2,
  },
  {
    id: "copiloto",
    nome: "Copiloto",
    descricao: "Apoio para times de vendas com insights e sugestões.",
    icone: Bot,
  },
  {
    id: "propostas",
    nome: "Propostas",
    descricao: "Geração de propostas e respostas comerciais.",
    icone: Sparkles,
  },
  {
    id: "voice",
    nome: "Voice",
    descricao: "Atendimento por voz e transcrição automática.",
    icone: MessageSquare,
  },
];

export const statusBadge: Record<
  StatusAgente,
  { label: string; variant: "secondary" | "outline" }
> = {
  ativo: { label: "Ativo", variant: "secondary" },
  pausado: { label: "Pausado", variant: "outline" },
};
