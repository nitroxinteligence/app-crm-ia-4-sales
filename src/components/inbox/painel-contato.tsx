"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Globe,
  IdCard,
  Mail,
  Pencil,
  Phone,
  User,
  Users,
  Bot,
} from "lucide-react";
import type { ContatoInbox, ConversaInbox } from "@/lib/types";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { mascararEmail, mascararTelefone } from "@/lib/mascaramento";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase/client";

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
  aoAtualizarContato,
}: {
  conversa: ConversaInbox | null;
  colapsada: boolean;
  aoAlternarColapso: () => void;
  aoAtualizarContato: (contatoId: string, atualizacao: Partial<ContatoInbox>) => void;
}) {
  const [session, setSession] = React.useState<Session | null>(null);
  const { usuario, workspace } = useAutenticacao();
  const [dialogEditarContatoAberto, setDialogEditarContatoAberto] =
    React.useState(false);
  const [convertendo, setConvertendo] = React.useState(false);
  const [erroConversao, setErroConversao] = React.useState<string | null>(null);
  const [formContato, setFormContato] = React.useState({
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    site: "",
    documento: "",
    dataNascimento: "",
  });
  const [negociacoes, setNegociacoes] = React.useState<
    Array<{
      id: string;
      titulo: string;
      status: string;
      valor: string;
      criadoEm: string;
    }>
  >([]);
  const [carregandoNegociacoes, setCarregandoNegociacoes] =
    React.useState(false);

  React.useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!workspace?.id || !conversa?.contactId) {
      setNegociacoes([]);
      return;
    }
    let ativo = true;
    setCarregandoNegociacoes(true);

    const carregar = async () => {
      const { data } = await supabaseClient
        .from("deals")
        .select("id, titulo, status, valor, moeda, created_at")
        .eq("workspace_id", workspace.id)
        .eq("contact_id", conversa.contactId)
        .order("created_at", { ascending: false });

      if (!ativo) return;

      setNegociacoes(
        (data ?? []).map((item) => {
          const moeda = item.moeda ?? "BRL";
          const valor =
            typeof item.valor === "number"
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: moeda,
                }).format(item.valor)
              : "-";
          return {
            id: item.id,
            titulo: item.titulo ?? "Negócio sem título",
            status: item.status ?? "aberto",
            valor,
            criadoEm: item.created_at
              ? new Date(item.created_at).toLocaleDateString("pt-BR")
              : "-",
          };
        })
      );
      setCarregandoNegociacoes(false);
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [conversa?.contactId, workspace?.id]);

  if (colapsada) {
    return null;
  }

  if (!conversa) {
    return (
      <section className="flex h-auto flex-col items-center justify-center rounded-[6px] border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground shadow-none transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-96px)]">
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
  const documento = podeVer
    ? conversa.contato.documento ?? "Documento não informado"
    : "Documento restrito";
  const dataNascimento = podeVer
    ? conversa.contato.dataNascimento ?? "Data não informada"
    : "Data restrita";
  const iniciais = iniciaisContato(conversa.contato.nome);
  const midias = conversa.mensagens.filter(
    (mensagem) => mensagem.tipo !== "texto"
  );

  const rotuloMidia = (tipo: string) => {
    if (tipo === "pdf") return "PDF";
    if (tipo === "imagem") return "Imagem";
    if (tipo === "audio") return "Áudio";
    return "Arquivo";
  };

  const handleAbrirEditarContato = () => {
    setFormContato({
      nome: conversa.contato.nome,
      email: conversa.contato.email,
      telefone: conversa.contato.telefone,
      empresa: conversa.contato.empresa ?? "",
      site: conversa.contato.site ?? "",
      documento: conversa.contato.documento ?? "",
      dataNascimento: conversa.contato.dataNascimento ?? "",
    });
    setDialogEditarContatoAberto(true);
  };

  const handleSalvarContato = () => {
    aoAtualizarContato(conversa.contato.id, {
      nome: formContato.nome.trim() || conversa.contato.nome,
      email: formContato.email.trim() || conversa.contato.email,
      telefone: formContato.telefone.trim() || conversa.contato.telefone,
      empresa: formContato.empresa.trim() || undefined,
      site: formContato.site.trim() || undefined,
      documento: formContato.documento.trim() || undefined,
      dataNascimento: formContato.dataNascimento || undefined,
    });
    setDialogEditarContatoAberto(false);
  };

  const handleConverterContato = async () => {
    if (!session || !conversa?.contato?.id) return;
    setConvertendo(true);
    setErroConversao(null);

    const resp = await fetch("/api/crm/leads/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        leadId: conversa.contato.id,
        empresa: conversa.contato.empresa ?? "",
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      setErroConversao(errorText || "Falha ao converter lead.");
      setConvertendo(false);
      return;
    }

    aoAtualizarContato(conversa.contato.id, {
      status: "contato",
    });

    setConvertendo(false);
  };

  const historicoInteracoes = conversa.mensagens;

  const rotuloAutor = (autor: ConversaInbox["mensagens"][number]["autor"]) => {
    if (autor === "contato") return "Contato";
    if (autor === "agente") return "Agente";
    return "Equipe";
  };

  const IconeAutor = ({
    autor,
  }: {
    autor: ConversaInbox["mensagens"][number]["autor"];
  }) => {
    if (autor === "agente") return <Bot className="h-3.5 w-3.5" />;
    if (autor === "equipe") return <Users className="h-3.5 w-3.5" />;
    return <User className="h-3.5 w-3.5" />;
  };

  return (
    <section className="flex h-auto min-h-0 flex-col overflow-hidden rounded-[6px] border border-border/50 bg-card/70 shadow-none transition-all duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-96px)]">
      <div className="border-b border-border/50 bg-background/70 px-5 py-4 backdrop-blur-sm">
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
              <p className="text-sm font-semibold tracking-tight">
                Dados principais
              </p>
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
            className="rounded-[6px] border-0 bg-background/80 shadow-none hover:bg-muted/70"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {conversa.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full px-2.5 text-[11px]">
              {tag}
            </Badge>
          ))}
          <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
            {conversa.contato.status}
          </Badge>
        </div>
        {conversa.contato.status !== "contato" && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full gap-2 rounded-[6px]"
              onClick={handleConverterContato}
              disabled={convertendo}
            >
              <CheckCircle2 className="h-4 w-4" />
              {convertendo ? "Convertendo..." : "Converter para contato"}
            </Button>
            {erroConversao && (
              <p className="mt-2 text-xs text-destructive">{erroConversao}</p>
            )}
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-2 rounded-[6px] border-0"
          onClick={handleAbrirEditarContato}
        >
          <Pencil className="h-4 w-4" />
          Editar contato
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0" type="always" scrollHideDelay={0}>
        <div className="p-4">
          <Accordion
            type="multiple"
            defaultValue={["contato"]}
            className="space-y-2"
          >
            <AccordionItem
              value="contato"
              className="rounded-[6px] border border-border/50 bg-background/60 px-3 shadow-none"
            >
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

            <AccordionItem
              value="campos-adicionais"
              className="rounded-[6px] border border-border/50 bg-background/60 px-3 shadow-none"
            >
              <AccordionTrigger>Campos adicionais</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{conversa.contato.site ?? "Site não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span>{documento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{dataNascimento}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="historico"
              className="rounded-[6px] border border-border/50 bg-background/60 px-3 shadow-none"
            >
              <AccordionTrigger>Histórico</AccordionTrigger>
              <AccordionContent>
                {historicoInteracoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma interação registrada.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {historicoInteracoes.map((mensagem) => (
                      <div
                        key={mensagem.id}
                        className="flex items-start justify-between gap-3 rounded-[6px] border border-border/50 bg-muted/30 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <IconeAutor autor={mensagem.autor} />
                          <div className="space-y-1">
                            <p className="font-medium">
                              {rotuloAutor(mensagem.autor)}
                            </p>
                            <p className="text-muted-foreground">
                              {mensagem.conteudo}
                            </p>
                          </div>
                        </div>
                        <span className="text-muted-foreground">
                          {mensagem.horario}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="negociacoes"
              className="rounded-[6px] border border-border/50 bg-background/60 px-3 shadow-none"
            >
              <AccordionTrigger>Negociações</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <Button variant="outline" size="sm" className="w-full">
                    Adicionar à negociação
                  </Button>
                  {carregandoNegociacoes ? (
                    <p className="text-xs text-muted-foreground">
                      Carregando negociações...
                    </p>
                  ) : negociacoes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma negociação encontrada.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {negociacoes.map((negociacao) => (
                        <div
                          key={negociacao.id}
                          className="rounded-[6px] border border-dashed border-border/50 bg-muted/20 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                {negociacao.titulo}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Criado em {negociacao.criadoEm}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {negociacao.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm font-semibold">
                            {negociacao.valor}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="midias"
              className="rounded-[6px] border border-border/50 bg-background/60 px-3 shadow-none"
            >
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
                        className="flex items-center justify-between gap-2 rounded-[6px] border border-border/50 bg-muted/30 p-3"
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
      </ScrollArea>

      <Dialog
        open={dialogEditarContatoAberto}
        onOpenChange={setDialogEditarContatoAberto}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar contato</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do contato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="contato-nome" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="contato-nome"
                value={formContato.nome}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Nome do contato"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="contato-email"
                type="email"
                value={formContato.email}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    email: event.target.value,
                  }))
                }
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-telefone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="contato-telefone"
                value={formContato.telefone}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    telefone: event.target.value,
                  }))
                }
                placeholder="(11) 9 9999-9999"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-empresa" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="contato-empresa"
                value={formContato.empresa}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    empresa: event.target.value,
                  }))
                }
                placeholder="Empresa vinculada"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-site" className="text-sm font-medium">
                Site
              </label>
              <Input
                id="contato-site"
                value={formContato.site}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    site: event.target.value,
                  }))
                }
                placeholder="https://"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-documento" className="text-sm font-medium">
                Documento (CPF ou CNPJ)
              </label>
              <Input
                id="contato-documento"
                value={formContato.documento}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    documento: event.target.value,
                  }))
                }
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-nascimento" className="text-sm font-medium">
                Data de nascimento
              </label>
              <Input
                id="contato-nascimento"
                type="date"
                value={formContato.dataNascimento}
                onChange={(event) =>
                  setFormContato((atual) => ({
                    ...atual,
                    dataNascimento: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogEditarContatoAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarContato}>Salvar contato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
