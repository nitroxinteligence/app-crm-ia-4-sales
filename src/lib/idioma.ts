import type { IdiomaApp } from "@/lib/types";

export const idiomaPadrao: IdiomaApp = "pt-BR";

const rotulosPorIdioma: Record<IdiomaApp, Record<string, string>> = {
  "pt-BR": {
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
    integracoes: "Integrações",
    perfil: "Perfil",
    equipe: "Equipe",
    canais: "Canais",
    campos: "Campos",
    cobranca: "Cobrança",
    idioma: "Idioma",
    privacidade: "Privacidade",
    core: "Core",
    inteligencia: "Inteligência Artificial",
    admin: "Administrador",
  },
  "en-US": {
    painel: "Dashboard",
    inbox: "Inbox",
    pipeline: "Pipeline",
    funil: "Pipeline",
    leads: "Contacts",
    contatos: "Contacts",
    calendario: "Calendar",
    agentes: "AI Agents",
    prospeccao: "Prospecting",
    "email-marketing": "Email Marketing",
    relatorios: "Reports",
    configuracoes: "Settings",
    integracoes: "Integrations",
    perfil: "Profile",
    equipe: "Team",
    canais: "Channels",
    campos: "Fields",
    cobranca: "Billing",
    idioma: "Language",
    privacidade: "Privacy",
    core: "Core",
    inteligencia: "Artificial Intelligence",
    admin: "Admin",
  },
};

export function texto(idioma: IdiomaApp, pt: string, en: string) {
  return idioma === "en-US" ? en : pt;
}

export function obterRotuloRota(
  idioma: IdiomaApp,
  rota: string,
  fallback?: string
) {
  return (
    rotulosPorIdioma[idioma]?.[rota] ??
    fallback ??
    rotulosPorIdioma[idiomaPadrao]?.[rota] ??
    rota
  );
}

export function obterTituloNavegacao(
  idioma: IdiomaApp,
  id: string,
  fallback?: string
) {
  return (
    rotulosPorIdioma[idioma]?.[id] ??
    fallback ??
    rotulosPorIdioma[idiomaPadrao]?.[id] ??
    id
  );
}
