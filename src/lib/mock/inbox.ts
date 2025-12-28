import type {
  CanalId,
  ConversaInbox,
  MensagemInbox,
  StatusConversa,
} from "@/lib/types";

const nomes = [
  "Ana Carvalho",
  "Bruno Lima",
  "Camila Souza",
  "Diego Santos",
  "Elaine Batista",
  "Felipe Ramos",
  "Giovana Melo",
  "Henrique Rocha",
  "Isabela Martins",
  "Joao Vitor",
  "Karina Duarte",
  "Lucas Alves",
  "Marina Lopes",
  "Nicolas Costa",
  "Olivia Pereira",
  "Paulo Nunes",
  "Rafaela Torres",
  "Sergio Oliveira",
  "Tatiana Freitas",
  "Victor Hugo",
];

const empresas = [
  "Horizonte Digital",
  "Nova Ponte",
  "Vetor Prime",
  "Aurora Labs",
  "Pulseworks",
  "Estrela do Norte",
  "Alpha Cloud",
];

const owners = ["Marina", "Renato", "Joana", "Equipe SDR", "Bot IA"];

const canais: CanalId[] = [
  "whatsapp",
  "instagram",
  "messenger",
  "email",
  "linkedin",
];

const statusLista: StatusConversa[] = [
  "aberta",
  "pendente",
  "resolvida",
  "spam",
];

const mensagensBase: MensagemInbox[] = [
  {
    id: "msg-1",
    autor: "contato",
    conteudo: "Oi! Quero entender os planos para equipe comercial.",
    tipo: "texto",
    horario: "09:12",
  },
  {
    id: "msg-2",
    autor: "agente",
    conteudo: "Posso te mostrar as diferenças entre Essential e Premium.",
    tipo: "texto",
    horario: "09:13",
  },
  {
    id: "msg-3",
    autor: "contato",
    conteudo: "Tem integracao com WhatsApp?",
    tipo: "texto",
    horario: "09:14",
  },
  {
    id: "msg-4",
    autor: "equipe",
    conteudo: "Sim! Vou preparar um resumo rapido.",
    tipo: "texto",
    horario: "09:16",
  },
  {
    id: "msg-5",
    autor: "equipe",
    conteudo: "Proposta-vertical-partners.pdf",
    tipo: "pdf",
    horario: "09:18",
  },
];

function gerarMensagens(indice: number): MensagemInbox[] {
  return mensagensBase.map((mensagem, offset) => ({
    ...mensagem,
    id: `${mensagem.id}-${indice}-${offset}`,
  }));
}

export const conversasInbox: ConversaInbox[] = Array.from(
  { length: 40 },
  (_, index) => {
    const canal = canais[index % canais.length];
    const status = statusLista[index % statusLista.length];
    const nome = nomes[index % nomes.length];
    const empresa = empresas[index % empresas.length];
    const owner = owners[index % owners.length];

    return {
      id: `conv-${index + 1}`,
      contato: {
        id: `contato-${index + 1}`,
        nome,
        avatarUrl: "/avatars/contato-placeholder.svg",
        telefone: "+55 (11) 9 8765-43" + String(index % 10),
        email: `contato${index + 1}@${empresa.toLowerCase().replace(/\s/g, "")}\.com`,
        empresa,
        tags: ["Inbound", "Mid Market"],
        status: status === "spam" ? "Bloqueado" : "Ativo",
        owner,
      },
      canal,
      status,
      ultimaMensagem: "Aguardando retorno para avançar.",
      horario: `0${(index % 9) + 8}:0${index % 6}`,
      naoLidas: status === "aberta" ? (index % 4) + 1 : 0,
      tags: ["Urgente", "Proposta"],
      owner,
      modoAtendimentoHumano: index % 5 === 0,
      mensagens: gerarMensagens(index + 1),
    };
  }
);
