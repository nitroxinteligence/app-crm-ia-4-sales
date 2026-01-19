import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  Settings,
  Target,
  Users,
} from "lucide-react";

export type GrupoNavegacao = "core" | "inteligencia" | "admin";

export type ItemNavegacao = {
  id: string;
  titulo: string;
  href: string;
  icone: LucideIcon;
  grupo: GrupoNavegacao;
  disponivel: boolean;
};

export const itensNavegacao: ItemNavegacao[] = [
  {
    id: "painel",
    titulo: "Painel",
    href: "/app/painel",
    icone: LayoutDashboard,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "inbox",
    titulo: "Inbox",
    href: "/app/inbox",
    icone: Inbox,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "pipeline",
    titulo: "Pipeline",
    href: "/app/pipeline",
    icone: KanbanSquare,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "contatos",
    titulo: "Contatos",
    href: "/app/contatos",
    icone: Users,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "calendario",
    titulo: "Calendário",
    href: "/app/calendario",
    icone: CalendarDays,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "agentes",
    titulo: "Agentes I.A",
    href: "/app/agentes",
    icone: Bot,
    grupo: "inteligencia",
    disponivel: false, // Temporariamente desabilitado
  },
  {
    id: "prospeccao",
    titulo: "Prospecção com I.A",
    href: "/app/prospeccao",
    icone: Target,
    grupo: "inteligencia",
    disponivel: false,
  },
  {
    id: "email-marketing",
    titulo: "E-mail Marketing",
    href: "/app/email-marketing",
    icone: Mail,
    grupo: "inteligencia",
    disponivel: false,
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    href: "/app/relatorios",
    icone: BarChart3,
    grupo: "core",
    disponivel: true,
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    href: "/app/configuracoes",
    icone: Settings,
    grupo: "admin",
    disponivel: true,
  },
];

export const rotulosRotas: Record<string, string> = {
  painel: "Painel",
  inbox: "Inbox",
  pipeline: "Pipeline",
  funil: "Pipeline",
  leads: "Contatos",
  contatos: "Contatos",
  calendario: "Calendário",
  agentes: "Agentes I.A",
  prospeccao: "Prospecção com I.A",
  "email-marketing": "E-mail Marketing",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  integracoes: "Conexões",
  conexoes: "Conexões",
  perfil: "Perfil",
  equipe: "Equipe",
  tags: "Tags",
  produtos: "Produtos",
  canais: "Canais",
  campos: "Campos",
  cobranca: "Cobrança",
  idioma: "Idioma",
  privacidade: "Privacidade",
  "respostas-rapidas": "Respostas rápidas",
  "motivos-perda": "Motivos de perdas",
  workspaces: "Workspaces",
};
