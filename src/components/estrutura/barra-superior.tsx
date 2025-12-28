"use client";
import * as React from "react";
import { Bell, Building2, ChevronDown, Layers } from "lucide-react";
import { BreadcrumbApp } from "@/components/estrutura/breadcrumb-app";
import { MenuPerfil } from "@/components/estrutura/menu-perfil";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { cn } from "@/lib/utils";
import { IconeCanal } from "@/components/inbox/icone-canal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
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
    titulo: "Ticket prioridade alta",
    descricao: "Chamado #129 exige retorno hoje.",
    tempo: "1h",
    categoria: "Suporte",
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
  const { workspace, canais } = useAutenticacao();
  const canaisConectados = canais.filter((canal) => canal.conectado);
  const [notificacoes, setNotificacoes] = React.useState(notificacoesMock);
  const [indiceMais, setIndiceMais] = React.useState(0);
  const podeCarregarMais = indiceMais < notificacoesExtras.length;
  const handleCarregarMais = React.useCallback(() => {
    if (!podeCarregarMais) return;
    const proximos = notificacoesExtras.slice(indiceMais, indiceMais + 2);
    setNotificacoes((atual) => [...atual, ...proximos]);
    setIndiceMais((atual) => atual + proximos.length);
  }, [indiceMais, podeCarregarMais]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <BreadcrumbApp />
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {workspace.nome}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{workspace.nome}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Canais ativos
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Canais conectados</DropdownMenuLabel>
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
                  <p className="text-sm font-semibold">Notificações</p>
                  <p className="text-xs text-muted-foreground">
                    {notificacoes.filter((item) => item.nova).length} novas
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7">
                  Marcar tudo
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
                {podeCarregarMais ? "Carregar mais" : "Sem mais notificações"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <MenuPerfil />
        </div>
      </div>
    </header>
  );
}
