import type { ContatoCRM, StatusContato } from "@/lib/types";

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
  "BluePeak",
  "InovaCorp",
];

const owners = ["Marina", "Renato", "Joana", "Equipe SDR", "Bot IA"];
const tags = ["Urgente", "Enterprise", "Inbound", "Mid Market", "VIP"];
const statusLista: StatusContato[] = [
  "novo",
  "qualificado",
  "em-negociacao",
  "cliente",
  "inativo",
];
const dominios = ["verticalpartners.com", "exemplo.com", "crmcloud.io"];
const atividades = [
  "há 20 min",
  "há 2h",
  "há 6h",
  "há 1 dia",
  "há 3 dias",
  "há 1 semana",
];

const slugEmail = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

export const contatosCRM: ContatoCRM[] = Array.from(
  { length: 300 },
  (_, index) => {
    const nome = nomes[index % nomes.length];
    const empresa =
      index % 5 === 0 ? undefined : empresas[index % empresas.length];
    const owner = owners[index % owners.length];
    const status = statusLista[index % statusLista.length];
    const telefone = `(11) 9${String(6000 + (index % 3000)).padStart(4, "0")}-${String(
      1000 + (index % 9000)
    ).padStart(4, "0")}`;
    const email = `${slugEmail(nome)}@${dominios[index % dominios.length]}`;
    const ultimaAtividade = atividades[index % atividades.length];
    const tagsSelecionadas =
      index % 4 === 0 ? [] : [tags[index % tags.length]];

    return {
      id: `contato-${index + 1}`,
      nome,
      telefone,
      email,
      empresa,
      status,
      tags: tagsSelecionadas,
      owner,
      ultimaAtividade,
    };
  }
);
