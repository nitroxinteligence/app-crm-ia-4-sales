"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Bot,
  Clock,
  Folder,
  Inbox,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Search,
  CheckCircle2,
} from "lucide-react";
import type { CanalId, ConversaInbox, StatusConversa } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { IconeCanal } from "@/components/inbox/icone-canal";

const canaisFiltro: { label: string; value: CanalId | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Instagram", value: "instagram" },
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
  ordenacao,
  aoAlterarOrdenacao,
  filtroBasico,
  aoAlterarFiltroBasico,
  filtroAtribuicao,
  aoAlterarFiltroAtribuicao,
  filtroTag,
  aoAlterarFiltroTag,
  filtroSemTags,
  aoAlterarFiltroSemTags,
  busca,
  aoAlterarBusca,
  filtroCanal,
  aoAlterarFiltroCanal,
  aoAlterarFiltroNumero,
  filtroOwner,
  aoAlterarFiltroOwner,
  owners,
  usuarioAtualId,
  tagsDisponiveis,
  somenteNaoLidas,
  aoAlterarSomenteNaoLidas,
  ocultarGrupos,
  aoAlterarOcultarGrupos,
  aoCarregarMais,
  temMais,
  contagens: contagemTabs,
}: {
  conversas: ConversaInbox[];
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  aoMarcarNaoLido: (id: string) => void;
  statusAtual: StatusConversa;
  aoAlterarStatus: (status: StatusConversa) => void;
  ordenacao: "recentes" | "antigas";
  aoAlterarOrdenacao: (valor: "recentes" | "antigas") => void;
  filtroBasico:
  | "tudo"
  | "nao-lidos"
  | "meus"
  | "seguindo"
  | "pendente"
  | "nao-atribuido"
  | "atribuido"
  | "sem-tags"
  | "nunca-respondidos"
  | "tag"
  | "canal"
  | "em-aberto"
  | "finalizadas"
  | "spam"
  | "nao-iniciados";
  aoAlterarFiltroBasico: (
    valor:
      | "tudo"
      | "nao-lidos"
      | "meus"
      | "seguindo"
      | "pendente"
      | "nao-atribuido"
      | "atribuido"
      | "sem-tags"
      | "nunca-respondidos"
      | "tag"
      | "canal"
      | "em-aberto"
      | "finalizadas"
      | "spam"
      | "nao-iniciados"
  ) => void;
  filtroAtribuicao: "todos" | "nao-atribuido" | "atribuido";
  aoAlterarFiltroAtribuicao: (valor: "todos" | "nao-atribuido" | "atribuido") => void;
  filtroTag: string | null;
  aoAlterarFiltroTag: (valor: string | null) => void;
  filtroSemTags: boolean;
  aoAlterarFiltroSemTags: (valor: boolean) => void;
  busca: string;
  aoAlterarBusca: (valor: string) => void;
  filtroCanal: CanalId | "todos";
  aoAlterarFiltroCanal: (valor: CanalId | "todos") => void;
  aoAlterarFiltroNumero: (valor: string) => void;
  filtroOwner: string;
  aoAlterarFiltroOwner: (valor: string) => void;
  owners: Array<{ id: string; userId: string; nome: string; avatarUrl?: string | null }>;
  usuarioAtualId: string | null;
  tagsDisponiveis: string[];
  somenteNaoLidas: boolean;
  aoAlterarSomenteNaoLidas: (valor: boolean) => void;
  ocultarGrupos: boolean;
  aoAlterarOcultarGrupos: (valor: boolean) => void;
  aoCarregarMais: () => void;
  temMais: boolean;
  contagens: {
    naoIniciados: number;
    aguardando: number;
    emAberto: number;
    agentes: number;
    finalizadas: number;
    spam: number;
  };
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
  const [buscaTag, setBuscaTag] = React.useState("");
  const [buscaOwner, setBuscaOwner] = React.useState("");
  const tagCores = [
    "bg-amber-400/70",
    "bg-rose-400/70",
    "bg-emerald-400/70",
    "bg-sky-400/70",
    "bg-violet-400/70",
    "bg-orange-400/70",
    "bg-lime-400/70",
    "bg-fuchsia-400/70",
  ];
  const tagsFiltradas = tagsDisponiveis.filter((tag) =>
    tag.toLowerCase().includes(buscaTag.trim().toLowerCase())
  );
  const ownersFiltrados = owners.filter((owner) =>
    owner.nome.toLowerCase().includes(buscaOwner.trim().toLowerCase())
  );

  // Contagem de abas recebida via props (backend)
  const limparFiltrosBasicos = React.useCallback(() => {
    aoAlterarSomenteNaoLidas(false);
    aoAlterarFiltroAtribuicao("todos");
    aoAlterarFiltroOwner("todos");
    aoAlterarFiltroSemTags(false);
    aoAlterarFiltroTag(null);
    aoAlterarFiltroCanal("todos");
    aoAlterarFiltroNumero("todos");
  }, [
    aoAlterarFiltroAtribuicao,
    aoAlterarFiltroCanal,
    aoAlterarFiltroNumero,
    aoAlterarFiltroOwner,
    aoAlterarFiltroSemTags,
    aoAlterarFiltroTag,
    aoAlterarSomenteNaoLidas,
  ]);
  const classeItemFiltro =
    "pl-2 data-[state=checked]:pl-8 data-[state=checked]:text-primary data-[state=checked]:[&>span>svg]:text-primary";
  const handleSelecionarFiltroBasico = React.useCallback(
    (valor:
      | "tudo"
      | "nao-lidos"
      | "meus"
      | "seguindo"
      | "pendente"
      | "nao-atribuido"
      | "sem-tags"
      | "nunca-respondidos") => {
      aoAlterarFiltroBasico(valor);
      limparFiltrosBasicos();
      if (valor === "nao-lidos") {
        aoAlterarSomenteNaoLidas(true);
      }
      if (valor === "meus" && usuarioAtualId) {
        aoAlterarFiltroAtribuicao("atribuido");
        aoAlterarFiltroOwner(usuarioAtualId);
      }
      if (valor === "nao-atribuido") {
        aoAlterarFiltroAtribuicao("nao-atribuido");
      }
      if (valor === "sem-tags") {
        aoAlterarFiltroSemTags(true);
      }
      if (valor === "pendente") {
        aoAlterarStatus("pendente");
      }
    },
    [
      aoAlterarFiltroAtribuicao,
      aoAlterarFiltroBasico,
      aoAlterarFiltroOwner,
      aoAlterarFiltroSemTags,
      aoAlterarSomenteNaoLidas,
      aoAlterarStatus,
      limparFiltrosBasicos,
      usuarioAtualId,
    ]
  );

  const tabsRapidas = [
    {
      id: "nao-iniciados",
      label: "Não iniciados",
      icon: Inbox,
      valor: contagemTabs.naoIniciados,
      ativo: filtroBasico === "pendente",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("pendente");
        aoAlterarFiltroBasico("pendente");
      },
      cor: "text-amber-500",
    },
    {
      id: "aguardando",
      label: "Aguardando",
      icon: Clock,
      valor: contagemTabs.aguardando,
      ativo: filtroBasico === "nunca-respondidos",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("aberta");
        aoAlterarFiltroBasico("nunca-respondidos");
      },
      cor: "text-orange-500",
    },
    {
      id: "em-aberto",
      label: "Em aberto",
      icon: Folder,
      valor: contagemTabs.emAberto,
      ativo: filtroBasico === "tudo" && statusAtual === "aberta",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("aberta");
        aoAlterarFiltroBasico("tudo");
      },
      cor: "text-sky-600",
    },
    {
      id: "agentes",
      label: "Agentes",
      icon: Bot,
      valor: contagemTabs.agentes,
      ativo: filtroBasico === "atribuido",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("aberta");
        aoAlterarFiltroBasico("atribuido");
        aoAlterarFiltroAtribuicao("atribuido");
      },
      cor: "text-violet-600",
    },
    {
      id: "finalizadas",
      label: "Finalizadas",
      icon: CheckCircle2,
      valor: contagemTabs.finalizadas,
      ativo: filtroBasico === "tudo" && statusAtual === "resolvida",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("resolvida");
        aoAlterarFiltroBasico("tudo");
      },
      cor: "text-emerald-600",
    },
    {
      id: "spam",
      label: "Spam",
      icon: AlertTriangle,
      valor: contagemTabs.spam,
      ativo: filtroBasico === "tudo" && statusAtual === "spam",
      onClick: () => {
        limparFiltrosBasicos();
        aoAlterarStatus("spam");
        aoAlterarFiltroBasico("tudo");
      },
      cor: "text-rose-500",
    },
  ];
  return (
    <section className="flex h-[calc(100vh-56px)] flex-col overflow-hidden rounded-[6px] border border-border/50 bg-card/70 transition-all duration-300 lg:sticky lg:top-24">
      <div className="space-y-4 border-b border-border/50 bg-background/70 px-5 pb-4 pt-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/80" />
            <Input
              value={busca}
              onChange={(event) => aoAlterarBusca(event.target.value)}
              placeholder="Buscar conversas"
              className="h-10 rounded-[6px] border-border/50 bg-background/80 pl-9 pr-4 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ordenar e filtrar"
                className="h-9 w-9 rounded-full border border-border/50 bg-background/80 hover:bg-muted/80"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ListFilter className="h-4 w-4" />
                  Filtrar por
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto p-1">
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "tudo"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("tudo")
                    }
                    className={classeItemFiltro}
                  >
                    Tudo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "nao-lidos"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("nao-lidos")
                    }
                    className={classeItemFiltro}
                  >
                    Não lidos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={ocultarGrupos}
                    onCheckedChange={(valor) =>
                      aoAlterarOcultarGrupos(Boolean(valor))
                    }
                    className={classeItemFiltro}
                  >
                    Ocultar grupos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "meus"}
                    onCheckedChange={() => handleSelecionarFiltroBasico("meus")}
                    disabled={!usuarioAtualId}
                    className={classeItemFiltro}
                  >
                    Meus
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "seguindo"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("seguindo")
                    }
                    className={classeItemFiltro}
                  >
                    Seguindo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "pendente"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("pendente")
                    }
                    className={classeItemFiltro}
                  >
                    Pendente
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "nao-atribuido"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("nao-atribuido")
                    }
                    className={classeItemFiltro}
                  >
                    Não atribuído
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger
                      className={cn(
                        filtroBasico === "atribuido" &&
                        "bg-accent text-accent-foreground"
                      )}
                    >
                      Atribuído
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64 p-3">
                      <DropdownMenuLabel>Atribuído</DropdownMenuLabel>
                      <Input
                        value={buscaOwner}
                        onChange={(event) => setBuscaOwner(event.target.value)}
                        placeholder="Pesquisar..."
                        className="h-8"
                      />
                      <div className="mt-3 max-h-[240px] space-y-1 overflow-auto pr-1">
                        {ownersFiltrados.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            Nenhum usuário encontrado.
                          </p>
                        ) : (
                          ownersFiltrados.map((owner) => (
                            <DropdownMenuCheckboxItem
                              key={owner.userId}
                              checked={
                                filtroBasico === "atribuido" &&
                                filtroAtribuicao === "atribuido" &&
                                filtroOwner === owner.userId
                              }
                              onCheckedChange={() => {
                                aoAlterarFiltroBasico("atribuido");
                                limparFiltrosBasicos();
                                aoAlterarFiltroAtribuicao("atribuido");
                                aoAlterarFiltroOwner(owner.userId);
                              }}
                              className={classeItemFiltro}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {owner.avatarUrl && (
                                    <AvatarImage
                                      src={owner.avatarUrl}
                                      alt={owner.nome}
                                    />
                                  )}
                                  <AvatarFallback>
                                    {iniciaisContato(owner.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{owner.nome}</span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "sem-tags"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("sem-tags")
                    }
                    className={classeItemFiltro}
                  >
                    Sem tags
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroBasico === "nunca-respondidos"}
                    onCheckedChange={() =>
                      handleSelecionarFiltroBasico("nunca-respondidos")
                    }
                    className={classeItemFiltro}
                  >
                    Nunca respondidos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger
                      className={cn(
                        filtroBasico === "tag" &&
                        "bg-accent text-accent-foreground"
                      )}
                    >
                      Tag
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64 p-3">
                      <DropdownMenuLabel>Tag</DropdownMenuLabel>
                      <Input
                        value={buscaTag}
                        onChange={(event) => setBuscaTag(event.target.value)}
                        placeholder="Pesquisar..."
                        className="h-8"
                      />
                      <div className="mt-3 max-h-[240px] space-y-1 overflow-auto pr-1">
                        {tagsFiltradas.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            Nenhuma tag encontrada.
                          </p>
                        ) : (
                          tagsFiltradas.map((tag, index) => (
                            <DropdownMenuCheckboxItem
                              key={tag}
                              checked={filtroBasico === "tag" && filtroTag === tag}
                              onCheckedChange={() => {
                                aoAlterarFiltroBasico("tag");
                                limparFiltrosBasicos();
                                aoAlterarFiltroSemTags(false);
                                aoAlterarFiltroTag(tag);
                              }}
                              className={classeItemFiltro}
                            >
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  tagCores[index % tagCores.length]
                                )}
                              />
                              <span>{tag}</span>
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger
                      className={cn(
                        filtroBasico === "canal" &&
                        filtroCanal !== "todos" &&
                        "bg-accent text-accent-foreground"
                      )}
                    >
                      Canal
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 p-1">
                      {canaisFiltro.map((canal) => (
                        <DropdownMenuCheckboxItem
                          key={canal.value}
                          checked={filtroCanal === canal.value}
                          onCheckedChange={(valor) => {
                            if (!valor) return;
                            aoAlterarFiltroBasico(
                              canal.value === "todos" ? "tudo" : "canal"
                            );
                            limparFiltrosBasicos();
                            aoAlterarFiltroCanal(canal.value);
                          }}
                          className={classeItemFiltro}
                        >
                          <div className="flex items-center gap-2">
                            {canal.value !== "todos" && (
                              <IconeCanal
                                canal={canal.value as CanalId}
                                className="h-3 w-3"
                              />
                            )}
                            <span>{canal.label}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowUpDown className="h-4 w-4" />
                  Ordenar por
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 p-1">
                  <DropdownMenuCheckboxItem
                    checked={ordenacao === "recentes"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      aoAlterarOrdenacao("recentes");
                    }}
                    className={classeItemFiltro}
                  >
                    Mais recentes primeiro
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={ordenacao === "antigas"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      aoAlterarOrdenacao("antigas");
                    }}
                    className={classeItemFiltro}
                  >
                    Mais antigos primeiro
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tabsRapidas.map((tab) => (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={tab.onClick}
                    aria-label={tab.label}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-[6px] border px-3 py-2 text-xs font-medium transition",
                      tab.ativo
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/50 bg-background text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", tab.cor)} />
                    <span className={cn(
                      "text-[11px] tabular-nums",
                      tab.ativo ? "text-foreground" : "text-foreground/70"
                    )}>
                      {tab.valor}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-primary text-primary-foreground"
                  arrowClassName="bg-primary fill-primary"
                >
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      <Separator className="bg-border/50" />

      <div
        className="flex-1 overflow-auto px-3 pb-4 pt-3"
        onScroll={handleScroll}
      >
        <div className="space-y-2">
          {conversas.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-[5px] border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>Nenhuma conversa encontrada.</span>
            </div>
          ) : (
            conversas.map((conversa) => (
              <ConversaItem
                key={conversa.id}
                conversa={conversa}
                selecionadaId={selecionadaId}
                aoSelecionar={aoSelecionar}
                aoMarcarNaoLido={aoMarcarNaoLido}
              />
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

function ConversaItem({
  conversa,
  selecionadaId,
  aoSelecionar,
  aoMarcarNaoLido,
}: {
  conversa: ConversaInbox;
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  aoMarcarNaoLido: (id: string) => void;
}) {
  const telefoneContato = conversa.contato.telefone ?? "";
  const isGrupo = conversa.contato.isGrupo || telefoneContato.includes("@g.us");

  return (
    <div
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
        "group w-full rounded-[6px] border border-border/40 bg-background/70 p-3.5 text-left transition",
        "hover:border-primary/30 hover:bg-primary/5",
        conversa.id === selecionadaId &&
        "border-primary/40 bg-primary/10"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          {conversa.contato.avatarUrl && (
            <AvatarImage
              src={conversa.contato.avatarUrl}
              alt={conversa.contato.nome}
            />
          )}
          <AvatarFallback>{iniciaisContato(conversa.contato.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold">
              {conversa.contato.nome}
            </p>
          </div>
          <p className="truncate text-[11px] text-muted-foreground/90">
            {(() => {
              const ultimaMensagem =
                conversa.mensagens[conversa.mensagens.length - 1];
              let resumo = conversa.ultimaMensagem ?? "";
              if (ultimaMensagem) {
                if (ultimaMensagem.tipo === "texto") {
                  resumo = ultimaMensagem.conteudo;
                } else {
                  resumo = `${rotuloTipoMensagem(ultimaMensagem.tipo)}: ${ultimaMensagem.conteudo
                    }`;
                }
              }
              const texto = String(resumo).replace(/\s+/g, " ").trim();
              const nomeAutor = ultimaMensagem
                ? ultimaMensagem.autor === "contato"
                  ? isGrupo
                    ? ultimaMensagem.senderNome ?? conversa.contato.nome
                    : conversa.contato.nome
                  : "Você"
                : null;
              return nomeAutor ? (
                <>
                  <span className="font-semibold text-foreground/80">
                    {nomeAutor}:
                  </span>{" "}
                  <span>{texto}</span>
                </>
              ) : (
                texto
              );
            })()}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
            <span>{conversa.horario}</span>
            {isGrupo && (
              <Badge
                variant="secondary"
                className="h-5 px-2 text-[10px] uppercase tracking-wide"
              >
                Grupo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {conversa.naoLidas > 0 && (
              <Badge className="h-5 rounded-full bg-primary px-2 text-[10px] text-primary-foreground">
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
                  className="h-7 w-7 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 group-hover:opacity-100 group-focus-within:opacity-100"
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
      </div>
    </div>
  );
}
