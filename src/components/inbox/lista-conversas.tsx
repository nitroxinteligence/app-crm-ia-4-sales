"use client";

import * as React from "react";
import {
  ChevronLeft,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { CanalId, ConversaInbox, StatusConversa } from "@/lib/types";
import { nomeCanal } from "@/lib/canais";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IconeCanal } from "@/components/inbox/icone-canal";

const statusTabs: { label: string; value: StatusConversa }[] = [
  { label: "Abertas", value: "aberta" },
  { label: "Pendentes", value: "pendente" },
  { label: "Resolvidas", value: "resolvida" },
  { label: "Spam", value: "spam" },
];

const canaisFiltro: { label: string; value: CanalId | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Instagram", value: "instagram" },
  { label: "Messenger", value: "messenger" },
  { label: "Email", value: "email" },
  { label: "LinkedIn", value: "linkedin" },
];

const iniciaisContato = (nome: string) =>
  nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const rotuloTipoMensagem = (tipo: string) => {
  if (tipo === "imagem") return "Imagem";
  if (tipo === "pdf") return "Arquivo PDF";
  if (tipo === "audio") return "Áudio";
  return "Mensagem";
};

export function ListaConversas({
  conversas,
  selecionadaId,
  aoSelecionar,
  aoMarcarNaoLido,
  statusAtual,
  aoAlterarStatus,
  busca,
  aoAlterarBusca,
  filtroCanal,
  aoAlterarFiltroCanal,
  filtroOwner,
  aoAlterarFiltroOwner,
  owners,
  somenteNaoLidas,
  aoAlterarSomenteNaoLidas,
  aoCarregarMais,
  temMais,
  colapsada,
  aoAlternarColapso,
}: {
  conversas: ConversaInbox[];
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  aoMarcarNaoLido: (id: string) => void;
  statusAtual: StatusConversa;
  aoAlterarStatus: (status: StatusConversa) => void;
  busca: string;
  aoAlterarBusca: (valor: string) => void;
  filtroCanal: CanalId | "todos";
  aoAlterarFiltroCanal: (valor: CanalId | "todos") => void;
  filtroOwner: string;
  aoAlterarFiltroOwner: (valor: string) => void;
  owners: string[];
  somenteNaoLidas: boolean;
  aoAlterarSomenteNaoLidas: (valor: boolean) => void;
  aoCarregarMais: () => void;
  temMais: boolean;
  colapsada: boolean;
  aoAlternarColapso: () => void;
}) {
  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const alvo = event.currentTarget;
      const chegouNoFim =
        alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 80;
      if (chegouNoFim && temMais) {
        aoCarregarMais();
      }
    },
    [aoCarregarMais, temMais]
  );

  if (colapsada) {
    return (
      <section className="flex h-auto flex-col items-center rounded-2xl border border-border/60 bg-card/40 py-4 transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)]">
        <Button
          variant="ghost"
          size="icon"
          onClick={aoAlternarColapso}
          aria-label="Expandir conversas"
        >
          <ChevronLeft className="h-4 w-4 rotate-180 transition-transform duration-300" />
        </Button>
      </section>
    );
  }

  return (
    <section className="flex h-auto flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)]">
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Conversas</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={aoAlternarColapso}
            aria-label="Recolher conversas"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusAtual}
            onValueChange={(value) => aoAlterarStatus(value as StatusConversa)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-3">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-3">
                <Select
                  value={filtroCanal}
                  onValueChange={(value) =>
                    aoAlterarFiltroCanal(value as CanalId | "todos")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {canaisFiltro.map((canal) => (
                      <SelectItem key={canal.value} value={canal.value}>
                        <div className="flex items-center gap-2">
                          {canal.value !== "todos" && (
                            <IconeCanal
                              canal={canal.value as CanalId}
                              className="h-3 w-3"
                            />
                          )}
                          <span>{canal.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroOwner} onValueChange={aoAlterarFiltroOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner === "todos" ? "Todos" : owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nao-lidas"
                    checked={somenteNaoLidas}
                    onCheckedChange={(valor) =>
                      aoAlterarSomenteNaoLidas(Boolean(valor))
                    }
                  />
                  <label
                    htmlFor="nao-lidas"
                    className="text-xs text-muted-foreground"
                  >
                    Mostrar apenas não lidas
                  </label>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => aoAlterarBusca(event.target.value)}
            placeholder="Buscar conversas"
            className="pl-9"
          />
        </div>
      </div>

      <Separator />

      <div
        className="flex-1 overflow-auto px-2 py-3"
        onScroll={handleScroll}
      >
        <div className="space-y-2">
          {conversas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            conversas.map((conversa) => (
              <div
                key={conversa.id}
                onClick={() => aoSelecionar(conversa.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    aoSelecionar(conversa.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "group w-full rounded-xl border border-transparent p-3 text-left transition",
                  "hover:border-primary/30 hover:bg-primary/5",
                  conversa.id === selecionadaId &&
                    "border-primary/40 bg-primary/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-9 w-9">
                      {conversa.contato.avatarUrl && (
                        <AvatarImage
                          src={conversa.contato.avatarUrl}
                          alt={conversa.contato.nome}
                        />
                      )}
                      <AvatarFallback>
                        {iniciaisContato(conversa.contato.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {conversa.contato.nome}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <IconeCanal canal={conversa.canal} className="h-3 w-3" />
                        <span>{nomeCanal(conversa.canal)}</span> •{" "}
                        {conversa.horario}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {conversa.naoLidas > 0 && (
                      <Badge className="h-5 rounded-full px-2 text-[10px]">
                        {conversa.naoLidas}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                          aria-label="Abrir ações da conversa"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            aoMarcarNaoLido(conversa.id);
                          }}
                        >
                          Marcar como não lido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {(() => {
                    const ultimaMensagem =
                      conversa.mensagens[conversa.mensagens.length - 1];
                    if (!ultimaMensagem) {
                      return conversa.ultimaMensagem;
                    }
                    if (ultimaMensagem.tipo === "texto") {
                      return ultimaMensagem.conteudo;
                    }
                    return `${rotuloTipoMensagem(ultimaMensagem.tipo)}: ${
                      ultimaMensagem.conteudo
                    }`;
                  })()}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {conversa.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
          {temMais && (
            <div className="px-2 pt-2">
              <Button variant="ghost" className="w-full" onClick={aoCarregarMais}>
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
