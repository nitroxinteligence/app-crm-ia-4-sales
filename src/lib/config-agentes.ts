import { Headset, LifeBuoy, Target, FileText } from "lucide-react";
import type {
  CanalId,
  IdiomaAgente,
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
  { value: "propostas", label: "Vendas" },
];

export const tonsAgente: { value: TomAgente; label: string }[] = [
  { value: "profissional", label: "Profissional" },
  { value: "amigavel", label: "Amigável" },
  { value: "consultivo", label: "Consultivo" },
  { value: "direto", label: "Direto" },
  { value: "outro", label: "Outro" },
];

export const idiomasAgente: { value: IdiomaAgente; label: string }[] = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
];

export const horariosAgente: { value: string; label: string }[] = [
  { value: "comercial", label: "Horário comercial" },
  { value: "24x7", label: "24/7" },
  { value: "personalizado", label: "Outro" },
];

export const canaisDisponiveis: CanalId[] = Object.keys(canaisDetalhes) as CanalId[];

export const permissoesBase: PermissaoAgente[] = [
  { id: "enviar_mensagem", label: "Enviar mensagem", habilitado: true },
  { id: "criar_contato", label: "Criar contato", habilitado: true },
  { id: "editar_contato", label: "Editar contato", habilitado: true },
  { id: "criar_deal", label: "Criar deal", habilitado: true },
  { id: "editar_deal", label: "Editar deal", habilitado: true },
  { id: "mover_etapa", label: "Mover estágios", habilitado: true },
  { id: "aplicar_tag", label: "Aplicar tag", habilitado: true },
  { id: "resolver_conversa", label: "Resolver conversa", habilitado: true },
  { id: "marcar_spam", label: "Marcar como spam", habilitado: true },
  { id: "calendar_criar", label: "Criar eventos", habilitado: true },
  { id: "calendar_editar", label: "Editar eventos", habilitado: true },
  { id: "calendar_cancelar", label: "Cancelar eventos", habilitado: true },
  { id: "calendar_consultar", label: "Consultar eventos", habilitado: true },
  { id: "calendar_disponibilidade", label: "Consultar disponibilidade", habilitado: true },
];

export const templatesAgente: {
  id: TipoAgente;
  nome: string;
  descricao: string;
  icone: typeof Target;
}[] = [
  {
    id: "sdr",
    nome: "SDR",
    descricao: "Qualificação de leads e follow-ups comerciais.",
    icone: Target,
  },
  {
    id: "atendimento",
    nome: "Atendimento",
    descricao: "Triagem e respostas rápidas em canais omnichannel.",
    icone: Headset,
  },
  {
    id: "suporte",
    nome: "Suporte",
    descricao: "Resolução de duvidas e suporte técnico.",
    icone: LifeBuoy,
  },
  {
    id: "propostas",
    nome: "Vendas",
    descricao: "Conversas comerciais e fechamento de vendas.",
    icone: FileText,
  },
];

export const statusBadge: Record<
  StatusAgente,
  { label: string; variant: "secondary" | "outline" }
> = {
  ativo: { label: "Ativo", variant: "secondary" },
  pausado: { label: "Pausado", variant: "outline" },
};
