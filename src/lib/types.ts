export type Role = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export type CanalId =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "email"
  | "linkedin";

export type CanalConectado = {
  id: CanalId;
  nome: string;
  conectado: boolean;
};

export type Workspace = {
  id: string;
  nome: string;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

export type Plano = {
  nome: "Essential" | "Premium" | "Pro";
  trialDiasRestantes: number;
  limites: {
    usuarios: number;
    canais: number;
    agentes: number;
  };
};

export type EstadoAutenticacao = {
  usuario: Usuario;
  workspace: Workspace;
  canais: CanalConectado[];
  plano: Plano;
};

export type KPI = {
  id: string;
  titulo: string;
  valor: string;
  delta?: string;
  descricao?: string;
};

export type AlertaPainel = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "critico" | "atencao" | "info";
  ativo: boolean;
};

export type AcaoRapida = {
  id: string;
  titulo: string;
  descricao: string;
  href?: string;
};

export type SerieGrafico = {
  id: string;
  titulo: string;
  valores: number[];
};

export type StatusConversa = "aberta" | "pendente" | "resolvida" | "spam";

export type TipoMensagem = "texto" | "imagem" | "pdf" | "audio";

export type AutorMensagem = "contato" | "equipe" | "agente";

export type MensagemInbox = {
  id: string;
  autor: AutorMensagem;
  conteudo: string;
  tipo: TipoMensagem;
  horario: string;
  interno?: boolean;
};

export type ContatoInbox = {
  id: string;
  nome: string;
  avatarUrl?: string;
  telefone: string;
  email: string;
  empresa?: string;
  tags: string[];
  status: string;
  owner: string;
};

export type StatusContato =
  | "novo"
  | "qualificado"
  | "em-negociacao"
  | "cliente"
  | "inativo";

export type ContatoCRM = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  empresa?: string;
  status: StatusContato;
  tags: string[];
  owner: string;
  ultimaAtividade: string;
};

export type TipoTarefa =
  | "ligacao"
  | "reuniao"
  | "follow-up"
  | "email"
  | "outro";

export type StatusTarefa = "pendente" | "concluida";

export type RelacionamentoTarefa = "lead" | "deal" | "ticket" | "conversa";

export type TarefaCalendario = {
  id: string;
  titulo: string;
  tipo: TipoTarefa;
  data: string;
  hora: string;
  responsavel: string;
  relacionamentoTipo?: RelacionamentoTarefa;
  relacionamentoNome?: string;
  criadoPor: "usuario" | "agente";
  status: StatusTarefa;
};

export type PeriodoRelatorio = "hoje" | "7d" | "30d" | "90d";

export type CanalRelatorio =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "email"
  | "linkedin"
  | "todos";

export type KPIRelatorio = {
  id: string;
  titulo: string;
  valor: string;
  variacao: string;
};

export type SerieRelatorio = {
  id: string;
  titulo: string;
  pontos: number[];
};

export type RelatorioAgente = {
  id: string;
  nome: string;
  conversas: number;
  tempoMedio: string;
  taxaConversao: string;
};

export type RelatorioVenda = {
  id: string;
  etapa: string;
  deals: number;
  valor: string;
};

export type RelatorioInbox = {
  id: string;
  canal: string;
  volume: number;
  sla: string;
};

export type TipoAgente =
  | "sdr"
  | "atendimento"
  | "suporte"
  | "copiloto"
  | "propostas"
  | "voice";

export type StatusAgente = "ativo" | "pausado";

export type ModoAgente = "autonomo" | "assistido" | "rascunho";

export type TomAgente = "profissional" | "amigavel" | "consultivo" | "direto";

export type IdiomaAgente = "pt" | "en";

export type HorarioAgente = "comercial" | "24x7" | "personalizado";

export type ArquivoConhecimento = {
  id: string;
  nome: string;
  tipo: "pdf" | "txt" | "docx";
  status: "processando" | "pronto";
};

export type LogAgente = {
  id: string;
  data: string;
  canal: CanalId;
  acao: string;
  alvo: string;
  resultado: string;
};

export type AgenteIA = {
  id: string;
  nome: string;
  tipo: TipoAgente;
  status: StatusAgente;
  canais: CanalId[];
  modo: ModoAgente;
  idioma: IdiomaAgente;
  tom: TomAgente;
  horario: HorarioAgente;
  uso: {
    utilizado: number;
    limite: number;
  };
};

export type ConversaInbox = {
  id: string;
  contato: ContatoInbox;
  canal: CanalId;
  status: StatusConversa;
  ultimaMensagem: string;
  horario: string;
  naoLidas: number;
  tags: string[];
  owner: string;
  modoAtendimentoHumano: boolean;
  mensagens: MensagemInbox[];
};

export type EtapaFunil = {
  id: string;
  nome: string;
  cor?: string;
};

export type DealFunil = {
  id: string;
  nome: string;
  empresa?: string;
  telefone?: string;
  valor: number;
  moeda: "BRL" | "USD";
  owner: string;
  produto: string;
  tags: string[];
  ultimaAtividade: string;
  ultimaMensagem: string;
  canal: CanalId;
  funilId: string;
  etapaId: string;
  origem: string;
  status: "aberto" | "ganho" | "perdido" | "pausado";
  motivoPerda?: string;
  criadoEm: string;
  ganhoPerdidoEm?: string;
  previsaoFechamento?: string;
  ultimaMudancaEtapa: string;
  customizadoEm?: string;
};
