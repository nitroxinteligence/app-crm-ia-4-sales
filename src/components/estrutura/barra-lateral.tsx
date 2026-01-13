"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { itensNavegacao } from "@/lib/navegacao";
import { obterTituloNavegacao, texto } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { MenuPerfil } from "@/components/estrutura/menu-perfil";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  obterNotificacoesLocal,
  ouvirNotificacoes,
  type NotificacaoUI,
} from "@/lib/notificacoes";

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

export function BarraLateral({
  colapsada,
  aoAlternar,
}: {
  colapsada: boolean;
  aoAlternar: () => void;
}) {
  const pathname = usePathname();
  const { idioma } = useAutenticacao();
  const itensCore = itensNavegacao.filter((item) => item.grupo === "core");
  const itensInteligencia = itensNavegacao.filter(
    (item) =>
      item.grupo === "inteligencia" &&
      !["prospeccao", "email-marketing"].includes(item.id)
  );
  const itensSidebar = [...itensCore, ...itensInteligencia];
  const [notificacoesBase, setNotificacoesBase] =
    React.useState(notificacoesMock);
  const [notificacoesDinamicas, setNotificacoesDinamicas] = React.useState<
    NotificacaoUI[]
  >([]);
  const [indiceMais, setIndiceMais] = React.useState(0);
  const [menusProntos, setMenusProntos] = React.useState(false);
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

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all",
        colapsada ? "w-16" : "w-56"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-3",
          colapsada ? "justify-center" : "justify-between"
        )}
      >
        {colapsada ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={aoAlternar}
            aria-label={texto(idioma, "Expandir barra lateral", "Expand sidebar")}
            className="h-10 w-10"
          >
            <PanelLeft className={cn("h-4 w-4", "rotate-180")} />
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <img
                src="https://ksalwtadilmtijouekpa.supabase.co/storage/v1/object/sign/doc-interno/PNG%20-%20IA%20FOUR%20SALES.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMDBmM2UzZi04OGFkLTQwNjctODY5MC0wOWQyMzUzYzUxMzAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2MtaW50ZXJuby9QTkcgLSBJQSBGT1VSIFNBTEVTLnN2ZyIsImlhdCI6MTc2ODAwOTY1NiwiZXhwIjoyMTE0OTA1NjU2fQ.-69IsEegSz9-qQp1x4ZhUw3TjSUm4g5aTh9mmd-Ak_0"
                alt="IA FOUR SALES"
                className="h-6 w-auto"
              />
          </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={aoAlternar}
              aria-label={texto(idioma, "Recolher barra lateral", "Collapse sidebar")}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <Separator />
      <TooltipProvider delayDuration={0}>
        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            <div className="mt-2 space-y-1">
              {itensSidebar.map((item) => (
                <ItemNavegacao
                  key={item.id}
                  ativo={pathname.startsWith(item.href)}
                  colapsada={colapsada}
                  disponivel={item.disponivel}
                  href={item.href}
                  icone={item.icone}
                  titulo={obterTituloNavegacao(idioma, item.id, item.titulo)}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </TooltipProvider>
      <div className="mt-auto px-3 pb-4 pt-2">
        <div
          className={cn(
            "flex flex-col gap-2",
            colapsada ? "items-center" : "items-stretch"
          )}
        >
          {menusProntos ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={colapsada ? "icon" : "default"}
                  className={cn(
                    "relative h-10",
                    colapsada ? "w-10" : "w-full justify-start gap-3 px-3"
                  )}
                >
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {!colapsada && (
                    <span className="text-sm font-medium">Notificações</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-96 p-0">
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
            <Button
              variant="ghost"
              size={colapsada ? "icon" : "default"}
              className={cn(
                "relative h-10",
                colapsada ? "w-10" : "w-full justify-start gap-3 px-3"
              )}
              disabled
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
              </span>
              {!colapsada && (
                <span className="text-sm font-medium">Notificações</span>
              )}
            </Button>
          )}
          <MenuPerfil
            align="start"
            side="right"
            mostrarNome={!colapsada}
            className={cn(!colapsada && "w-full justify-start gap-3 px-3")}
          />
        </div>
      </div>
    </aside>
  );
}

function ItemNavegacao({
  ativo,
  colapsada,
  disponivel,
  href,
  icone: Icone,
  titulo,
}: {
  ativo: boolean;
  colapsada: boolean;
  disponivel: boolean;
  href: string;
  icone: React.ElementType;
  titulo: string;
}) {
  const conteudo = (
    <Button
      variant={ativo ? "secondary" : "ghost"}
      className={cn(
        "h-10 w-full justify-start gap-3",
        colapsada && "justify-center",
        ativo && "text-primary",
        !disponivel && "cursor-not-allowed opacity-50"
      )}
      disabled={!disponivel}
    >
      <Icone className="h-4 w-4" />
      {!colapsada && <span className="text-sm">{titulo}</span>}
    </Button>
  );

  const item = disponivel ? (
    <Button
      asChild
      variant={ativo ? "secondary" : "ghost"}
      className={cn(
        "h-10 w-full justify-start gap-3",
        colapsada && "justify-center",
        ativo && "text-primary"
      )}
    >
      <Link
        href={href}
        className="text-sm"
      >
        <Icone className="h-4 w-4" />
        {!colapsada && <span className="text-sm">{titulo}</span>}
      </Link>
    </Button>
  ) : (
    conteudo
  );

  if (!colapsada) {
    return item;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent
        side="right"
        className="bg-primary text-xs text-primary-foreground"
        arrowClassName="bg-primary fill-primary"
      >
        {titulo}
      </TooltipContent>
    </Tooltip>
  );
}
