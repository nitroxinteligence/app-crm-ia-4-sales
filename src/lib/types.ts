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
