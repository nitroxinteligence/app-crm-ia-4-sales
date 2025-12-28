import type { CanalId, DealFunil, EtapaFunil } from "@/lib/types";
import { formatarMoeda } from "@/lib/formatadores";

export const etapasFunil: EtapaFunil[] = [
  { id: "novo-lead", nome: "Novo lead", cor: "#38bdf8" },
  { id: "em-andamento", nome: "Em andamento", cor: "#22c55e" },
  { id: "qualificado", nome: "Qualificado", cor: "#a855f7" },
  { id: "desqualificado", nome: "Desqualificado", cor: "#f97316" },
  { id: "atendimento-humano", nome: "Atendimento humano", cor: "#facc15" },
  { id: "conversa-finalizada", nome: "Conversa finalizada", cor: "#64748b" },
  { id: "follow-up", nome: "Follow-up", cor: "#0ea5e9" },
];

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
const tags = ["Urgente", "Enterprise", "Inbound", "Mid Market", "VIP"];
const origens = ["Inbound", "Outbound", "Indicação", "Evento", "Parceria"];
const produtos = [
  "Plano Essential",
  "Plano Premium",
  "Plano Pro",
  "Onboarding",
  "Consultoria",
];
const motivosPerda = [
  "Sem orçamento",
  "Concorrência",
  "Timing",
  "Sem fit",
  "Sem resposta",
];
const statusLista: DealFunil["status"][] = [
  "aberto",
  "ganho",
  "perdido",
  "pausado",
];
const canais: CanalId[] = [
  "whatsapp",
  "instagram",
  "messenger",
  "email",
  "linkedin",
];
const moedas: DealFunil["moeda"][] = ["BRL", "USD"];
const hoje = new Date();

const dataPassada = (dias: number) => {
  const data = new Date(hoje);
  data.setDate(data.getDate() - dias);
  return data.toISOString();
};

const dataFutura = (dias: number) => {
  const data = new Date(hoje);
  data.setDate(data.getDate() + dias);
  return data.toISOString();
};

export const dealsFunil: DealFunil[] = Array.from({ length: 200 }, (_, index) => {
  const nome = nomes[index % nomes.length];
  const empresa =
    index % 6 === 0 ? undefined : empresas[index % empresas.length];
  const owner = owners[index % owners.length];
  const etapa = etapasFunil[index % etapasFunil.length];
  const canal = canais[index % canais.length];
  const moeda = moedas[index % moedas.length];
  const valor = 12000 + (index % 18) * 3200;
  const origem = origens[index % origens.length];
  const status = statusLista[index % statusLista.length];
  const tagsSelecionadas =
    index % 5 === 0 ? [] : [tags[index % tags.length]];
  const produto = produtos[index % produtos.length];
  const motivoPerda =
    status === "perdido" ? motivosPerda[index % motivosPerda.length] : undefined;
  const telefone = `(11) 9${String(6000 + (index % 3000)).padStart(4, "0")}-${String(
    1000 + (index % 9000)
  ).padStart(4, "0")}`;
  const criadoEm = dataPassada((index % 90) + 5);
  const ganhoPerdidoEm =
    status === "ganho" || status === "perdido"
      ? dataPassada((index % 60) + 2)
      : undefined;
  const previsaoFechamento = dataFutura((index % 45) + 5);
  const ultimaMudancaEtapa = dataPassada((index % 30) + 1);
  const customizadoEm = dataPassada((index % 75) + 3);

  return {
    id: `deal-${index + 1}`,
    nome,
    empresa,
    telefone,
    valor,
    moeda,
    owner,
    produto,
    tags: tagsSelecionadas,
    ultimaAtividade: `${(index % 7) + 1}h atrás`,
    ultimaMensagem: `Último contato sobre proposta ${formatarMoeda(
      valor,
      moeda
    )}`,
    canal,
    funilId: "principal",
    etapaId: etapa.id,
    origem,
    status,
    motivoPerda,
    criadoEm,
    ganhoPerdidoEm,
    previsaoFechamento,
    ultimaMudancaEtapa,
    customizadoEm,
  };
});
