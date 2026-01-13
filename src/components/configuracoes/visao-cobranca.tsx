"use client";

import * as React from "react";
import { CalendarClock, CreditCard } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PlanoWorkspace = "Essential" | "Pro" | "Premium";
type PlanoPeriodo = "mensal" | "semestral" | "anual";
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
  precoMensal: string;
  precoSemestral: string;
  precoAnual: string;
  descricao: string;
  descricaoEn: string;
  recursos: string[];
  recursosEn: string[];
};

const planos: PlanoInfo[] = [
  {
    id: "Essential",
    titulo: "Essential",
    precoMensal: "R$ 97/mes",
    precoSemestral: "R$ 523,80 a vista",
    precoAnual: "R$ 931,20 a vista",
    descricao: "Organize o comercial e centralize o atendimento.",
    descricaoEn: "Organize sales and centralize support without AI.",
    recursos: [
      "Ate 5 pipelines com 10 etapas",
      "Gestao de deals e produtos",
      "Ate 10.000 leads/contatos",
      "Ate 2 usuarios/membros",
      "Inbox omnichannel com 2 canais",
      "Relatorios essenciais",
    ],
    recursosEn: [
      "Up to 5 pipelines with 10 stages",
      "Deals and products management",
      "Up to 10,000 leads/contacts",
      "Up to 2 users/members",
      "Omnichannel inbox with 2 channels",
      "Essential reports",
    ],
  },
  {
    id: "Pro",
    titulo: "Pro",
    precoMensal: "R$ 597/mes",
    precoSemestral: "R$ 3.223,80 a vista",
    precoAnual: "R$ 5.731,20 a vista",
    descricao: "Agente de IA habilitado com creditos inclusos.",
    descricaoEn: "AI agents enabled with included credits.",
    recursos: [
      "Ate 3 agentes de IA",
      "10.000 creditos/mês",
      "Ate 20 pipelines com 15 etapas",
      "Deals e produtos completos",
      "Ate 100.000 leads/contatos",
      "Ate 15 usuarios/membros",
      "Multiatendimento com 10 canais",
      "Relatorios avancados com KPIs",
    ],
    recursosEn: [
      "Up to 3 AI agents",
      "10,000 credits/month",
      "Up to 20 pipelines with 15 stages",
      "Full deals/products management",
      "Up to 100,000 leads/contacts",
      "Up to 15 users/members",
      "Omnichannel with 10 channels",
      "Advanced reports with KPIs",
    ],
  },
  {
    id: "Premium",
    titulo: "Premium",
    precoMensal: "R$ 897/mes",
    precoSemestral: "R$ 4.843,80 a vista",
    precoAnual: "R$ 8.611,20 a vista",
    descricao: "Operacao completa com IA em todo o CRM.",
    descricaoEn: "Full operation with AI across the CRM.",
    recursos: [
      "Agentes ilimitados",
      "30.000 creditos/mês",
      "Pipelines ilimitadas (ate 25 etapas)",
      "Leads/contatos ilimitados",
      "Deals e produtos completos",
      "Ate 25 usuarios",
      "Canais conectados ilimitados",
      "Relatorios avancados + insights IA",
    ],
    recursosEn: [
      "Unlimited agents",
      "30,000 credits/month",
      "Unlimited pipelines (up to 25 stages)",
      "Unlimited leads/contacts",
      "Full deals/products management",
      "Up to 25 users",
      "Unlimited connected channels",
      "Advanced reports + AI insights",
    ],
  },
];

export function VisaoCobrancaConfiguracoes({
  modo = "configuracoes",
  layout = "app",
}: {
  modo?: ModoCobranca;
  layout?: LayoutCobranca;
}) {
  const { usuario, idioma, workspace, recarregar } = useAutenticacao();
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [planoAtual, setPlanoAtual] = React.useState<PlanoWorkspace>("Essential");
  const [trialEndsAt, setTrialEndsAt] = React.useState<string | null>(null);
  const [creditos, setCreditos] = React.useState<CreditosWorkspace | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] =
    React.useState<PlanoPeriodo>(
      (workspace?.planoPeriodo as PlanoPeriodo | null) ?? "mensal"
    );
  const [salvandoPlano, setSalvandoPlano] = React.useState(false);
  const [planoSelecionando, setPlanoSelecionando] =
    React.useState<PlanoWorkspace | null>(null);
  const [sucessoPlano, setSucessoPlano] = React.useState<string | null>(null);

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
      };
      setPlanoAtual(payload.workspace?.plano ?? "Essential");
      setTrialEndsAt(payload.workspace?.trial_ends_at ?? null);
      setCreditos(payload.credits ?? null);
      setCarregando(false);
    };
    void carregar();
  }, [obterToken, t]);

  const handleSelecionarPlano = async (planoId: PlanoWorkspace) => {
    if (!isAdmin) return;
    setSalvandoPlano(true);
    setPlanoSelecionando(planoId);
    setSucessoPlano(null);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro("Sessao expirada.");
      setPlanoSelecionando(null);
      setSalvandoPlano(false);
      return;
    }

    const response = await fetch("/api/plans/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan: planoId,
        period: periodoSelecionado,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || "Falha ao selecionar plano.");
      setSalvandoPlano(false);
      setPlanoSelecionando(null);
      return;
    }

    setSucessoPlano("Plano selecionado! Trial de 30 dias iniciado.");
    setPlanoAtual(planoId);
    await recarregar();
    setSalvandoPlano(false);
    setPlanoSelecionando(null);
  };

  const diasTrial = React.useMemo(() => {
    if (!trialEndsAt) return null;
    const diff = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }, [trialEndsAt]);
  const isAdmin = usuario.role === "ADMIN";
  const planoSelecionado = Boolean(workspace?.planoSelecionadoEm);
  const exibirCabecalho = layout === "app";
  const exibirAvisoAdmin = layout === "app";
  const porcentagemCreditos = React.useMemo(() => {
    if (!creditos?.credits_total) return 0;
    return Math.min(
      100,
      Math.round((creditos.credits_used / creditos.credits_total) * 100)
    );
  }, [creditos]);

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

  const obterPrecoPlano = React.useCallback(
    (plano: PlanoInfo) => {
      if (periodoSelecionado === "semestral") return plano.precoSemestral;
      if (periodoSelecionado === "anual") return plano.precoAnual;
      return plano.precoMensal;
    },
    [periodoSelecionado]
  );

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      {exibirCabecalho && (
        <div>
          <h2 className="text-lg font-semibold">
            {modo === "selecao"
              ? t("Escolha seu plano", "Choose your plan")
              : t("Cobrança & plano", "Billing & plan")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {modo === "selecao"
              ? t(
                  "Selecione um plano para liberar o app com 30 dias de teste.",
                  "Select a plan to unlock the app with a 30-day trial."
                )
              : t(
                  "Visualize o plano atual e compare opções disponíveis.",
                  "Review your current plan and compare available options."
                )}
          </p>
        </div>
      )}

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}
      {sucessoPlano && (
        <div className="rounded-[6px] border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
          {sucessoPlano}
        </div>
      )}
      {modo === "selecao" && (
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
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t("Plano atual", "Current plan")}
              </CardTitle>
              <Badge variant="secondary">{planoAtual}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              {carregando ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t(
                      "Plano ativo no workspace.",
                      "Plan active on the workspace."
                    )}
                  </div>
                  {diasTrial !== null && (
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      {t(
                        `Trial termina em ${diasTrial} dia(s).`,
                        `Trial ends in ${diasTrial} day(s).`
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button variant="outline" disabled={!isAdmin}>
                {t("Gerenciar cobrança", "Manage billing")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Uso de créditos", "Credit usage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {carregando ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{t("Créditos usados", "Credits used")}</span>
                    <span className="text-foreground">
                      {creditos?.credits_used ?? 0} /{" "}
                      {creditos?.credits_total ?? 0}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-[6px] bg-muted">
                    <div
                      className="h-2 rounded-[6px] bg-primary transition-all"
                      style={{ width: `${porcentagemCreditos}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      {t("Ciclo atual:", "Current cycle:")}{" "}
                      {formatarPeriodo(creditos?.period_start)} -{" "}
                      {formatarPeriodo(creditos?.period_end)}
                    </span>
                    <span>{porcentagemCreditos}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {planos.map((plano) => (
          <Card key={plano.id} className="shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plano.titulo}</CardTitle>
                {planoSelecionado && planoAtual === plano.id && (
                  <Badge variant="secondary">{t("Atual", "Current")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {idioma === "en-US" ? plano.descricaoEn : plano.descricao}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-semibold">{obterPrecoPlano(plano)}</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(idioma === "en-US" ? plano.recursosEn : plano.recursos).map(
                  (recurso) => (
                  <li key={recurso}>• {recurso}</li>
                  )
                )}
              </ul>
              <Button
                variant="outline"
                className="w-full"
                disabled={!isAdmin || salvandoPlano}
                onClick={() => handleSelecionarPlano(plano.id)}
              >
                {planoSelecionando === plano.id
                  ? t("Selecionando...", "Selecting...")
                  : t("Selecionar plano", "Select plan")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
