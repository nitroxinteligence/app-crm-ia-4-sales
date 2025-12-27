import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
} from "lucide-react";

export type GrupoNavegacao = "core" | "admin";

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
    disponivel: false,
  },
  {
    id: "funil",
    titulo: "Pipeline",
    href: "/app/funil",
    icone: KanbanSquare,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "leads",
    titulo: "Leads",
    href: "/app/leads",
    icone: Users,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "empresas",
    titulo: "Empresas",
    href: "/app/empresas",
    icone: Building2,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "calendario",
    titulo: "Calendario",
    href: "/app/calendario",
    icone: CalendarDays,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "agentes",
    titulo: "Agentes",
    href: "/app/agentes",
    icone: Bot,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "tickets",
    titulo: "Tickets",
    href: "/app/tickets",
    icone: Ticket,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "relatorios",
    titulo: "Relatorios",
    href: "/app/relatorios",
    icone: BarChart3,
    grupo: "core",
    disponivel: false,
  },
  {
    id: "configuracoes",
    titulo: "Configuracoes",
    href: "/app/configuracoes",
    icone: Settings,
    grupo: "admin",
    disponivel: false,
  },
];

export const rotulosRotas: Record<string, string> = {
  painel: "Painel",
  inbox: "Inbox",
  funil: "Pipeline",
  pipeline: "Pipeline",
  leads: "Leads",
  empresas: "Empresas",
  calendario: "Calendario",
  agentes: "Agentes",
  tickets: "Tickets",
  relatorios: "Relatorios",
  configuracoes: "Configuracoes",
  equipe: "Equipe",
  canais: "Canais",
  campos: "Campos",
  cobranca: "Cobranca",
  idioma: "Idioma",
  privacidade: "Privacidade",
};
