"use client";

import * as React from "react";
import {
  BadgeCheck,
  Ban,
  Bot,
  Clock,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Mic,
  OctagonAlert,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  StickyNote,
  Tag,
  Ticket,
  User,
  UserPlus,
} from "lucide-react";
import type { ConversaInbox, MensagemInbox } from "@/lib/types";
import { nomeCanal } from "@/lib/canais";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { IconeCanal } from "@/components/inbox/icone-canal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ChatConversa({
  conversa,
  aoAbrirContato,
}: {
  conversa: ConversaInbox | null;
  aoAbrirContato?: () => void;
}) {
  if (!conversa) {
    return (
      <section className="flex min-h-[680px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Selecione uma conversa para visualizar o chat.
      </section>
    );
  }

  const [dialogTagAberto, setDialogTagAberto] = React.useState(false);
  const [dialogTransferirAberto, setDialogTransferirAberto] = React.useState(false);
  const [dialogNotaAberto, setDialogNotaAberto] = React.useState(false);
  const [dialogDealAberto, setDialogDealAberto] = React.useState(false);
  const [dialogTicketAberto, setDialogTicketAberto] = React.useState(false);
  const [dialogTarefaAberto, setDialogTarefaAberto] = React.useState(false);
  const [dialogSpamAberto, setDialogSpamAberto] = React.useState(false);
  const [dialogBloquearAberto, setDialogBloquearAberto] = React.useState(false);
  const [mensagemAtual, setMensagemAtual] = React.useState("");
  const inputArquivoRef = React.useRef<HTMLInputElement>(null);
  const envioAtivo = mensagemAtual.trim().length > 0;
  const emojis = [
    { label: "Sorriso", valor: "😀" },
    { label: "Animado", valor: "😄" },
    { label: "Estilo", valor: "😎" },
    { label: "Amor", valor: "😍" },
    { label: "Ok", valor: "👍" },
    { label: "Fogo", valor: "🔥" },
    { label: "Festa", valor: "🎉" },
    { label: "Obrigado", valor: "🙏" },
  ];
  const iniciais = conversa.contato.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const handleEnviar = React.useCallback(() => {
    if (!envioAtivo) return;
    setMensagemAtual("");
  }, [envioAtivo]);
  const handleSelecionarEmoji = React.useCallback((emoji: string) => {
    setMensagemAtual((atual) => `${atual}${emoji}`);
  }, []);

  return (
    <TooltipProvider>
      <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="border-b border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              className={cn(
                "h-9 w-9",
                conversa.canal === "whatsapp" && "ring-2 ring-emerald-500/30"
              )}
            >
              {conversa.contato.avatarUrl && (
                <AvatarImage
                  src={conversa.contato.avatarUrl}
                  alt={conversa.contato.nome}
                />
              )}
              <AvatarFallback>{iniciais}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{conversa.contato.nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <IconeCanal canal={conversa.canal} className="h-3 w-3" />
                  {nomeCanal(conversa.canal)}
                </Badge>
                {conversa.modoAtendimentoHumano ? (
                  <Badge variant="secondary">Atendimento humano</Badge>
                ) : (
                  <Badge className="gap-1">
                    <Bot className="h-3 w-3" />
                    Agente ativo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={aoAbrirContato}
                  aria-label="Abrir painel do contato"
                >
                  <User className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir contato</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Abrir ações">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Ações do chat</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ações da conversa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDialogTagAberto(true)}>
                  <Tag className="mr-2 h-4 w-4" />
                  Aplicar tags
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogTransferirAberto(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Transferir
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogNotaAberto(true)}>
                  <StickyNote className="mr-2 h-4 w-4" />
                  Nota interna
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Resolver
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="mr-2 h-4 w-4" />
                  Marcar pendente
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Criar</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setDialogDealAberto(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Criar deal
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogTicketAberto(true)}>
                  <Ticket className="mr-2 h-4 w-4" />
                  Criar ticket
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogTarefaAberto(true)}>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Criar tarefa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Segurança</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setDialogSpamAberto(true)}>
                  <OctagonAlert className="mr-2 h-4 w-4" />
                  Marcar spam
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialogBloquearAberto(true)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Bloquear contato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={dialogTagAberto} onOpenChange={setDialogTagAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar tags</DialogTitle>
            <DialogDescription>
              Selecione tags para a conversa atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Select defaultValue="proposta">
              <SelectTrigger>
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogTransferirAberto}
        onOpenChange={setDialogTransferirAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável pela conversa.
            </DialogDescription>
          </DialogHeader>
          <Select defaultValue="marina">
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marina">Marina</SelectItem>
              <SelectItem value="renato">Renato</SelectItem>
              <SelectItem value="joana">Joana</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogNotaAberto} onOpenChange={setDialogNotaAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota interna</DialogTitle>
            <DialogDescription>
              Visível apenas para a equipe.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Adicionar nota interna" className="min-h-[120px]" />
          <DialogFooter>
            <Button>Salvar nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogDealAberto} onOpenChange={setDialogDealAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar deal</DialogTitle>
            <DialogDescription>
              Gere uma oportunidade a partir desta conversa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Nome do deal" />
            <Input placeholder="Valor estimado" />
          </div>
          <DialogFooter>
            <Button>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTicketAberto} onOpenChange={setDialogTicketAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar ticket</DialogTitle>
            <DialogDescription>Registre uma solicitação de suporte.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Assunto" />
            <Select defaultValue="media">
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button>Criar ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTarefaAberto} onOpenChange={setDialogTarefaAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar tarefa</DialogTitle>
            <DialogDescription>
              Programe um follow-up com o contato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Título da tarefa" />
            <Input placeholder="Data e hora" />
          </div>
          <DialogFooter>
            <Button>Criar tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSpamAberto} onOpenChange={setDialogSpamAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como spam</DialogTitle>
            <DialogDescription>
              Esta conversa será movida para a aba de spam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogBloquearAberto} onOpenChange={setDialogBloquearAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear contato</DialogTitle>
            <DialogDescription>
              O contato não poderá iniciar novas conversas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive">Bloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {conversa.mensagens.map((mensagem) => (
            <MensagemChat key={mensagem.id} mensagem={mensagem} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 p-4">
        <div className="relative rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm">
          <Textarea
            value={mensagemAtual}
            onChange={(event) => setMensagemAtual(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleEnviar();
              }
            }}
            placeholder='Shift + Enter para uma nova linha. "/" para frase rápida.'
            className="min-h-[110px] resize-none border-0 bg-transparent p-0 pb-12 pr-12 text-sm focus-visible:ring-0"
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Inserir emoji">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Emojis</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel>Emojis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {emojis.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji.valor}
                    onSelect={() => handleSelecionarEmoji(emoji.valor)}
                  >
                    <span className="mr-2">{emoji.valor}</span>
                    {emoji.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              ref={inputArquivoRef}
              type="file"
              className="hidden"
              multiple
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => inputArquivoRef.current?.click()}
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anexar arquivo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ditado de áudio">
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Áudio</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ferramentas">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Ferramentas</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Atalhos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Anexar arquivo</DropdownMenuItem>
                <DropdownMenuItem>Templates WhatsApp</DropdownMenuItem>
                <DropdownMenuItem>Quick replies</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Copiloto IA</DropdownMenuLabel>
                <DropdownMenuItem>Sugerir resposta</DropdownMenuItem>
                <DropdownMenuItem>Resumir conversa</DropdownMenuItem>
                <DropdownMenuItem>Extrair dados</DropdownMenuItem>
                <DropdownMenuItem>Classificar intenção</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={handleEnviar}
                disabled={!envioAtivo}
                aria-label="Enviar mensagem"
                className="absolute bottom-2 right-2 h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </section>
    </TooltipProvider>
  );
}

function MensagemChat({ mensagem }: { mensagem: MensagemInbox }) {
  const enviada = mensagem.autor !== "contato";
  const alinhamento = enviada ? "items-end" : "items-start";
  const bolha = enviada
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-foreground";

  const iconMap = {
    imagem: ImageIcon,
    pdf: FileText,
    audio: Mic,
  } as const;

  return (
    <div className={cn("flex flex-col gap-1", alinhamento)}>
      <div className={cn("max-w-[70%] rounded-2xl px-3 py-2 text-sm", bolha)}>
        {mensagem.tipo === "texto" ? (
          mensagem.conteudo
        ) : (
          <div className="flex items-center gap-2">
            {React.createElement(iconMap[mensagem.tipo], {
              className: "h-4 w-4",
            })}
            <span className="text-xs">{mensagem.conteudo}</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {mensagem.horario}
      </span>
    </div>
  );
}
