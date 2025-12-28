import type { AcaoRapida, AlertaPainel, KPI, SerieGrafico } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/formatadores";

export const kpisPainel: KPI[] = [
  {
    id: "kpi-leads",
    titulo: "Leads hoje / 7d",
    valor: `${formatarNumero(128)} / ${formatarNumero(912)}`,
    delta: "+12%",
    descricao: "Leads criados no período",
  },
  {
    id: "kpi-qualificados",
    titulo: "Qualificados vs desqualificados",
    valor: `${formatarNumero(86)} / ${formatarNumero(42)}`,
    delta: "+6%",
    descricao: "Últimos 7 dias",
  },
  {
    id: "kpi-conversas",
    titulo: "Conversas ativas",
    valor: formatarNumero(64),
    delta: "+4%",
    descricao: "Conversas em andamento",
  },
  {
    id: "kpi-conversao",
    titulo: "Taxa de conversão",
    valor: "32%",
    delta: "+3%",
    descricao: "Últimos 30 dias",
  },
];

export const seriesFunil: SerieGrafico = {
  id: "funil",
  titulo: "Funil por etapa",
  valores: [120, 96, 78, 42, 18],
};

export const seriesCanais: SerieGrafico = {
  id: "canais",
  titulo: "Resultado por canal",
  valores: [48, 62, 34, 28, 18],
};

export const seriesTendencia: SerieGrafico = {
  id: "tendencia",
  titulo: "Tendência 7/30 dias",
  valores: [12, 18, 14, 22, 26, 24, 30],
};

export const alertasPainel: AlertaPainel[] = [
  {
    id: "alerta-resposta",
    titulo: "Leads sem resposta",
    descricao: "12 contatos aguardando há mais de 2h.",
    tipo: "critico",
    ativo: true,
  },
  {
    id: "alerta-intencao",
    titulo: "Intenção alta",
    descricao: "8 conversas com score alto.",
    tipo: "atencao",
    ativo: true,
  },
  {
    id: "alerta-tickets",
    titulo: "Tickets alta prioridade",
    descricao: "3 tickets vencendo hoje.",
    tipo: "critico",
    ativo: false,
  },
  {
    id: "alerta-tarefas",
    titulo: "Tarefas do dia",
    descricao: "5 follow-ups pendentes.",
    tipo: "info",
    ativo: true,
  },
];

export const acoesRapidas: AcaoRapida[] = [
  {
    id: "acao-inbox",
    titulo: "Ir para Inbox",
    descricao: "Retomar conversas ativas.",
    href: "/app/inbox",
  },
  {
    id: "acao-deal",
    titulo: "Criar Deal",
    descricao: "Registrar nova oportunidade.",
    href: "/app/funil",
  },
  {
    id: "acao-agente",
    titulo: "Criar Agente",
    descricao: "Configurar assistente IA.",
    href: "/app/agentes/novo",
  },
  {
    id: "acao-canal",
    titulo: "Conectar Canal",
    descricao: "Adicionar novo canal.",
    href: "/app/canais",
  },
];
