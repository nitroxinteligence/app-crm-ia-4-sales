"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastAviso } from "@/components/ui/toast-aviso";

type IntegracoesStatus = {
  whatsapp: boolean;
  whatsappBaileys: boolean;
  instagram: boolean;
};

type WorkspaceResumo = {
  id: string;
  nome: string;
  segmento: string;
  tamanho_time: string;
};

type OnboardingSettings = {
  onboarding_concluido: boolean;
  onboarding_pulado: boolean;
  onboarding_etapas: string[];
};

const etapas = [
  {
    id: "workspace",
    titulo: "Dados do workspace",
    descricao: "Defina empresa, segmento e tamanho do time.",
  },
  {
    id: "canais",
    titulo: "Conectar canais",
    descricao: "WhatsApp oficial (recomendado) e Instagram Direct.",
  },
  {
    id: "agente",
    titulo: "Configurar agente",
    descricao: "Crie o primeiro agente e ative o atendimento.",
  },
  {
    id: "final",
    titulo: "Revisao final",
    descricao: "Resumo do setup antes de seguir para o painel.",
  },
];

const opcoesTime = [
  "1-3 pessoas",
  "4-10 pessoas",
  "11-25 pessoas",
  "26-50 pessoas",
  "50+ pessoas",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [passoAtual, setPassoAtual] = React.useState(0);
  const [workspace, setWorkspace] = React.useState<WorkspaceResumo>({
    id: "",
    nome: "",
    segmento: "",
    tamanho_time: "",
  });
  const [nomeUsuario, setNomeUsuario] = React.useState("");
  const [role, setRole] = React.useState<string | null>(null);
  const [integracoes, setIntegracoes] = React.useState<IntegracoesStatus>({
    whatsapp: false,
    whatsappBaileys: false,
    instagram: false,
  });
  const [agentesTotal, setAgentesTotal] = React.useState(0);
  const [settings, setSettings] = React.useState<OnboardingSettings>({
    onboarding_concluido: false,
    onboarding_pulado: false,
    onboarding_etapas: [],
  });
  const [toastMensagem, setToastMensagem] = React.useState<string | null>(null);

  const etapaStatus = React.useMemo(() => {
    const workspaceOk =
      Boolean(workspace.nome?.trim()) &&
      Boolean(workspace.segmento?.trim()) &&
      Boolean(workspace.tamanho_time?.trim());
    const canaisOk =
      integracoes.whatsapp || integracoes.whatsappBaileys || integracoes.instagram;
    const agenteOk = agentesTotal > 0;
    return {
      workspace: workspaceOk,
      canais: canaisOk,
      agente: agenteOk,
      final: workspaceOk && canaisOk && agenteOk,
    };
  }, [agentesTotal, integracoes, workspace.nome, workspace.segmento, workspace.tamanho_time]);

  const progresso = React.useMemo(() => {
    const total = 3;
    const concluidas = [etapaStatus.workspace, etapaStatus.canais, etapaStatus.agente].filter(Boolean)
      .length;
    return Math.round((concluidas / total) * 100);
  }, [etapaStatus]);

  const passoAtualInfo = etapas[passoAtual];
  const podeEditar = role === "ADMIN";
  const etapaFinal = passoAtual === etapas.length - 1;

  const carregarStatusIntegracoes = React.useCallback(async (workspaceId: string) => {
    const [{ data: integracoesData }, { data: contasWhatsapp }] = await Promise.all([
      supabaseClient
        .from("integrations")
        .select("canal, status")
        .eq("workspace_id", workspaceId)
        .in("canal", ["whatsapp", "instagram"]),
      supabaseClient
        .from("integration_accounts")
        .select("status, provider, integrations!inner(workspace_id, canal)")
        .eq("integrations.workspace_id", workspaceId)
        .eq("integrations.canal", "whatsapp"),
    ]);

    const whatsappOficial = (contasWhatsapp ?? []).some(
      (conta) =>
        (conta.provider === "whatsapp_oficial" || !conta.provider) &&
        conta.status === "conectado"
    );
    const whatsappBaileys = (contasWhatsapp ?? []).some(
      (conta) => conta.provider === "whatsapp_baileys" && conta.status === "conectado"
    );

    const status: IntegracoesStatus = {
      whatsapp: whatsappOficial,
      whatsappBaileys,
      instagram: false,
    };
    (integracoesData ?? []).forEach((item) => {
      if (item.status === "conectado" && item.canal === "instagram") {
        status.instagram = true;
      }
    });
    setIntegracoes(status);
  }, []);

  const carregarAgentes = React.useCallback(async (workspaceId: string) => {
    const { count } = await supabaseClient
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    setAgentesTotal(count ?? 0);
  }, []);

  const atualizarOnboarding = React.useCallback(
    async (workspaceId: string, status: typeof etapaStatus) => {
      const etapasConcluidas = [
        status.workspace ? "workspace" : null,
        status.canais ? "canais" : null,
        status.agente ? "agente" : null,
      ].filter(Boolean) as string[];

      const concluido = status.workspace && status.canais && status.agente;
      if (
        settings.onboarding_concluido === concluido &&
        settings.onboarding_pulado === false &&
        JSON.stringify(settings.onboarding_etapas) === JSON.stringify(etapasConcluidas)
      ) {
        return;
      }

      const { data } = await supabaseClient
        .from("workspace_settings")
        .update({
          onboarding_etapas: etapasConcluidas,
          onboarding_concluido: concluido,
          onboarding_pulado: false,
        })
        .eq("workspace_id", workspaceId)
        .select("onboarding_concluido, onboarding_pulado, onboarding_etapas")
        .maybeSingle();

      if (data) {
        setSettings({
          onboarding_concluido: data.onboarding_concluido,
          onboarding_pulado: data.onboarding_pulado,
          onboarding_etapas: data.onboarding_etapas ?? [],
        });
      }
    },
    [settings.onboarding_concluido, settings.onboarding_etapas, settings.onboarding_pulado]
  );

  const carregarDados = React.useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    setSession(session);

    const { data: membership } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!membership?.workspace_id) {
      setErro("Workspace nao encontrado.");
      setCarregando(false);
      return;
    }

    setRole(membership.role ?? null);

    const workspaceId = membership.workspace_id;
    const [workspaceResponse, profileResponse, settingsResponse] = await Promise.all([
      supabaseClient
        .from("workspaces")
        .select("id, nome, segmento, tamanho_time")
        .eq("id", workspaceId)
        .maybeSingle(),
      supabaseClient
        .from("profiles")
        .select("nome")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabaseClient
        .from("workspace_settings")
        .select("onboarding_concluido, onboarding_pulado, onboarding_etapas")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
    ]);

    if (workspaceResponse.data) {
      setWorkspace({
        id: workspaceResponse.data.id,
        nome: workspaceResponse.data.nome ?? "",
        segmento: workspaceResponse.data.segmento ?? "",
        tamanho_time: workspaceResponse.data.tamanho_time ?? "",
      });
    }

    if (profileResponse.data?.nome) {
      setNomeUsuario(profileResponse.data.nome);
    } else {
      setNomeUsuario(session.user.email ?? "");
    }

    if (settingsResponse.data) {
      setSettings({
        onboarding_concluido: settingsResponse.data.onboarding_concluido ?? false,
        onboarding_pulado: settingsResponse.data.onboarding_pulado ?? false,
        onboarding_etapas: settingsResponse.data.onboarding_etapas ?? [],
      });
    }

    await Promise.all([
      carregarStatusIntegracoes(workspaceId),
      carregarAgentes(workspaceId),
    ]);

    setCarregando(false);
  }, [carregarAgentes, carregarStatusIntegracoes, router]);

  React.useEffect(() => {
    carregarDados().catch(() => setCarregando(false));
  }, [carregarDados]);

  React.useEffect(() => {
    if (!workspace.id) return;
    atualizarOnboarding(workspace.id, etapaStatus).catch(() => null);
  }, [atualizarOnboarding, etapaStatus, workspace.id]);

  const handleSalvarWorkspace = async () => {
    if (!workspace.id) return;
    if (!podeEditar) {
      setErro("Apenas administradores podem editar o onboarding.");
      return;
    }
    setSalvando(true);
    setErro(null);

    const { error: workspaceError } = await supabaseClient
      .from("workspaces")
      .update({
        nome: workspace.nome,
        segmento: workspace.segmento,
        tamanho_time: workspace.tamanho_time,
      })
      .eq("id", workspace.id);

    if (workspaceError) {
      setErro("Nao foi possivel salvar os dados.");
      setSalvando(false);
      return;
    }

    const userResponse = await supabaseClient.auth.getUser();
    const userId = userResponse.data.user?.id;
    if (userId) {
      await supabaseClient
        .from("profiles")
        .update({ nome: nomeUsuario })
        .eq("user_id", userId);
    }

    setSalvando(false);
    setPassoAtual((atual) => Math.min(atual + 1, etapas.length - 1));
  };

  const handleAtualizarStatus = async () => {
    if (!workspace.id) return;
    setCarregando(true);
    await Promise.all([
      carregarStatusIntegracoes(workspace.id),
      carregarAgentes(workspace.id),
    ]);
    setCarregando(false);
  };

  const handlePular = async () => {
    if (!workspace.id) {
      router.push("/planos");
      return;
    }
    await supabaseClient
      .from("workspace_settings")
      .update({ onboarding_pulado: true })
      .eq("workspace_id", workspace.id);
    router.push("/planos");
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando onboarding...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastAviso
        mensagem={toastMensagem}
        onClose={() => setToastMensagem(null)}
        variante="erro"
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Onboarding do workspace
              </div>
              <h1 className="text-2xl font-semibold">
                Configure sua operacao em poucos passos
              </h1>
              <p className="text-sm text-muted-foreground">
                Voce pode pular etapas, mas precisa escolher um plano para liberar o app.
              </p>
            </div>
            <Button variant="ghost" onClick={handlePular}>
              Pular por enquanto
            </Button>
          </div>

          {erro && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Progresso geral
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progresso}% concluido</span>
                  <span>
                    {passoAtual + 1}/{etapas.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {etapas.map((etapa, index) => {
                  const ativo = index === passoAtual;
                  const concluida = etapaStatus[etapa.id as keyof typeof etapaStatus];
                  return (
                    <button
                      key={etapa.id}
                      type="button"
                      onClick={() => setPassoAtual(index)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition",
                        ativo
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/60 bg-background/70"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                          ativo
                            ? "border-primary text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {concluida ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{etapa.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {etapa.descricao}
                        </p>
                      </div>
                      {concluida && (
                        <Badge variant="outline" className="text-[10px]">
                          OK
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="border-border/60">
              <CardContent className="space-y-6 p-6">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{passoAtualInfo.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {passoAtualInfo.descricao}
                  </p>
                </div>

                {passoAtualInfo.id === "workspace" && (
                  <div className="space-y-4">
                    {!podeEditar && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                        Apenas administradores podem editar os dados do workspace.
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Nome da empresa</p>
                        <Input
                          value={workspace.nome}
                          onChange={(event) =>
                            setWorkspace((atual) => ({
                              ...atual,
                              nome: event.target.value,
                            }))
                          }
                          placeholder="Vertical Partners"
                          disabled={!podeEditar}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Seu nome</p>
                        <Input
                          value={nomeUsuario}
                          onChange={(event) => setNomeUsuario(event.target.value)}
                          placeholder="Nome completo"
                          disabled={!podeEditar}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Segmento</p>
                        <Input
                          value={workspace.segmento}
                          onChange={(event) =>
                            setWorkspace((atual) => ({
                              ...atual,
                              segmento: event.target.value,
                            }))
                          }
                          placeholder="Ex: Servicos, SaaS, Consultoria"
                          disabled={!podeEditar}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Tamanho do time</p>
                        <Select
                          value={workspace.tamanho_time}
                          onValueChange={(valor) =>
                            setWorkspace((atual) => ({
                              ...atual,
                              tamanho_time: valor,
                            }))
                          }
                          disabled={!podeEditar}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {opcoesTime.map((opcao) => (
                              <SelectItem key={opcao} value={opcao}>
                                {opcao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSalvarWorkspace} disabled={salvando || !podeEditar}>
                      {salvando ? "Salvando..." : "Salvar e continuar"}
                    </Button>
                  </div>
                )}

                {passoAtualInfo.id === "canais" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      O WhatsApp oficial é recomendado para ativar automações com IA. A API não oficial usa QR Code.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        {
                          id: "whatsapp",
                          label: "WhatsApp oficial",
                          connected: integracoes.whatsapp,
                        },
                        {
                          id: "whatsapp-baileys",
                          label: "WhatsApp (API não oficial)",
                          connected: integracoes.whatsappBaileys,
                        },
                        {
                          id: "instagram",
                          label: "Instagram Direct",
                          connected: integracoes.instagram,
                        },
                      ].map((item) => (
                        <Card key={item.id} className="border-border/60">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <Badge variant={item.connected ? "default" : "outline"}>
                                {item.connected ? "Conectado" : "Pendente"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.connected
                                ? "Canal pronto para receber mensagens."
                                : "Conecte para receber mensagens no inbox."}
                            </p>
                            <Button asChild variant={item.connected ? "secondary" : "default"}>
                              <Link href="/app/integracoes">
                                {item.connected ? "Gerenciar" : "Conectar"}
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Button variant="outline" onClick={handleAtualizarStatus}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar status
                    </Button>
                    <Button onClick={() => setPassoAtual((atual) => atual + 1)}>
                      Continuar
                    </Button>
                  </div>
                )}

                {passoAtualInfo.id === "agente" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      Crie ao menos um agente para automatizar o atendimento.
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold">Agentes criados</p>
                        <p className="text-xs text-muted-foreground">
                          {agentesTotal} agente(s) cadastrados
                        </p>
                      </div>
                      {agentesTotal > 0 && <Badge variant="default">Pronto</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href="/app/agentes/novo">Criar agente</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/app/agentes">Ver agentes</Link>
                      </Button>
                      <Button variant="ghost" onClick={handleAtualizarStatus}>
                        Atualizar status
                      </Button>
                    </div>
                    <Button onClick={() => setPassoAtual((atual) => atual + 1)}>
                      Continuar
                    </Button>
                  </div>
                )}

                {passoAtualInfo.id === "final" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      Confira o que ja esta pronto. Voce pode finalizar agora ou
                      ajustar depois.
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Workspace configurado", ok: etapaStatus.workspace },
                        { label: "Canais conectados", ok: etapaStatus.canais },
                        { label: "Agente criado", ok: etapaStatus.agente },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            {item.ok ? (
                              <BadgeCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-border/60" />
                            )}
                            {item.label}
                          </div>
                          <Badge variant={item.ok ? "default" : "outline"}>
                            {item.ok ? "OK" : "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button asChild>
                      <Link href="/planos" className="flex items-center gap-2">
                        Ir para planos
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setPassoAtual((atual) => Math.max(0, atual - 1))}
                    disabled={passoAtual === 0}
                  >
                    Voltar
                  </Button>
                  {!etapaFinal && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPassoAtual((atual) => Math.min(etapas.length - 1, atual + 1))
                      }
                    >
                      Avancar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
