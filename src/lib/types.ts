export type Role = "ADMIN" | "MEMBER" | "VIEWER";
export type IdiomaApp = "pt-BR" | "en-US";

export type CanalId = "whatsapp" | "instagram";
export type PlanoPeriodo = "mensal" | "semestral" | "anual";

export type CanalConectado = {
  id: CanalId;
  nome: string;
  conectado: boolean;
};

export type Workspace = {
  id: string;
  nome: string;
  plano?: "Essential" | "Pro" | "Premium";
  planoPeriodo?: PlanoPeriodo | null;
  planoSelecionadoEm?: string | null;
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
  trialPlano?: "Essential" | "Pro" | "Premium" | null;
  planoRenovaEm?: string | null;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

export type Plano = {
  nome: "Essential" | "Pro" | "Premium";
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
  idioma: IdiomaApp;
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

export type SerieGraficoDetalhada = {
  id: string;
  titulo: string;
  descricao: string;
  categorias: string[];
  valores: number[];
  layout?: "vertical" | "horizontal";
};

export type SerieGraficoTemporal = {
  id: string;
  titulo: string;
  descricao: string;
  pontos: Array<{
    date: string;
    humano: number;
    ia: number;
  }>;
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
  dataHora?: string;
  clientMessageId?: string;
  interno?: boolean;
  envioStatus?: "sending" | "sent" | "failed";
  senderId?: string;
  senderNome?: string;
  senderAvatarUrl?: string;
  resposta?: {
    messageId?: string;
    autor?: AutorMensagem;
    senderId?: string;
    senderNome?: string;
    tipo?: string;
    conteudo?: string;
  };
  anexos?: Array<{
    id: string;
    storagePath: string;
    tipo: string;
    tamanhoBytes?: number;
    pending?: boolean;
    nome?: string;
    mimeType?: string;
  }>;
};

export type ContatoInbox = {
  id: string;
  nome: string;
  avatarUrl?: string;
  telefone: string;
  email: string;
  isGrupo?: boolean;
  empresa?: string;
  site?: string;
  documento?: string;
  dataNascimento?: string;
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
  ownerId?: string;
  avatarUrl?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  ultimaAtividade: string;
};

export type TipoTarefa =
  | "ligacao"
  | "reuniao"
  | "follow-up"
  | "email"
  | "outro";

export type StatusTarefa = "pendente" | "concluida";

export type RelacionamentoTarefa =
  | "lead"
  | "deal"
  | "conversa"
  | "outro";

export type TarefaCalendario = {
  id: string;
  titulo: string;
  tipo: TipoTarefa;
  tipoOutro?: string;
  data: string;
  hora: string;
  responsavel: string;
  relacionamentoTipo?: RelacionamentoTarefa;
  relacionamentoNome?: string;
  criadoPor: "usuario" | "agente";
  status: StatusTarefa;
};

export type PeriodoRelatorio = "hoje" | "7d" | "30d" | "90d";

export type CanalRelatorio = "whatsapp" | "instagram" | "todos";

export type KPIRelatorio = {
  id: string;
  titulo: string;
  valor: string;
  variacao: string;
};

export type KPINegocio = {
  id: string;
  titulo: string;
  valor: string;
  variacao: string;
  subtitulo: string;
};

export type SerieMensalNegocio = {
  mes: string;
  valor: number;
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


export type TomAgente =
  | "profissional"
  | "amigavel"
  | "consultivo"
  | "direto"
  | "outro";

export type IdiomaAgente = "pt" | "en";

export type HorarioAgente = "comercial" | "24x7" | "personalizado";

export type ArquivoConhecimento = {
  id: string;
  nome: string;
  tipo: "pdf" | "txt" | "docx" | "imagem";
  status: "pendente" | "processando" | "pronto" | "erro";
};

export type LogAgente = {
  id: string;
  data: string;
  canal: CanalId;
  acao: string;
  alvo: string;
  resultado: string;
};

export type NumeroWhatsapp = {
  id: string;
  nome: string;
  numero: string;
  phoneNumberId: string;
  wabaId?: string;
  provider?: string | null;
  status?: string | null;
  instanceId?: string | null;
  connectedAt?: string | null;
  emUso?: boolean;
};

export type TemplateWhatsapp = {
  id: string;
  nome: string;
  categoria: string;
  idioma: string;
  status: string;
};

export type AgendaAgente = {
  id: string;
  titulo: string;
  provider: "google";
  primaria?: boolean;
  integrationId?: string;
};

export type FollowupAgente = {
  id: string;
  nome: string;
  delayMinutos: number;
  templateId?: string;
  mensagemTexto?: string;
  ativo: boolean;
  usarTemplate?: boolean;
  somenteForaJanela?: boolean;
};

export type AgenteIA = {
  id: string;
  nome: string;
  tipo: TipoAgente;
  status: StatusAgente;
  canais: CanalId[];
  tom: TomAgente;
  horario: HorarioAgente;
  uso: {
    utilizado: number;
    limite: number;
  };
};

export type ConversaInbox = {
  id: string;
  leadId?: string;
  contactId?: string;
  integrationAccountId?: string;
  numeroCanal?: string;
  nomeCanal?: string;
  providerCanal?: string;
  avatarCanal?: string;
  ultimaMensagemEm?: string;
  contato: ContatoInbox;
  canal: CanalId;
  status: StatusConversa;
  ultimaMensagem: string;
  horario: string;
  ultimaMensagemAutor?: "contato" | "equipe" | "agente";
  naoLidas: number;
  tags: string[];
  owner: string;
  modoAtendimentoHumano: boolean;
  mensagens: MensagemInbox[];
  mensagensCursor?: string | null;
  mensagensHasMais?: boolean;
  mensagensCarregando?: boolean;
};

export type EtapaFunil = {
  id: string;
  nome: string;
  cor?: string;
  ordem?: number;
};

export type Pipeline = {
  id: string;
  nome: string;
  etapas: EtapaFunil[];
  padrao?: boolean;
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
  avatarUrl?: string;
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
  contact_id?: string;
};
