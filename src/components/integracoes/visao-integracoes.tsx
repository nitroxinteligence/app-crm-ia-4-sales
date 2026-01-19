"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import type { IntegracaoCanal } from "@/lib/integracoes";
import { integracoesDisponiveis } from "@/lib/integracoes";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { cn } from "@/lib/utils";
import { IconeCanal } from "@/components/inbox/icone-canal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalWhatsappBaileys } from "@/components/integracoes/modal-whatsapp-baileys";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAviso } from "@/components/ui/toast-aviso";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";

const IconeMessenger = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn("h-5 w-5", className)}
    aria-hidden
    focusable="false"
  >
    <defs>
      <linearGradient id="messenger-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00B2FF" />
        <stop offset="100%" stopColor="#006AFF" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#messenger-gradient)" />
    <path
      d="M6.7 15.1l4.1-4.3 2.4 2.3 4.1-2.4-4.6 4.7-2.4-2.3-3.6 2Z"
      fill="#fff"
    />
  </svg>
);

const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID ?? "";
const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "";

type StatusIntegracao = {
  connected: boolean;
  connectedAt?: string | null;
  account?: {
    nome?: string | null;
    identificador?: string | null;
    phone_number_id?: string | null;
    waba_id?: string | null;
    business_account_id?: string | null;
  } | null;
};

type ContaBaileys = {
  id: string;
  nome?: string | null;
  numero?: string | null;
  status?: string | null;
  sync_status?: string | null;
  sync_total?: number | null;
  sync_done?: number | null;
  sync_total_chats?: number | null;
  sync_done_chats?: number | null;
  connected_at?: string | null;
  instance_id?: string | null;
  identificador?: string | null;
};

type StatusInstanciaBaileys = {
  status?: string | null;
  numero?: string | null;
  nome?: string | null;
  qrcode?: string | null;
  connected?: boolean;
};

export function VisaoIntegracoes() {
  const { idioma, session } = useAutenticacao();
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [statusWhatsapp, setStatusWhatsapp] = React.useState<
    StatusIntegracao | null
  >(null);
  const [statusInstagram, setStatusInstagram] = React.useState<
    StatusIntegracao | null
  >(null);
  const [contasBaileys, setContasBaileys] = React.useState<ContaBaileys[]>([]);
  const [carregandoBaileys, setCarregandoBaileys] = React.useState(false);
  const [statusBaileys, setStatusBaileys] =
    React.useState<StatusInstanciaBaileys | null>(null);
  const [carregandoSessao, setCarregandoSessao] = React.useState(false);
  const [carregandoIntegracoes, setCarregandoIntegracoes] =
    React.useState(false);
  const [sdkReady, setSdkReady] = React.useState(false);
  const [erroIntegracao, setErroIntegracao] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [phoneNumberId, setPhoneNumberId] = React.useState("");
  const [wabaId, setWabaId] = React.useState("");
  const [instagramAccountId, setInstagramAccountId] = React.useState("");
  const [dialogoAberto, setDialogoAberto] = React.useState(false);
  const [dialogoModo, setDialogoModo] = React.useState<
    "gerenciar" | "conectar"
  >("conectar");
  const [integracaoSelecionada, setIntegracaoSelecionada] =
    React.useState<IntegracaoCanal | null>(null);
  const [modalBaileysAberto, setModalBaileysAberto] = React.useState(false);
  const [contaBaileysSelecionada, setContaBaileysSelecionada] =
    React.useState<string | null>(null);
  const [forcarNovaInstanciaBaileys, setForcarNovaInstanciaBaileys] =
    React.useState(false);
  const [toastMensagem, setToastMensagem] = React.useState<string | null>(null);
  const contaBaileysId = contasBaileys[0]?.id ?? null;

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );



  React.useEffect(() => {
    if (typeof window === "undefined" || !appId) return;

    if (window.FB) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      });
      setSdkReady(true);
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);
  }, []);

  const carregarWorkspace = React.useCallback(async (sessao: Session) => {
    const { data, error } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", sessao.user.id)
      .maybeSingle();

    if (!error) {
      setWorkspaceId(data?.workspace_id ?? null);
    }
  }, []);

  const carregarStatusWhatsapp = React.useCallback(
    async (sessao: Session, wsId: string) => {
      const response = await fetch(
        `/api/integrations/whatsapp/status?workspaceId=${wsId}`,
        {
          headers: {
            Authorization: `Bearer ${sessao.access_token}`,
          },
        }
      );

      if (!response.ok) {
        setStatusWhatsapp(null);
        return;
      }

      const data = (await response.json()) as StatusIntegracao;
      setStatusWhatsapp(data);
    },
    []
  );

  const carregarStatusInstagram = React.useCallback(
    async (sessao: Session, wsId: string) => {
      const response = await fetch(
        `/api/integrations/instagram/status?workspaceId=${wsId}`,
        {
          headers: {
            Authorization: `Bearer ${sessao.access_token}`,
          },
        }
      );

      if (!response.ok) {
        setStatusInstagram(null);
        return;
      }

      const data = (await response.json()) as StatusIntegracao;
      setStatusInstagram(data);
    },
    []
  );

  const carregarStatusBaileys = React.useCallback(
    async (sessao: Session, wsId: string, options?: { silencioso?: boolean }) => {
      if (!options?.silencioso) {
        setCarregandoBaileys(true);
      }
      const response = await fetch(
        `/api/integrations/whatsapp-baileys/status?workspaceId=${wsId}`,
        {
          headers: {
            Authorization: `Bearer ${sessao.access_token}`,
          },
        }
      );

      if (!response.ok) {
        setContasBaileys([]);
        setCarregandoBaileys(false);
        return;
      }

      const data = (await response.json()) as { accounts?: ContaBaileys[] };
      setContasBaileys(data.accounts ?? []);
      if (!options?.silencioso) {
        setCarregandoBaileys(false);
      }
    },
    []
  );

  const carregarStatusInstanciaBaileys = React.useCallback(
    async (sessao: Session, accountId: string) => {
      const response = await fetch(
        `/api/integrations/whatsapp-baileys/instance-status?integrationAccountId=${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${sessao.access_token}`,
          },
        }
      );

      if (!response.ok) {
        setStatusBaileys(null);
        return;
      }

      const data = (await response.json()) as StatusInstanciaBaileys;
      setStatusBaileys(data);
      setContasBaileys((prev) =>
        prev.map((conta) =>
          conta.id === accountId
            ? {
              ...conta,
              status: data.status ?? conta.status,
              numero: data.numero ?? conta.numero,
              nome: data.nome ?? conta.nome,
            }
            : conta
        )
      );
    },
    []
  );

  React.useEffect(() => {
    if (!session) {
      setWorkspaceId(null);
      setStatusWhatsapp(null);
      setStatusInstagram(null);
      setContasBaileys([]);
      setStatusBaileys(null);
      setCarregandoIntegracoes(false);
      return;
    }

    carregarWorkspace(session).catch(() => null);
  }, [carregarWorkspace, session]);

  React.useEffect(() => {
    if (!session || !workspaceId) return;
    const carregar = async () => {
      setCarregandoIntegracoes(true);
      await Promise.all([
        carregarStatusWhatsapp(session, workspaceId),
        carregarStatusInstagram(session, workspaceId),
        carregarStatusBaileys(session, workspaceId),
      ]);
      setCarregandoIntegracoes(false);
    };
    carregar().catch(() => setCarregandoIntegracoes(false));
  }, [
    carregarStatusWhatsapp,
    carregarStatusInstagram,
    carregarStatusBaileys,
    session,
    workspaceId,
  ]);

  React.useEffect(() => {
    if (!session || !workspaceId || !contaBaileysId) return;
    let ativo = true;
    const atualizar = async () => {
      if (!ativo) return;
      await carregarStatusBaileys(session, workspaceId, { silencioso: true });
    };
    atualizar().catch(() => undefined);
    const intervalo = window.setInterval(() => {
      atualizar().catch(() => undefined);
    }, 5000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [carregarStatusBaileys, contaBaileysId, session, workspaceId]);

  React.useEffect(() => {
    if (!session || !contaBaileysId) {
      setStatusBaileys(null);
      return;
    }
    carregarStatusInstanciaBaileys(session, contaBaileysId).catch(() => {
      setStatusBaileys(null);
    });
  }, [carregarStatusInstanciaBaileys, contaBaileysId, session]);

  const integracoes = React.useMemo(() => {
    const conectadosBaileys = contasBaileys.some(
      (conta) => conta.status === "conectado"
    );

    return integracoesDisponiveis.map((integracao) => {
      if (integracao.id === "whatsapp_oficial") {
        const conta = statusWhatsapp?.account;
        return {
          ...integracao,
          conectado: statusWhatsapp?.connected ?? false,
          conta: conta
            ? {
              nome: conta.nome ?? "WhatsApp Business",
              identificador:
                conta.phone_number_id ??
                conta.identificador ??
                t("Sem ID", "No ID"),
              responsavel: "WhatsApp",
              ultimaSincronizacao:
                statusWhatsapp?.connectedAt ?? t("Ativo", "Active"),
            }
            : undefined,
        };
      }

      if (integracao.id === "whatsapp_baileys") {
        return {
          ...integracao,
          conectado: conectadosBaileys,
        };
      }

      if (integracao.id === "instagram") {
        const conta = statusInstagram?.account;
        return {
          ...integracao,
          conectado: statusInstagram?.connected ?? false,
          conta: conta
            ? {
              nome: conta.nome ?? "@instagram",
              identificador: conta.identificador ?? t("Sem ID", "No ID"),
              responsavel: "Instagram",
              ultimaSincronizacao:
                statusInstagram?.connectedAt ?? t("Ativo", "Active"),
            }
            : undefined,
        };
      }

      return {
        ...integracao,
        conectado: false,
      };
    });
  }, [contasBaileys, statusInstagram, statusWhatsapp, t]);

  const integracoesFiltradas = integracoes;

  const obterTituloIntegracao = React.useCallback(
    (integracao: IntegracaoCanal) =>
      idioma === "en-US" ? integracao.tituloEn : integracao.titulo,
    [idioma]
  );

  const obterDescricaoIntegracao = React.useCallback(
    (integracao: IntegracaoCanal) =>
      idioma === "en-US" ? integracao.descricaoEn : integracao.descricao,
    [idioma]
  );

  const obterRecursosIntegracao = React.useCallback(
    (integracao: IntegracaoCanal) =>
      idioma === "en-US" ? integracao.recursosEn : integracao.recursos,
    [idioma]
  );

  const abrirDialogo = React.useCallback(
    (integracao: IntegracaoCanal, modo: "gerenciar" | "conectar") => {
      setIntegracaoSelecionada(integracao);
      setDialogoModo(modo);
      setDialogoAberto(true);
      setErroIntegracao(null);
    },
    []
  );

  const abrirModalBaileys = React.useCallback(
    (accountId?: string, forcarNovaInstancia?: boolean) => {
      setContaBaileysSelecionada(accountId ?? null);
      setForcarNovaInstanciaBaileys(Boolean(forcarNovaInstancia));
      setModalBaileysAberto(true);
    },
    []
  );

  const handleConectarWhatsapp = async () => {
    if (!session || !workspaceId) {
      setErroIntegracao(t("Autentique-se antes de conectar.", "Sign in before connecting."));
      return;
    }

    if (!sdkReady || !window.FB) {
      setErroIntegracao(
        t("SDK do Meta nao carregou. Tente novamente.", "Meta SDK did not load. Try again.")
      );
      return;
    }

    if (!configId) {
      setErroIntegracao(
        t("Config ID do Embedded Signup nao configurado.", "Embedded Signup config ID is missing.")
      );
      return;
    }

    if (window.location.protocol !== "https:") {
      setErroIntegracao(
        t(
          "O Embedded Signup exige HTTPS. Use o link seguro do tunnel.",
          "Embedded Signup requires HTTPS. Use the secure tunnel link."
        )
      );
      return;
    }

    setCarregando(true);
    setErroIntegracao(null);

    const handleMetaResponse = async (response: {
      authResponse?: { accessToken?: string; code?: string };
    }) => {
      const auth = response.authResponse;
      const code = auth?.code;
      const accessToken = auth?.accessToken;

      if (!code && !accessToken) {
        setErroIntegracao(
          t("Nao foi possivel obter o token da Meta.", "Unable to obtain Meta token.")
        );
        setCarregando(false);
        return;
      }

      const payload = {
        workspaceId,
        code,
        accessToken,
        phoneNumberId: phoneNumberId || undefined,
        wabaId: wabaId || undefined,
      };

      const resp = await fetch("/api/integrations/whatsapp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        setErroIntegracao(errorText || t("Falha ao conectar.", "Failed to connect."));
        setCarregando(false);
        return;
      }

      await carregarStatusWhatsapp(session, workspaceId);
      setCarregando(false);
      setDialogoAberto(false);
    };

    window.FB.login(
      (response) => {
        void handleMetaResponse(response);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging,business_management",
      }
    );
  };

  const handleConectarInstagram = async () => {
    if (!session || !workspaceId) {
      setErroIntegracao(t("Autentique-se antes de conectar.", "Sign in before connecting."));
      return;
    }

    if (!sdkReady || !window.FB) {
      setErroIntegracao(
        t("SDK do Meta nao carregou. Tente novamente.", "Meta SDK did not load. Try again.")
      );
      return;
    }

    if (window.location.protocol !== "https:") {
      setErroIntegracao(
        t(
          "O login do Meta exige HTTPS. Use o link seguro do tunnel.",
          "Meta login requires HTTPS. Use the secure tunnel link."
        )
      );
      return;
    }

    setCarregando(true);
    setErroIntegracao(null);

    const handleMetaResponse = async (response: {
      authResponse?: { accessToken?: string; code?: string };
    }) => {
      const auth = response.authResponse;
      const code = auth?.code;
      const accessToken = auth?.accessToken;

      if (!code && !accessToken) {
        setErroIntegracao(
          t("Nao foi possivel obter o token da Meta.", "Unable to obtain Meta token.")
        );
        setCarregando(false);
        return;
      }

      const payload = {
        workspaceId,
        code,
        accessToken,
        instagramAccountId: instagramAccountId || undefined,
      };

      const resp = await fetch("/api/integrations/instagram/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        setErroIntegracao(errorText || t("Falha ao conectar.", "Failed to connect."));
        setCarregando(false);
        return;
      }

      await carregarStatusInstagram(session, workspaceId);
      setCarregando(false);
      setDialogoAberto(false);
    };

    window.FB.login(
      (response) => {
        void handleMetaResponse(response);
      },
      {
        response_type: "code",
        override_default_response_type: true,
        scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement",
      }
    );
  };

  const handleConectadoBaileys = React.useCallback(() => {
    if (!session || !workspaceId) return;
    void carregarStatusBaileys(session, workspaceId);
  }, [carregarStatusBaileys, session, workspaceId]);

  const handleDesconectarBaileys = React.useCallback(async () => {
    if (!session || !workspaceId) return;
    const conta = contasBaileys[0];
    if (!conta?.id) return;

    setCarregandoBaileys(true);
    const response = await fetch(
      "/api/integrations/whatsapp-baileys/disconnect",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ integrationAccountId: conta.id }),
      }
    );

    if (!response.ok) {
      const mensagem = await response.text();
      setToastMensagem(mensagem || "Falha ao desconectar.");
      setCarregandoBaileys(false);
      return;
    }

    await carregarStatusBaileys(session, workspaceId);
    setStatusBaileys(null);
    setCarregandoBaileys(false);
  }, [carregarStatusBaileys, contasBaileys, session, workspaceId]);

  const tituloDialogo = integracaoSelecionada
    ? dialogoModo === "gerenciar"
      ? `${t("Gerenciar", "Manage")} ${obterTituloIntegracao(integracaoSelecionada)}`
      : `${t("Conectar", "Connect")} ${obterTituloIntegracao(integracaoSelecionada)}`
    : "";

  const descricaoDialogo =
    dialogoModo === "gerenciar"
      ? t(
        "Revise a conta vinculada, recursos ativos e status da sincronização.",
        "Review the linked account, active resources, and sync status."
      )
      : integracaoSelecionada?.id === "instagram"
        ? t(
          "Conecte o Instagram Business via login da Meta.",
          "Connect Instagram Business via Meta login."
        )
        : t(
          "Conecte a conta oficial via Embedded Signup da Meta.",
          "Connect the official account via Meta Embedded Signup."
        );

  const contaSelecionada = integracaoSelecionada?.conta;
  const contaBaileysAtiva = contasBaileys[0] ?? null;
  const baileysConectado =
    statusBaileys?.status === "conectado" ||
    contaBaileysAtiva?.status === "conectado";
  const syncStatusBaileys = contaBaileysAtiva?.sync_status ?? null;
  const syncStatusNormalizado =
    syncStatusBaileys ?? (baileysConectado ? "waiting" : null);
  const syncConcluidoBaileys = syncStatusNormalizado === "done";
  const syncAguardandoBaileys = syncStatusNormalizado === "waiting";
  const mostraSyncBaileys =
    baileysConectado &&
    (syncStatusNormalizado === "running" || syncAguardandoBaileys);
  const syncTotalBaileys =
    contaBaileysAtiva?.sync_total_chats ?? contaBaileysAtiva?.sync_total ?? null;
  const syncDoneBaileys =
    contaBaileysAtiva?.sync_done_chats ?? contaBaileysAtiva?.sync_done ?? null;
  const usaContagemChats = contaBaileysAtiva?.sync_total_chats != null;
  const progressoSyncBaileys = React.useMemo(() => {
    if (!syncTotalBaileys || syncTotalBaileys <= 0) {
      return 0;
    }
    const done = Math.max(0, syncDoneBaileys ?? 0);
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (done / syncTotalBaileys) * 100
        )
      )
    );
  }, [syncDoneBaileys, syncTotalBaileys]);

  if (!session && !carregandoSessao) {
    return null;
  }

  return (
    <>
      <ToastAviso
        mensagem={toastMensagem}
        onClose={() => setToastMensagem(null)}
        variante="erro"
      />
      <ModalWhatsappBaileys
        aberto={modalBaileysAberto}
        aoMudar={setModalBaileysAberto}
        session={session}
        workspaceId={workspaceId}
        integrationAccountId={contaBaileysSelecionada}
        forcarNovaInstancia={forcarNovaInstanciaBaileys}
        aoConectado={handleConectadoBaileys}
        aoAviso={(mensagem) => setToastMensagem(mensagem)}
      />
      <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {t("Conexões", "Connections")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Conecte canais oficiais para atender clientes no mesmo lugar.",
                "Connect official channels to support customers in one place."
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {carregandoSessao || (session && carregandoIntegracoes) ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="shadow-none">
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-[6px]" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex w-full items-center justify-between gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            integracoesFiltradas.map((integracao) => {
              const emBreve = integracao.id === "instagram";
              const conectado = emBreve ? false : integracao.conectado;
              const titulo = obterTituloIntegracao(integracao);
              const descricao = obterDescricaoIntegracao(integracao);
              const bloqueado =
                integracao.id === "whatsapp_oficial" || emBreve;
              const statusRotulo = bloqueado
                ? emBreve
                  ? t("Em breve", "Coming soon")
                  : t("Bloqueado", "Blocked")
                : conectado
                  ? t("Conectado", "Connected")
                  : t("Desconectado", "Disconnected");
              const statusVariante = "outline";
              const statusBadge = bloqueado
                ? "border-slate-200 bg-slate-50 text-slate-500"
                : conectado
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700";
              const statusDot = bloqueado
                ? "bg-slate-400"
                : conectado
                  ? "bg-emerald-500"
                  : "bg-amber-500";
              const destaqueBaileys =
                integracao.id === "whatsapp_baileys" && baileysConectado;
              return (
                <Card
                  key={integracao.id}
                  className={cn(
                    "shadow-none",
                    bloqueado && "border-dashed border-border/60 bg-muted/20 opacity-80",
                    destaqueBaileys && "border-emerald-200 bg-emerald-50/40"
                  )}
                >
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-muted/60">
                          <IconeCanal
                            canal={integracao.canalIcone}
                            className="h-5 w-5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold">
                            {titulo}
                          </CardTitle>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={t("Detalhes", "Details")}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-primary text-xs text-primary-foreground"
                              arrowClassName="bg-primary fill-primary"
                            >
                              {descricao}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Badge
                        variant={statusVariante}
                        className={cn("flex items-center gap-1.5", statusBadge)}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
                        {statusRotulo}
                      </Badge>
                    </div>
                  </CardHeader>
                  {integracao.id === "whatsapp_baileys" ? (
                    <CardContent className="space-y-3 pt-0">
                      {bloqueado && (
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "Indisponível no momento.",
                            "Unavailable right now."
                          )}
                        </p>
                      )}
                      <div className="space-y-2 rounded-[6px] border border-border/60 bg-muted/30 p-3">
                        {mostraSyncBaileys && (
                          <>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span>
                                {syncConcluidoBaileys
                                  ? "Sincronização concluída"
                                  : "Sincronizando histórico"}
                              </span>
                              {!syncAguardandoBaileys && syncTotalBaileys != null && (
                                <span>
                                  {syncDoneBaileys ?? 0}/{syncTotalBaileys}
                                </span>
                              )}
                            </div>
                            <Progress
                              className="h-1.5"
                              value={syncAguardandoBaileys ? 100 : progressoSyncBaileys}
                            />
                          </>
                        )}
                        {carregandoBaileys ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {(contaBaileysAtiva?.numero ||
                              contaBaileysAtiva?.identificador)
                              ? `${t("Último WhatsApp conectado", "Last WhatsApp connected")}: ${(contaBaileysAtiva?.numero?.split(":")[0] ??
                                contaBaileysAtiva?.identificador?.split(":")[0]) ??
                              ""
                              }`
                              : t("Nenhum número conectado", "No number connected")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  ) : null}
                  <CardFooter className="border-t pt-4">
                    <div className="flex w-full items-center justify-between gap-3">
                      {integracao.id !== "whatsapp_baileys" || !baileysConectado ? (
                        <span className="text-xs text-muted-foreground">
                          {bloqueado
                            ? emBreve
                              ? t("Integração pendente", "Integration pending")
                              : t("Indisponível no momento", "Unavailable right now")
                            : conectado
                              ? t("Integração ativa", "Integration active")
                              : t("Integração pendente", "Integration pending")}
                        </span>
                      ) : (
                        <span />
                      )}
                      {!emBreve && (
                        <Button
                          size="sm"
                          variant={bloqueado ? "outline" : conectado ? "secondary" : "default"}
                          disabled={bloqueado}
                          onClick={() => {
                            if (bloqueado) return;
                            if (integracao.id === "whatsapp_baileys") {
                              if (conectado) {
                                void handleDesconectarBaileys();
                              } else {
                                abrirModalBaileys();
                              }
                              return;
                            }
                            abrirDialogo(
                              integracao,
                              conectado ? "gerenciar" : "conectar"
                            );
                          }}
                        >
                          {bloqueado
                            ? t("Bloqueado", "Blocked")
                            : integracao.id === "whatsapp_baileys"
                              ? conectado
                                ? t("Desconectar", "Disconnect")
                                : t("Conectar", "Connect")
                              : conectado
                                ? t("Gerenciar", "Manage")
                                : t("Conectar", "Connect")}
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
          {!carregandoSessao && !(session && carregandoIntegracoes) && (
            <Card className="shadow-none border-dashed border-border/60 bg-muted/10">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-muted/60">
                      <IconeMessenger className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">
                        Messenger do Facebook
                      </CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-[6px] p-1 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={t("Detalhes", "Details")}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-primary text-xs text-primary-foreground"
                          arrowClassName="bg-primary fill-primary"
                        >
                          {t(
                            "Conecte seu Messenger para mensagens do Facebook.",
                            "Connect your Messenger for Facebook messages."
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-slate-50 text-slate-500"
                  >
                    {t("Em breve", "Coming soon")}
                  </Badge>
                </div>
              </CardHeader>
              <CardFooter className="border-t pt-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {t("Integração pendente", "Planned integration.")}
                  </span>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>

        <Dialog
          open={dialogoAberto}
          onOpenChange={(aberto) => {
            setDialogoAberto(aberto);
            if (!aberto) {
              setIntegracaoSelecionada(null);
              setPhoneNumberId("");
              setWabaId("");
              setInstagramAccountId("");
            }
          }}
        >
          {integracaoSelecionada && (
            <DialogContent className="sm:max-w-[560px] rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-muted/60">
                    <IconeCanal
                      canal={integracaoSelecionada.canalIcone}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle>{tituloDialogo}</DialogTitle>
                    <DialogDescription>{descricaoDialogo}</DialogDescription>
                  </div>
                  {dialogoModo === "gerenciar" && (
                    <Badge className="ml-auto">
                      {t("Conectado", "Connected")}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {dialogoModo === "gerenciar" ? (
                <div className="space-y-4">
                  <div className="rounded-[6px] border border-border/60 bg-muted/30 px-4 py-3">
                    <p className="text-sm font-medium">
                      {t("Conta vinculada", "Linked account")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Informações registradas na última sincronização.",
                        "Info captured on the last sync."
                      )}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("Conta", "Account")}
                      </p>
                      <p className="text-sm font-medium">
                        {contaSelecionada?.nome ?? t("Não informado", "Not provided")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("Identificador", "Identifier")}
                      </p>
                      <p className="text-sm font-medium">
                        {contaSelecionada?.identificador ?? "--"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("Responsável", "Owner")}
                      </p>
                      <p className="text-sm font-medium">
                        {contaSelecionada?.responsavel ?? t("Equipe", "Team")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("Última sincronização", "Last sync")}
                      </p>
                      <p className="text-sm font-medium">
                        {contaSelecionada?.ultimaSincronizacao ??
                          t("Sem dados", "No data")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("Recursos ativos", "Active resources")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {obterRecursosIntegracao(integracaoSelecionada).map((recurso) => (
                        <Badge
                          key={recurso}
                          variant="secondary"
                          className="bg-muted/60 text-muted-foreground"
                        >
                          {recurso}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[6px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-muted-foreground">
                    {t(
                      "A desconexão interrompe a entrada de novas mensagens no canal.",
                      "Disconnecting stops new messages from arriving."
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[6px] border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-sm font-medium">
                      {t("Conectar via Meta", "Connect via Meta")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {integracaoSelecionada?.id === "instagram"
                        ? t(
                          "Faça login no Meta para conectar o Instagram Business.",
                          "Sign in to Meta to connect Instagram Business."
                        )
                        : t(
                          "Faça login no Meta para conectar seu WhatsApp Business.",
                          "Sign in to Meta to connect your WhatsApp Business."
                        )}
                    </p>
                  </div>
                  {integracaoSelecionada?.id === "whatsapp_oficial" && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "Phone Number ID (opcional para casos onde o Meta não retorna).",
                            "Phone Number ID (optional if Meta does not return it)."
                          )}
                        </p>
                        <Input
                          placeholder="9024..."
                          value={phoneNumberId}
                          onChange={(event) => setPhoneNumberId(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "WABA ID (opcional para assinar webhooks manualmente).",
                            "WABA ID (optional if you need to sign webhooks manually)."
                          )}
                        </p>
                        <Input
                          placeholder="1304..."
                          value={wabaId}
                          onChange={(event) => setWabaId(event.target.value)}
                        />
                      </div>
                    </>
                  )}
                  {integracaoSelecionada?.id === "instagram" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Instagram Business ID (opcional para selecionar uma conta específica).",
                          "Instagram Business ID (optional to target a specific account)."
                        )}
                      </p>
                      <Input
                        placeholder="1784..."
                        value={instagramAccountId}
                        onChange={(event) => setInstagramAccountId(event.target.value)}
                      />
                    </div>
                  )}
                  {erroIntegracao && (
                    <p className="text-xs text-destructive">{erroIntegracao}</p>
                  )}
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("Fechar", "Close")}</Button>
                </DialogClose>
                {dialogoModo === "gerenciar" ? (
                  <DialogClose asChild>
                    <Button variant="destructive">
                      {t("Desconectar", "Disconnect")}
                    </Button>
                  </DialogClose>
                ) : (
                  <Button
                    onClick={
                      integracaoSelecionada?.id === "instagram"
                        ? handleConectarInstagram
                        : handleConectarWhatsapp
                    }
                    disabled={carregando}
                  >
                    {carregando
                      ? t("Conectando...", "Connecting...")
                      : t("Conectar", "Connect")}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </>
  );
}
