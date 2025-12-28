import type { AgenteIA, ArquivoConhecimento, LogAgente } from "@/lib/types";

export const agentesIA: AgenteIA[] = [
  {
    id: "agente-1",
    nome: "Maya SDR",
    tipo: "sdr",
    status: "ativo",
    canais: ["whatsapp", "instagram", "email"],
    modo: "assistido",
    idioma: "pt",
    tom: "consultivo",
    horario: "comercial",
    uso: {
      utilizado: 312,
      limite: 600,
    },
  },
];

export const arquivosConhecimentoMock: ArquivoConhecimento[] = [
  { id: "arq-1", nome: "Manual_Produto.pdf", tipo: "pdf", status: "pronto" },
  { id: "arq-2", nome: "FAQ_Comercial.txt", tipo: "txt", status: "processando" },
  { id: "arq-3", nome: "Politicas_Suporte.docx", tipo: "docx", status: "pronto" },
];

export const logsAgentesMock: LogAgente[] = [
  {
    id: "log-1",
    data: "Hoje, 10:24",
    canal: "whatsapp",
    acao: "Resumo de conversa",
    alvo: "Lead Ana Carvalho",
    resultado: "Concluído",
  },
  {
    id: "log-2",
    data: "Ontem, 16:10",
    canal: "email",
    acao: "Rascunho de resposta",
    alvo: "Ticket #421",
    resultado: "Aguardando aprovação",
  },
  {
    id: "log-3",
    data: "Ontem, 12:02",
    canal: "instagram",
    acao: "Qualificação de lead",
    alvo: "Lead Marina Lopes",
    resultado: "Concluído",
  },
];
