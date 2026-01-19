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
import { useNotifications } from "@/hooks/use-notifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCheck } from "lucide-react";

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

  const { notifications, unreadCount, markAsRead, mutate } = useNotifications();
  const [menusProntos, setMenusProntos] = React.useState(false);

  React.useEffect(() => {
    setMenusProntos(true);
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
                src="/logo-ia-four-sales.svg"
                alt="IA FOUR SALES"
                className="h-7.5 w-auto"
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
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  {!colapsada && (
                    <span className="text-sm font-medium">Notificações</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-[380px] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <p className="text-sm font-semibold">
                      {texto(idioma, "Notificações", "Notifications")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={texto(idioma, "Marcar tudo como lido", "Mark all as read")}
                    onClick={() => markAsRead()}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                </div>

                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                      value="all"
                      className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Todas
                    </TabsTrigger>
                    <TabsTrigger
                      value="unread"
                      className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      Não lidas
                      {unreadCount > 0 && (
                        <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {unreadCount}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="max-h-[400px] overflow-auto">
                    <TabsContent value="all" className="m-0">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                          <Bell className="mb-2 h-8 w-8 opacity-20" />
                          <p className="text-sm">Nenhuma notificação</p>
                        </div>
                      ) : (
                        notifications.map((notificacao) => (
                          <DropdownMenuItem
                            key={notificacao.id}
                            className={cn(
                              "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-muted/50",
                              !notificacao.read_at && "bg-primary/5"
                            )}
                            onSelect={(e) => {
                              e.preventDefault();
                              if (!notificacao.read_at) markAsRead(notificacao.id);
                            }}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              <span className="text-sm font-medium leading-none">
                                {notificacao.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(notificacao.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notificacao.description}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                {notificacao.category}
                              </Badge>
                              {!notificacao.read_at && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="unread" className="m-0">
                      {notifications.filter(n => !n.read_at).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                          <CheckCheck className="mb-2 h-8 w-8 opacity-20" />
                          <p className="text-sm">Tudo lido por aqui!</p>
                        </div>
                      ) : (
                        notifications
                          .filter(n => !n.read_at)
                          .map((notificacao) => (
                            <DropdownMenuItem
                              key={notificacao.id}
                              className="flex flex-col items-start gap-1 p-4 cursor-pointer bg-primary/5 focus:bg-primary/10"
                              onSelect={(e) => {
                                e.preventDefault();
                                markAsRead(notificacao.id);
                              }}
                            >
                              <div className="flex w-full items-start justify-between gap-2">
                                <span className="text-sm font-medium leading-none">
                                  {notificacao.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(notificacao.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notificacao.description}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                  {notificacao.category}
                                </Badge>
                              </div>
                            </DropdownMenuItem>
                          ))
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
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
