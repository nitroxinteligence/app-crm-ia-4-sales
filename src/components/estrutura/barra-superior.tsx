"use client";
import { Bell, ChevronDown } from "lucide-react";
import { BreadcrumbApp } from "@/components/estrutura/breadcrumb-app";
import { MenuPerfil } from "@/components/estrutura/menu-perfil";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
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
  },
  {
    id: "notif-2",
    titulo: "Agente sugeriu resposta",
    descricao: "Inbox: conversa com alta intencao.",
  },
  {
    id: "notif-3",
    titulo: "Ticket prioridade alta",
    descricao: "Chamado #129 exige retorno hoje.",
  },
];

export function BarraSuperior() {
  const { workspace, canais } = useAutenticacao();
  const canaisConectados = canais.filter((canal) => canal.conectado);

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
                {workspace.nome}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuItem>{workspace.nome}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-2 lg:flex">
            {canaisConectados.map((canal) => (
              <Badge
                key={canal.id}
                variant="secondary"
                className="border border-primary/20 bg-primary/10 text-primary"
              >
                {canal.nome}
              </Badge>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificacoes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificacoesMock.map((notificacao) => (
                <DropdownMenuItem key={notificacao.id} className="flex flex-col">
                  <span className="text-sm font-medium">
                    {notificacao.titulo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {notificacao.descricao}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <MenuPerfil />
        </div>
      </div>
    </header>
  );
}
