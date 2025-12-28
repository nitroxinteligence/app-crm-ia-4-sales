import type { RelacionamentoTarefa, TarefaCalendario, TipoTarefa } from "@/lib/types";

const titulos = [
  "Reunião de alinhamento",
  "Follow-up proposta",
  "Ligar para confirmar",
  "Enviar apresentação",
  "Revisar contrato",
  "Atualizar pipeline",
  "Onboarding do cliente",
  "Check-in semanal",
  "Responder dúvidas",
  "Agendar demonstração",
];

const responsaveis = ["Marina", "Renato", "Joana", "Equipe SDR", "Bot IA"];
const tipos: TipoTarefa[] = [
  "ligacao",
  "reuniao",
  "follow-up",
  "email",
  "outro",
];
const relacionamentos: (RelacionamentoTarefa | undefined)[] = [
  "lead",
  "deal",
  "ticket",
  "conversa",
  undefined,
];

const dataBase = new Date();

const gerarDataISO = (dias: number) => {
  const data = new Date(dataBase);
  data.setDate(data.getDate() + dias);
  return data.toISOString();
};

export const tarefasCalendario: TarefaCalendario[] = Array.from(
  { length: 120 },
  (_, index) => {
    const tipo = tipos[index % tipos.length];
    const responsavel = responsaveis[index % responsaveis.length];
    const relacionamento = relacionamentos[index % relacionamentos.length];
    const data = gerarDataISO((index % 28) - 14);
    const hora = `${String(8 + (index % 10)).padStart(2, "0")}:${
      index % 2 === 0 ? "00" : "30"
    }`;
    const criadoPor = index % 7 === 0 ? "agente" : "usuario";

    return {
      id: `tarefa-${index + 1}`,
      titulo: titulos[index % titulos.length],
      tipo,
      data,
      hora,
      responsavel,
      relacionamentoTipo: relacionamento,
      relacionamentoNome: relacionamento ? `Registro ${index + 1}` : undefined,
      criadoPor,
      status: index % 5 === 0 ? "concluida" : "pendente",
    };
  }
);
