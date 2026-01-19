"use client";

import * as React from "react";
import {
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { obterDetalhesPlano, PlanoPeriodo } from "@/lib/planos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PlanoWorkspace = "Essential" | "Pro" | "Premium";
// type PlanoPeriodo = "mensal" | "semestral" | "anual"; // Imported from lib/planos
type ModoCobranca = "configuracoes" | "selecao";
type LayoutCobranca = "app" | "pagina";

type CreditosWorkspace = {
  credits_total: number;
  credits_used: number;
  period_start: string | null;
  period_end: string | null;
};

type PlanoInfo = {
  id: PlanoWorkspace;
  titulo: string;
  // Prices removed, using centralized config
  descricao: string;
  descricaoEn: string;
  recursos: string[];
  recursosEn: string[];
};

const planos: PlanoInfo[] = [
  {
    id: "Essential",
    titulo: "Essential",
    descricao: "Organize o comercial e centralize o atendimento.",
    descricaoEn: "Organize sales and centralize support without AI.",
    recursos: [
      "2 Usuários",
      "2 Conexões de WhatsApp/Insta",
      "10.000 Contatos",
      "Funil de Vendas (Kanban)",
      "Agendamento de Disparos",
    ],
    recursosEn: [
      "2 Users",
      "2 WhatsApp/Insta Connections",
      "10,000 Contacts",
      "Sales Pipeline (Kanban)",
      "Scheduled Broadcasts",
    ],
  },
  {
    id: "Pro",
    titulo: "Pro",
    descricao: "Agente de IA habilitado com creditos inclusos.",
    descricaoEn: "AI agents enabled with included credits.",
    recursos: [
      "10 Usuários",
      "10 Conexões de WhatsApp/Insta",
      "100.000 Contatos",
      "3 Agentes de IA Treináveis",
      "Automação de Fluxos",
      "Relatórios Avançados",
    ],
    recursosEn: [
      "10 Users",
      "10 WhatsApp/Insta Connections",
      "100,000 Contacts",
      "3 Trainable AI Agents",
      "Flow Automation",
      "Advanced Reports",
    ],
  },
  {
    id: "Premium",
    titulo: "Premium",
    descricao: "Operacao completa com IA em todo o CRM.",
    descricaoEn: "Full operation with AI across the CRM.",
    recursos: [
      "20 Usuários",
      "Canais Ilimitados",
      "Contatos Ilimitados",
      "Agentes de IA Ilimitados",
      "API Dedicada",
      "Gerente de Conta Exclusivo",
    ],
    recursosEn: [
      "20 Users",
      "Unlimited Channels",
      "Unlimited Contacts",
      "Unlimited AI Agents",
      "Dedicated API",
      "Exclusive Account Manager",
    ],
  },
];

const limitesPorPlano = {
  Essential: {
    leads: 10000,
    membros: 2,
    conexoes: 2,
    integracoes: 2,
    automacoes: 1,
    pipelines: 5,
  },
  Pro: {
    leads: 100000,
    membros: 15,
    conexoes: 10,
    integracoes: 10,
    automacoes: 5,
    pipelines: 20,
  },
  Premium: {
    leads: null,
    membros: 25,
    conexoes: null,
    integracoes: null,
    automacoes: null,
    pipelines: null,
  },
} as const;

export function VisaoCobrancaConfiguracoes({
  modo = "configuracoes",
  layout = "app",
}: {
  modo?: ModoCobranca;
  layout?: LayoutCobranca;
}) {
  const { usuario, idioma, workspace, canais } = useAutenticacao();
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [planoAtual, setPlanoAtual] = React.useState<PlanoWorkspace>("Essential");
  const [trialEndsAt, setTrialEndsAt] = React.useState<string | null>(null);
  const [creditos, setCreditos] = React.useState<CreditosWorkspace | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] =
    React.useState<PlanoPeriodo>(
      (workspace?.planoPeriodo as PlanoPeriodo | null) ?? "mensal"
    );
  const [dialogCreditosAberto, setDialogCreditosAberto] =
    React.useState(false);

  const [usage, setUsage] = React.useState<{
    contacts: number;
    members: number;
    integrations: number;
    pipelines: number;
    agents: number;
    workspaces: number;
  } | null>(null);

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  React.useEffect(() => {
    if (workspace?.planoPeriodo) {
      setPeriodoSelecionado(workspace.planoPeriodo);
    }
  }, [workspace?.planoPeriodo]);

  React.useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      const token = await obterToken();
      if (!token) {
        setErro("Sessão expirada.");
        setCarregando(false);
        return;
      }
      const response = await fetch("/api/settings/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text();
        setErro(message || "Falha ao carregar cobrança.");
        setCarregando(false);
        return;
      }
      const payload = (await response.json()) as {
        workspace: { plano?: PlanoWorkspace; trial_ends_at?: string | null };
        credits?: CreditosWorkspace | null;
        usage?: {
          contacts: number;
          members: number;
          integrations: number;
          pipelines: number;
          agents: number;
          workspaces: number;
        };
      };
      setPlanoAtual(payload.workspace?.plano ?? "Essential");
      setTrialEndsAt(payload.workspace?.trial_ends_at ?? null);
      setCreditos(payload.credits ?? null);
      setUsage(payload.usage ?? null);
      setCarregando(false);
    };
    void carregar();
  }, [obterToken, t]);

  const [agora, setAgora] = React.useState<number>(0);
  React.useEffect(() => {
    setAgora(Date.now());
  }, []);

  const diasTrial = React.useMemo(() => {
    if (!trialEndsAt) return null;
    if (!agora) return null;
    const diff = Math.ceil(
      (new Date(trialEndsAt).getTime() - agora) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }, [agora, trialEndsAt]);
  const isAdmin = usuario.role === "ADMIN";
  const exibirCabecalho = layout === "app";
  const exibirAvisoAdmin = layout === "app";
  const porcentagemCreditos = React.useMemo(() => {
    if (!creditos?.credits_total) return 0;
    return Math.min(
      100,
      Math.round((creditos.credits_used / creditos.credits_total) * 100)
    );
  }, [creditos]);
  const canaisConectados = React.useMemo(
    () => canais.filter((canal) => canal.conectado).length,
    [canais]
  );
  const creditosRestantes = React.useMemo(() => {
    if (!creditos?.credits_total) return 0;
    return Math.max(0, creditos.credits_total - (creditos.credits_used ?? 0));
  }, [creditos]);
  const planoInfoAtual = React.useMemo(
    () => planos.find((plano) => plano.id === planoAtual) ?? planos[0],
    [planoAtual]
  );
  const iniciaisEmpresa = React.useMemo(() => {
    const nome = (workspace?.nome ?? "").trim();
    if (!nome) return "VP";
    const partes = nome.split(" ").filter(Boolean);
    const primeira = partes[0]?.[0] ?? "";
    const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] : "";
    return `${primeira}${ultima}`.toUpperCase();
  }, [workspace?.nome]);

  const formatarPeriodo = React.useCallback(
    (data?: string | null) => {
      if (!data) return "--";
      return new Intl.DateTimeFormat(idioma, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(data));
    },
    [idioma]
  );

  const formatarNumero = React.useCallback(
    (valor: number) =>
      new Intl.NumberFormat(idioma, {
        maximumFractionDigits: 0,
      }).format(valor),
    [idioma]
  );

  const obterPrecoPlano = React.useCallback(
    (plano: PlanoInfo) => {
      const detalhes = obterDetalhesPlano(plano.id, periodoSelecionado);
      return detalhes.labelMensal;
    },
    [periodoSelecionado]
  );

  const usosPlano = React.useMemo(() => {
    const limites = limitesPorPlano[planoAtual];
    return [
      {
        id: "leads",
        titulo: t("Contatos", "Contacts"),
        usados: usage?.contacts ?? 0,
        limite: limites.leads,
      },
      {
        id: "membros",
        titulo: t("Membros", "Members"),
        usados: usage?.members ?? 0,
        limite: limites.membros,
      },
      {
        id: "conexoes",
        titulo: t("Conexões", "Connections"),
        usados: usage?.integrations ?? 0,
        limite: limites.conexoes,
      },
      {
        id: "workspaces",
        titulo: t("Workspaces", "Workspaces"),
        usados: usage?.workspaces ?? 1,
        limite: 1, // All plans limited to 1 for now
      },
      {
        id: "automacoes",
        titulo: t("Agentes IA", "AI Agents"),
        usados: usage?.agents ?? 0,
        limite: limites.automacoes,
      },
      {
        id: "pipelines",
        titulo: t("Pipelines", "Pipelines"),
        usados: usage?.pipelines ?? 0,
        limite: limites.pipelines,
      },
    ];
  }, [canaisConectados, planoAtual, t, usage]);

  const beneficiosAgentes = React.useMemo(
    () => [
      {
        titulo: "SDR",
        descricao: t(
          "Qualificação de leads e follow-ups comerciais.",
          "Lead qualification and sales follow-ups."
        ),
        icone: Target,
      },
      {
        titulo: "Atendimento",
        descricao: t(
          "Triagem e respostas rápidas em canais omnichannel.",
          "Triage and fast replies across omnichannel."
        ),
        icone: MessageSquare,
      },
      {
        titulo: "Suporte",
        descricao: t(
          "Resolução de dúvidas e suporte técnico.",
          "Issue resolution and technical support."
        ),
        icone: LifeBuoy,
      },
      {
        titulo: "Vendas",
        descricao: t(
          "Conversas comerciais e fechamento de vendas.",
          "Sales conversations and deal closing."
        ),
        icone: TrendingUp,
      },
    ],
    [t]
  );

  return (
    <div className="space-y-8 [&_*]:rounded-[6px] [&_*]:shadow-none">
      {exibirCabecalho && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {modo === "selecao"
              ? t("Escolha seu plano", "Choose your plan")
              : t("Cobrança & plano", "Billing & plan")}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {modo === "selecao"
              ? t(
                "Selecione um plano para liberar o app com 30 dias de teste.",
                "Select a plan to unlock the app with a 30-day trial."
              )
              : t(
                "Acompanhe o plano ativo, ciclos de cobrança e uso de créditos.",
                "Track your active plan, billing cycles, and credit usage."
              )}
          </p>
        </div>
      )}

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}
      {modo === "selecao" && (
        <div className="space-y-2">
          <Tabs
            value={periodoSelecionado}
            onValueChange={(valor) =>
              setPeriodoSelecionado(valor as PlanoPeriodo)
            }
            className="w-full"
          >
            <TabsList className="w-full max-w-md">
              <TabsTrigger className="flex-1" value="mensal">
                {t("Mensal", "Monthly")}
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="semestral">
                {t("Semestral", "Semiannual")}
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="anual">
                {t("Anual", "Annual")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {t(
              "Altere o período para comparar valores e condições.",
              "Switch periods to compare prices and terms."
            )}
          </p>
        </div>
      )}
      {exibirAvisoAdmin && !isAdmin && (
        <div className="rounded-[6px] border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t(
            "Apenas administradores podem alterar cobrança e plano.",
            "Only admins can change billing and plans."
          )}
        </div>
      )}

      {modo === "configuracoes" && (
        <div className="space-y-6">
          <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
            <CardHeader className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {t("Planos e pagamentos", "Plans and billing")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Controle plano, cobrança e uso de recursos.",
                    "Control plan, billing, and resource usage."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-xs font-semibold text-foreground">
                  {iniciaisEmpresa}
                </div>
                <div className="text-xs leading-tight">
                  <p className="uppercase tracking-[0.16em] text-muted-foreground">
                    {t("Empresa", "Company")}
                  </p>
                  <p className="text-foreground">
                    {workspace?.nome || t("Workspace", "Workspace")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {carregando ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{planoAtual}</Badge>
                    {diasTrial !== null && (
                      <Badge variant="outline" className="text-xs">
                        {diasTrial > 0
                          ? t(
                            `Trial: ${diasTrial} dia(s)`,
                            `Trial: ${diasTrial} day(s)`
                          )
                          : t("Trial encerrado", "Trial ended")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border border-border/60 bg-white dark:bg-neutral-950 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {t("Renova em", "Renews on")}
                      </p>
                      <p className="text-xs text-foreground">
                        {formatarPeriodo(
                          workspace?.planoRenovaEm ?? creditos?.period_end
                        )}
                      </p>
                    </div>
                    <div className="border border-border/60 bg-white dark:bg-neutral-950 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {t("Valor", "Amount")}
                      </p>
                      <p className="text-xs text-foreground">
                        {obterPrecoPlano(planoInfoAtual)}
                      </p>
                    </div>
                    <div className="border border-border/60 bg-white dark:bg-neutral-950 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {t("Frequência", "Frequency")}
                      </p>
                      <p className="text-xs text-foreground">
                        {periodoSelecionado === "mensal"
                          ? t("Mensal", "Monthly")
                          : periodoSelecionado === "semestral"
                            ? t("Semestral", "Semiannual")
                            : t("Anual", "Annual")}
                      </p>
                    </div>
                    <div className="border border-border/60 bg-white dark:bg-neutral-950 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {t("Método", "Payment")}
                      </p>
                      <p className="text-xs text-foreground">
                        {t(
                          "Sem método de pagamento registrado",
                          "No payment method on file"
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" disabled={!isAdmin}>
                  {t("Gerenciar cobrança", "Manage billing")}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/planos" target="_blank" rel="noreferrer">
                    {t("Atualizar plano", "Update plan")}
                  </Link>
                </Button>
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "Somente admins podem editar o plano.",
                      "Only admins can update plans."
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
            <CardHeader>
              <CardTitle className="text-base">
                {t("Benefícios do plano", "Plan benefits")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Visão geral de limites e recursos disponíveis.",
                  "Overview of limits and available resources."
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {usosPlano.map((item) => {
                  const percentual =
                    item.limite === null
                      ? 100
                      : Math.min(
                        100,
                        Math.round(
                          (item.usados / Math.max(1, item.limite)) * 100
                        )
                      );
                  const limiteLabel =
                    item.limite === null
                      ? t("Ilimitado", "Unlimited")
                      : formatarNumero(item.limite);
                  const valorLabel =
                    item.limite === null
                      ? t("Ilimitado", "Unlimited")
                      : `${formatarNumero(item.usados)} / ${limiteLabel}`;

                  return (
                    <div
                      key={item.id}
                      className="border border-border/60 bg-white dark:bg-neutral-950 p-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {item.titulo}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {valorLabel}
                      </p>
                      <div className="mt-2 h-1.5 w-full bg-muted">
                        <div
                          className="h-1.5 bg-primary/70 transition-all"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {t("Limite:", "Limit:")} {limiteLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div className="grid gap-2 sm:grid-cols-2">
                {(idioma === "en-US"
                  ? planoInfoAtual.recursosEn
                  : planoInfoAtual.recursos
                ).map((recurso) => (
                  <div
                    key={recurso}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                    <span>{recurso}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
            <CardHeader className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {t("Agentes de IA", "AI Agents")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Gerencie agentes inteligentes e seus limites de atuação.",
                    "Manage intelligent agents and their operating limits."
                  )}
                </p>
              </div>

            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t("Benefícios dos agentes", "Agent benefits")}
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {beneficiosAgentes.map((beneficio) => {
                    const Icone = beneficio.icone;
                    return (
                      <div key={beneficio.titulo} className="flex items-start gap-2">
                        <Icone className="mt-0.5 h-4 w-4 text-primary" />
                        <span>
                          <span className="font-medium text-foreground">
                            {beneficio.titulo}
                          </span>{" "}
                          — {beneficio.descricao}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border border-border/60 bg-white dark:bg-neutral-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("Consumo IA", "AI usage")}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setDialogCreditosAberto(true)}
                            aria-label={t(
                              "Clique para saber mais sobre créditos",
                              "Learn more about credits"
                            )}
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-blue-600 text-xs text-white">
                          {t(
                            "Clique para saber mais...",
                            "Click to learn more..."
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {porcentagemCreditos}%
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "Créditos são usados por respostas, follow-ups e automações dos agentes.",
                    "Credits are used by agent replies, follow-ups, and automations."
                  )}
                </p>
                <div className="mt-4 h-2 w-full bg-muted">
                  <div
                    className="h-2 bg-gradient-to-r from-primary/60 via-primary to-primary transition-all"
                    style={{ width: `${porcentagemCreditos}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {creditos?.credits_used ?? 0} /{" "}
                    {creditos?.credits_total ?? 0}
                  </span>
                  <span>
                    {t("Saldo:", "Remaining:")} {creditosRestantes}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={dialogCreditosAberto}
            onOpenChange={setDialogCreditosAberto}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {t("Créditos dos agentes", "Agent credits")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "Os créditos representam o consumo de IA dentro do CRM.",
                    "Credits represent AI usage across the CRM."
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {t(
                    "Cada resposta gerada pelos agentes consome créditos conforme o tamanho e complexidade da interação.",
                    "Each agent response consumes credits based on size and complexity."
                  )}
                </p>
                <p>
                  {t(
                    "Automatizações, resumos e follow-ups também utilizam créditos do ciclo atual.",
                    "Automations, summaries, and follow-ups also use credits from the current cycle."
                  )}
                </p>
                <p>
                  {t(
                    "Quando o saldo chega a zero, as ações de IA são pausadas até a próxima renovação ou upgrade.",
                    "When the balance reaches zero, AI actions pause until renewal or upgrade."
                  )}
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
            <CardHeader>
              <CardTitle className="text-base">
                {t("Pagamentos", "Payments")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Histórico das últimas cobranças do workspace.",
                  "History of the most recent charges."
                )}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden border border-border/60">
                <div className="grid grid-cols-4 border-b border-border/60 bg-muted/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>{t("Valor", "Amount")}</span>
                  <span>{t("Descrição", "Description")}</span>
                  <span>{t("Data", "Date")}</span>
                  <span>{t("Status", "Status")}</span>
                </div>
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("Não há dados", "No data")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
