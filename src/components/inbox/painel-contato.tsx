"use client";

import { BriefcaseBusiness, ChevronRight, Mail, Phone } from "lucide-react";
import type { ConversaInbox } from "@/lib/types";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { mascararEmail, mascararTelefone } from "@/lib/mascaramento";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const iniciaisContato = (nome: string) =>
  nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function PainelContato({
  conversa,
  colapsada,
  aoAlternarColapso,
}: {
  conversa: ConversaInbox | null;
  colapsada: boolean;
  aoAlternarColapso: () => void;
}) {
  const { usuario } = useAutenticacao();

  if (colapsada) {
    return null;
  }

  if (!conversa) {
    return (
      <section className="flex h-auto flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)]">
        Nenhum contato selecionado.
      </section>
    );
  }

  const podeVer = podeVerDadosSensiveis(usuario.role);
  const telefone = podeVer
    ? conversa.contato.telefone
    : mascararTelefone(conversa.contato.telefone);
  const email = podeVer
    ? conversa.contato.email
    : mascararEmail(conversa.contato.email);
  const iniciais = iniciaisContato(conversa.contato.nome);
  const midias = conversa.mensagens.filter(
    (mensagem) => mensagem.tipo !== "texto"
  );
  const negociacoes = [
    {
      id: "deal-1",
      titulo: `27/11 - ${conversa.contato.nome.toUpperCase()} - TOPICOS`,
      contato: conversa.contato.nome,
      status: "Aberto",
      responsavel: conversa.contato.owner,
      grupo: "Seguros",
      valor: "R$ 2.043,41",
      fechamento: "-",
      funil: "Seguros",
      etapa: "Convertido",
      criadoHa: "1 mês atrás",
    },
  ];

  const rotuloMidia = (tipo: string) => {
    if (tipo === "pdf") return "PDF";
    if (tipo === "imagem") return "Imagem";
    if (tipo === "audio") return "Áudio";
    return "Arquivo";
  };

  return (
    <section className="flex h-auto flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)]">
      <div className="border-b border-border/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col items-start gap-3">
            <Avatar
              className={cn(
                "h-10 w-10",
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
              <p className="text-sm font-semibold">Dados principais</p>
              <p className="text-xs text-muted-foreground">
                Informações do contato
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={aoAlternarColapso}
            aria-label="Recolher contato"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {conversa.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          <Badge variant="outline">{conversa.contato.status}</Badge>
        </div>
      </div>

      <div className="p-4">
        <Accordion
          type="multiple"
          defaultValue={["contato"]}
          className="space-y-2"
        >
          <AccordionItem value="contato" className="rounded-xl border border-border/60 px-3">
            <AccordionTrigger>Contato</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{conversa.contato.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                  <span>{conversa.contato.empresa ?? "Sem empresa"}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p>{conversa.contato.owner}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="negociacoes" className="rounded-xl border border-border/60 px-3">
            <AccordionTrigger>Negociações</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <Button variant="outline" size="sm" className="w-full">
                  Adicionar à negociação
                </Button>
                <div className="space-y-3">
                  {negociacoes.map((negociacao) => (
                    <div
                      key={negociacao.id}
                      className="group rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {conversa.contato.avatarUrl && (
                            <AvatarImage
                              src={conversa.contato.avatarUrl}
                              alt={negociacao.contato}
                            />
                          )}
                          <AvatarFallback>
                            {iniciaisContato(negociacao.contato)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold uppercase text-muted-foreground">
                            {negociacao.titulo}
                          </p>
                          <p className="text-sm font-semibold">
                            {negociacao.contato}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 max-h-0 overflow-hidden text-xs text-muted-foreground opacity-0 transition-all duration-300 group-hover:max-h-80 group-hover:opacity-100">
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <span>Status:</span>
                            <Badge variant="secondary">{negociacao.status}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Responsável:</span>
                            <span>{negociacao.responsavel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Grupo:</span>
                            <span>{negociacao.grupo}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Valor:</span>
                            <span>{negociacao.valor}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Fechamento:</span>
                            <span>{negociacao.fechamento}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Funil:</span>
                            <span>{negociacao.funil}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Etapa:</span>
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              {negociacao.etapa}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Criado há:</span>
                            <span>{negociacao.criadoHa}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="midias" className="rounded-xl border border-border/60 px-3">
            <AccordionTrigger>Mídias</AccordionTrigger>
            <AccordionContent>
              {midias.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma mídia compartilhada.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {midias.map((midia) => (
                    <div
                      key={midia.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 p-3"
                    >
                      <span className="truncate">{midia.conteudo}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {rotuloMidia(midia.tipo)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
