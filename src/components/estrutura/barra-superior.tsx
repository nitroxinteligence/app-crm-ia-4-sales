"use client";
import * as React from "react";
import { Bell, Building2, ChevronDown, Layers } from "lucide-react";
import { usePathname } from "next/navigation";
import { BreadcrumbApp } from "@/components/estrutura/breadcrumb-app";
import { MenuPerfil } from "@/components/estrutura/menu-perfil";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { cn } from "@/lib/utils";
import { texto } from "@/lib/idioma";
import { IconeCanal } from "@/components/inbox/icone-canal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";
import {
  obterNotificacoesLocal,
  ouvirNotificacoes,
  type NotificacaoUI,
} from "@/lib/notificacoes";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notificacoesMock = [
  {
    id: "notif-1",
    titulo: "Novo lead qualificado",
    descricao: "Luiza Rocha entrou no funil.",
    tempo: "Agora",
    categoria: "Leads",
    nova: true,
  },
  {
    id: "notif-2",
    titulo: "Agente sugeriu resposta",
    descricao: "Inbox: conversa com alta intenção.",
    tempo: "12 min",
    categoria: "Inbox",
    nova: true,
  },
  {
    id: "notif-3",
    titulo: "Follow-up atrasado",
    descricao: "3 conversas aguardam retorno.",
    tempo: "1h",
    categoria: "Inbox",
    nova: false,
  },
];

const notificacoesExtras = [
  {
    id: "notif-4",
    titulo: "Negociação atualizada",
    descricao: "Etapa movida para Qualificado.",
    tempo: "2h",
    categoria: "Funil",
    nova: false,
  },
  {
    id: "notif-5",
    titulo: "Novo contato importado",
    descricao: "15 contatos adicionados ao CRM.",
    tempo: "3h",
    categoria: "Contatos",
    nova: false,
  },
  {
    id: "notif-6",
    titulo: "Atividade agendada",
    descricao: "Reunião com Rafaela Torres.",
    tempo: "Hoje",
    categoria: "Agenda",
    nova: false,
  },
];

export function BarraSuperior() {
  const { workspace, canais, idioma } = useAutenticacao();
  const pathname = usePathname();
  const canaisConectados = canais.filter((canal) => canal.conectado);
  const [notificacoesBase, setNotificacoesBase] =
    React.useState(notificacoesMock);
  const [notificacoesDinamicas, setNotificacoesDinamicas] = React.useState<
    NotificacaoUI[]
  >([]);
  const [indiceMais, setIndiceMais] = React.useState(0);
  const [menusProntos, setMenusProntos] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{
    status: string;
    total?: number;
    done?: number;
  } | null>(null);
  const podeCarregarMais = indiceMais < notificacoesExtras.length;
  const handleCarregarMais = React.useCallback(() => {
    if (!podeCarregarMais) return;
    const proximos = notificacoesExtras.slice(indiceMais, indiceMais + 2);
    setNotificacoesBase((atual) => [...atual, ...proximos]);
    setIndiceMais((atual) => atual + proximos.length);
  }, [indiceMais, podeCarregarMais]);

  const notificacoes = React.useMemo(
    () => [...notificacoesDinamicas, ...notificacoesBase],
    [notificacoesBase, notificacoesDinamicas]
  );

  React.useEffect(() => {
    setMenusProntos(true);
  }, []);

  React.useEffect(() => {
    const atualizarNotificacoes = () => {
      setNotificacoesDinamicas(obterNotificacoesLocal());
    };
    atualizarNotificacoes();
    return ouvirNotificacoes(atualizarNotificacoes);
  }, []);

  React.useEffect(() => {
    if (!workspace.id || !pathname?.startsWith("/app/inbox")) {
      setSyncStatus(null);
      return;
    }

    let ativo = true;
    const controller = new AbortController();

    const carregar = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return;
      const response = await fetch(
        `/api/integrations/whatsapp-baileys/status?workspaceId=${workspace.id}`,
        {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          signal: controller.signal,
        }
      );
      if (!response.ok) return;
      const payload = await response.json();
      if (!ativo) return;
      const account = payload?.accounts?.[0] ?? null;
      if (!account || account.status !== "conectado") {
        setSyncStatus(null);
        return;
      }
      if (!account?.sync_status || account.sync_status !== "running") {
        setSyncStatus(null);
        return;
      }
      setSyncStatus({
        status: account.sync_status,
        total: account.sync_total ?? undefined,
        done: account.sync_done ?? undefined,
      });
    };

    carregar().catch((error) => {
      if (error?.name === "AbortError") return;
    });
    const intervalo = setInterval(() => {
      carregar().catch((error) => {
        if (error?.name === "AbortError") return;
      });
    }, 5000);

    return () => {
      ativo = false;
      controller.abort();
      clearInterval(intervalo);
    };
  }, [pathname, workspace.id]);

  const progressoSync = React.useMemo(() => {
    if (!syncStatus?.total || !syncStatus?.done) return 0;
    return Math.min(100, Math.max(0, Math.round((syncStatus.done / syncStatus.total) * 100)));
  }, [syncStatus]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <BreadcrumbApp />
        </div>
        <div className="flex items-center gap-3">
          {pathname?.startsWith("/app/inbox") && syncStatus ? (
            <div className="flex items-center gap-3 rounded-[3px] border border-border/60 bg-card/60 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Sincronizando histórico
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progressoSync}%` }}
                />
              </div>
            </div>
          ) : null}
          {menusProntos ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-[3px] shadow-none">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {workspace.nome}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-[3px]">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {texto(idioma, "Workspaces", "Workspaces")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked
                  className="data-[state=checked]:text-primary data-[state=checked]:[&>span>svg]:text-primary"
                >
                  {workspace.nome}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="gap-2 rounded-[3px] shadow-none"
              disabled
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {workspace.nome}
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}

          {menusProntos ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-[3px] shadow-none">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {texto(idioma, "Canais ativos", "Active channels")}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-[3px]">
                <DropdownMenuLabel>
                  {texto(idioma, "Canais conectados", "Connected channels")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canaisConectados.map((canal) => (
                  <DropdownMenuItem key={canal.id}>
                    <div className="flex items-center gap-2">
                      <IconeCanal canal={canal.id} className="h-3 w-3" />
                      <span>{canal.nome}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="gap-2 rounded-[3px] shadow-none"
              disabled
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              {texto(idioma, "Canais ativos", "Active channels")}
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}

          {menusProntos ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {texto(idioma, "Notificações", "Notifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notificacoes.filter((item) => item.nova).length}{" "}
                      {texto(idioma, "novas", "new")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7">
                    {texto(idioma, "Marcar tudo", "Mark all")}
                  </Button>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-auto py-1">
                  {notificacoes.map((notificacao) => (
                    <DropdownMenuItem
                      key={notificacao.id}
                      className="flex items-start gap-3 px-4 py-3 focus:bg-muted/40"
                    >
                      <span
                        className={cn(
                          "mt-2 h-2 w-2 rounded-full",
                          notificacao.nova
                            ? "bg-primary"
                            : "bg-muted-foreground/40"
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {notificacao.titulo}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {notificacao.tempo}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notificacao.descricao}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {notificacao.categoria}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!podeCarregarMais}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleCarregarMais();
                  }}
                  className="justify-center text-sm text-primary"
                >
                  {podeCarregarMais
                    ? texto(idioma, "Carregar mais", "Load more")
                    : texto(idioma, "Sem mais notificações", "No more notifications")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" className="relative" disabled>
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
          )}

          <MenuPerfil />
        </div>
      </div>

    </header>
  );
}
