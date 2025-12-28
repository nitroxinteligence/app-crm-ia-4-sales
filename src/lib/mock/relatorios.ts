import type {
  KPIRelatorio,
  RelatorioAgente,
  RelatorioInbox,
  RelatorioVenda,
  SerieRelatorio,
} from "@/lib/types";

export const kpisRelatorio: KPIRelatorio[] = [
  {
    id: "conversas",
    titulo: "Conversas atendidas",
    valor: "1.248",
    variacao: "+12% vs período anterior",
  },
  {
    id: "leads",
    titulo: "Leads qualificados",
    valor: "312",
    variacao: "+8% vs período anterior",
  },
  {
    id: "vendas",
    titulo: "Receita gerada",
    valor: "R$ 428.500",
    variacao: "+15% vs período anterior",
  },
  {
    id: "sla",
    titulo: "SLA médio",
    valor: "32 min",
    variacao: "-6% vs período anterior",
  },
];

export const seriesRelatorio: SerieRelatorio[] = [
  { id: "conversas", titulo: "Conversas por dia", pontos: [12, 18, 22, 15, 26, 19, 30] },
  { id: "vendas", titulo: "Receita semanal", pontos: [120, 180, 150, 210, 190, 260, 230] },
  { id: "agents", titulo: "Performance de agentes", pontos: [42, 38, 51, 46, 55, 49, 60] },
];

export const relatorioAgentes: RelatorioAgente[] = [
  { id: "ag-1", nome: "Marina", conversas: 320, tempoMedio: "4m 12s", taxaConversao: "18%" },
  { id: "ag-2", nome: "Renato", conversas: 280, tempoMedio: "5m 05s", taxaConversao: "15%" },
  { id: "ag-3", nome: "Joana", conversas: 240, tempoMedio: "4m 44s", taxaConversao: "17%" },
  { id: "ag-4", nome: "Equipe SDR", conversas: 410, tempoMedio: "6m 10s", taxaConversao: "12%" },
];

export const relatorioVendas: RelatorioVenda[] = [
  { id: "vd-1", etapa: "Novo lead", deals: 128, valor: "R$ 140.000" },
  { id: "vd-2", etapa: "Em andamento", deals: 96, valor: "R$ 190.000" },
  { id: "vd-3", etapa: "Qualificado", deals: 68, valor: "R$ 210.000" },
  { id: "vd-4", etapa: "Follow-up", deals: 42, valor: "R$ 96.000" },
];

export const relatorioInbox: RelatorioInbox[] = [
  { id: "in-1", canal: "WhatsApp", volume: 520, sla: "28 min" },
  { id: "in-2", canal: "Instagram", volume: 310, sla: "35 min" },
  { id: "in-3", canal: "Email", volume: 190, sla: "42 min" },
  { id: "in-4", canal: "LinkedIn", volume: 110, sla: "55 min" },
];
