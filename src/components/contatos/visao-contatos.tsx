"use client";

import * as React from "react";
import {
  FileDown,
  Search,
  SlidersHorizontal,
  Upload,
  UserPlus,
} from "lucide-react";
import type { ContatoCRM, StatusContato } from "@/lib/types";
import { contatosCRM } from "@/lib/mock/contatos";
import { mascararEmail, mascararTelefone } from "@/lib/mascaramento";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIMITE_INICIAL = 32;

const statusLabel: Record<StatusContato, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  "em-negociacao": "Em negociação",
  cliente: "Cliente",
  inativo: "Inativo",
};

const statusBadgeVariant: Record<
  StatusContato,
  "default" | "secondary" | "outline" | "destructive"
> = {
  novo: "secondary",
  qualificado: "default",
  "em-negociacao": "outline",
  cliente: "secondary",
  inativo: "destructive",
};

const iniciaisContato = (nome: string) =>
  nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function VisaoContatos() {
  const { usuario } = useAutenticacao();
  const podeVer = podeVerDadosSensiveis(usuario.role);

  const [contatos, setContatos] = React.useState(contatosCRM);
  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<
    StatusContato | "todos"
  >("todos");
  const [filtroOwner, setFiltroOwner] = React.useState("todos");
  const [filtroTag, setFiltroTag] = React.useState("todas");
  const [filtroSomenteComEmpresa, setFiltroSomenteComEmpresa] =
    React.useState(false);
  const [filtroSomenteComTags, setFiltroSomenteComTags] = React.useState(false);
  const [limite, setLimite] = React.useState(LIMITE_INICIAL);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [contatoAtivo, setContatoAtivo] = React.useState<ContatoCRM | null>(
    null
  );
  const [dialogExcluirAberto, setDialogExcluirAberto] = React.useState(false);
  const [dialogExportarAberto, setDialogExportarAberto] = React.useState(false);
  const [dialogImportarAberto, setDialogImportarAberto] = React.useState(false);
  const [dialogNovoContatoAberto, setDialogNovoContatoAberto] =
    React.useState(false);
  const [novoContato, setNovoContato] = React.useState({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    status: "novo" as StatusContato,
    owner: "",
    tags: "",
  });

  const owners = React.useMemo(() => {
    const todos = new Set(contatos.map((contato) => contato.owner));
    return ["todos", ...Array.from(todos)];
  }, [contatos]);

  const tags = React.useMemo(() => {
    const todos = new Set(contatos.flatMap((contato) => contato.tags));
    return ["todas", ...Array.from(todos)];
  }, [contatos]);

  const contatosFiltrados = React.useMemo(() => {
    return contatos.filter((contato) => {
      if (filtroStatus !== "todos" && contato.status !== filtroStatus) {
        return false;
      }
      if (filtroOwner !== "todos" && contato.owner !== filtroOwner) {
        return false;
      }
      if (filtroTag !== "todas" && !contato.tags.includes(filtroTag)) {
        return false;
      }
      if (filtroSomenteComEmpresa && !contato.empresa) {
        return false;
      }
      if (filtroSomenteComTags && contato.tags.length === 0) {
        return false;
      }
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (
        contato.nome.toLowerCase().includes(termo) ||
        contato.telefone.toLowerCase().includes(termo) ||
        contato.email.toLowerCase().includes(termo) ||
        (contato.empresa ?? "").toLowerCase().includes(termo)
      );
    });
  }, [
    busca,
    contatos,
    filtroOwner,
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
    filtroStatus,
    filtroTag,
  ]);

  const contatosVisiveis = contatosFiltrados.slice(0, limite);
  const temMais = contatosFiltrados.length > contatosVisiveis.length;
  const idsVisiveis = contatosVisiveis.map((contato) => contato.id);
  const todosSelecionados =
    idsVisiveis.length > 0 &&
    idsVisiveis.every((id) => selecionados.includes(id));
  const algumSelecionado =
    idsVisiveis.length > 0 &&
    idsVisiveis.some((id) => selecionados.includes(id));

  const filtroAtivoCount = [
    busca.trim().length > 0,
    filtroStatus !== "todos",
    filtroOwner !== "todos",
    filtroTag !== "todas",
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
  ].filter(Boolean).length;

  React.useEffect(() => {
    setLimite(LIMITE_INICIAL);
    setSelecionados([]);
  }, [
    busca,
    filtroOwner,
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
    filtroStatus,
    filtroTag,
  ]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const alvo = event.currentTarget;
      const chegouNoFim =
        alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 80;
      if (chegouNoFim && temMais) {
        setLimite((atual) =>
          Math.min(atual + 24, contatosFiltrados.length)
        );
      }
    },
    [contatosFiltrados.length, temMais]
  );

  const handleSelecionarTodos = (valor: boolean) => {
    setSelecionados(valor ? idsVisiveis : []);
  };

  const handleToggleSelecionado = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  };

  const handleAplicarTag = (tag: string) => {
    if (!tag || selecionados.length === 0) return;
    setContatos((atual) =>
      atual.map((contato) =>
        selecionados.includes(contato.id)
          ? { ...contato, tags: Array.from(new Set([...contato.tags, tag])) }
          : contato
      )
    );
  };

  const handleAplicarStatus = (status: string) => {
    if (!status || selecionados.length === 0) return;
    setContatos((atual) =>
      atual.map((contato) =>
        selecionados.includes(contato.id)
          ? { ...contato, status: status as StatusContato }
          : contato
      )
    );
  };

  const handleAplicarOwner = (owner: string) => {
    if (!owner || selecionados.length === 0) return;
    setContatos((atual) =>
      atual.map((contato) =>
        selecionados.includes(contato.id) ? { ...contato, owner } : contato
      )
    );
  };

  const handleExcluirSelecionados = () => {
    setContatos((atual) =>
      atual.filter((contato) => !selecionados.includes(contato.id))
    );
    setSelecionados([]);
    setDialogExcluirAberto(false);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setFiltroStatus("todos");
    setFiltroOwner("todos");
    setFiltroTag("todas");
    setFiltroSomenteComEmpresa(false);
    setFiltroSomenteComTags(false);
  };

  const handleAbrirNovoContato = () => {
    setNovoContato({
      nome: "",
      telefone: "",
      email: "",
      empresa: "",
      status: "novo",
      owner: owners.find((owner) => owner !== "todos") ?? "",
      tags: "",
    });
    setDialogNovoContatoAberto(true);
  };

  const handleCriarContato = () => {
    if (!novoContato.nome.trim() || !novoContato.telefone.trim()) return;
    const tagsNormalizadas = novoContato.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const contato: ContatoCRM = {
      id: `contato-${Date.now()}`,
      nome: novoContato.nome.trim(),
      telefone: novoContato.telefone.trim(),
      email: novoContato.email.trim() || "contato@exemplo.com",
      empresa: novoContato.empresa.trim() || undefined,
      status: novoContato.status,
      tags: tagsNormalizadas,
      owner: novoContato.owner || "Equipe SDR",
      ultimaAtividade: "agora",
    };
    setContatos((atual) => [contato, ...atual]);
    setDialogNovoContatoAberto(false);
  };

  const exibirTelefone = (telefone: string) =>
    podeVer ? telefone : mascararTelefone(telefone);
  const exibirEmail = (email: string) =>
    podeVer ? email : mascararEmail(email);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Todos os contatos adicionados ao CRM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setDialogImportarAberto(true)}
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="gap-2" onClick={handleAbrirNovoContato}>
            <UserPlus className="h-4 w-4" />
            Novo contato
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, telefone, email ou empresa"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
              {filtroAtivoCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtroAtivoCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Filtros de contatos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroStatus}
                    onValueChange={(valor) =>
                      setFiltroStatus(valor as StatusContato | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos os status
                    </DropdownMenuRadioItem>
                    {Object.entries(statusLabel).map(([valor, label]) => (
                      <DropdownMenuRadioItem key={valor} value={valor}>
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Owner</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroOwner}
                    onValueChange={setFiltroOwner}
                  >
                    {owners.map((owner) => (
                      <DropdownMenuRadioItem key={owner} value={owner}>
                        {owner === "todos" ? "Todos os owners" : owner}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Tags</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroTag}
                    onValueChange={setFiltroTag}
                  >
                    {tags.map((tag) => (
                      <DropdownMenuRadioItem key={tag} value={tag}>
                        {tag === "todas" ? "Todas as tags" : tag}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Outros</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComEmpresa}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComEmpresa(Boolean(valor))
                    }
                  >
                    Somente com empresa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComTags}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComTags(Boolean(valor))
                    }
                  >
                    Somente com tags
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLimparFiltros}>
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-3">
        {selecionados.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selecionados.length} selecionados
            </Badge>
            <Select onValueChange={handleAplicarTag}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Aplicar tag" />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter((tag) => tag !== "todas")
                  .map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarStatus}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabel).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarOwner}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Alterar owner" />
              </SelectTrigger>
              <SelectContent>
                {owners
                  .filter((owner) => owner !== "todos")
                  .map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setDialogExportarAberto(true)}
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDialogExcluirAberto(true)}
            >
              Excluir
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione contatos para aplicar tags, status, owner ou exportar.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40">
        <div
          className="max-h-[calc(100vh-360px)] overflow-auto"
          onScroll={handleScroll}
        >
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[36px_minmax(180px,1.4fr)_minmax(140px,1fr)_minmax(200px,1.4fr)_minmax(120px,0.9fr)_minmax(180px,1.2fr)_minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(120px,0.8fr)] items-center gap-3 border-b border-border/60 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <Checkbox
                checked={
                  todosSelecionados ? true : algumSelecionado ? "indeterminate" : false
                }
                onCheckedChange={(valor) => handleSelecionarTodos(Boolean(valor))}
                aria-label="Selecionar todos os contatos visíveis"
              />
              <span>Nome</span>
              <span>Telefone</span>
              <span>Email</span>
              <span>Status</span>
              <span>Tags</span>
              <span>Owner</span>
              <span>Empresa</span>
              <span>Última atividade</span>
            </div>
            {contatosVisiveis.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum contato encontrado com os filtros atuais.
              </div>
            ) : (
              contatosVisiveis.map((contato) => (
                <div
                  key={contato.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setContatoAtivo(contato)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setContatoAtivo(contato);
                    }
                  }}
                  className={cn(
                    "grid grid-cols-[36px_minmax(180px,1.4fr)_minmax(140px,1fr)_minmax(200px,1.4fr)_minmax(120px,0.9fr)_minmax(180px,1.2fr)_minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(120px,0.8fr)] items-center gap-3 border-b border-border/40 px-4 py-3 text-sm transition hover:bg-muted/40",
                    selecionados.includes(contato.id) && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={selecionados.includes(contato.id)}
                    onCheckedChange={() => handleToggleSelecionado(contato.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Selecionar contato ${contato.nome}`}
                  />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/contato-placeholder.svg" />
                      <AvatarFallback>{iniciaisContato(contato.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium">{contato.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {contato.id}
                      </p>
                    </div>
                  </div>
                  <span>{exibirTelefone(contato.telefone)}</span>
                  <span className="truncate">{exibirEmail(contato.email)}</span>
                  <Badge variant={statusBadgeVariant[contato.status]}>
                    {statusLabel[contato.status]}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {contato.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Sem tags
                      </span>
                    ) : (
                      contato.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                  <span>{contato.owner}</span>
                  <span>{contato.empresa ?? "Sem empresa"}</span>
                  <span>{contato.ultimaAtividade}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {temMais && (
          <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
            Carregando mais contatos conforme você rola a tabela...
          </div>
        )}
      </div>

      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contatos selecionados?</DialogTitle>
            <DialogDescription>
              Esta ação remove os contatos do CRM e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExcluirAberto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirSelecionados}>
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExportarAberto} onOpenChange={setDialogExportarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar contatos</DialogTitle>
            <DialogDescription>
              Gere um CSV com os contatos selecionados para compartilhar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            Exportação pronta para download (UI mock).
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExportarAberto(false)}>
              Cancelar
            </Button>
            <Button>Baixar CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogImportarAberto} onOpenChange={setDialogImportarAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar contatos via CSV</DialogTitle>
            <DialogDescription>
              Envie o arquivo, mapeie colunas e confirme a importação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input type="file" accept=".csv" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select defaultValue="nome">
                <SelectTrigger>
                  <SelectValue placeholder="Coluna Nome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="telefone">
                <SelectTrigger>
                  <SelectValue placeholder="Coluna Telefone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="email">
                <SelectTrigger>
                  <SelectValue placeholder="Coluna Email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="empresa">
                <SelectTrigger>
                  <SelectValue placeholder="Coluna Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-medium">Pré-visualização</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Ana Carvalho · (11) 96001-1001 · ana@exemplo.com</p>
                  <p>Bruno Lima · (11) 96002-1002 · bruno@exemplo.com</p>
                  <p>Camila Souza · (11) 96003-1003 · camila@exemplo.com</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogImportarAberto(false)}>
              Cancelar
            </Button>
            <Button>Confirmar importação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogNovoContatoAberto}
        onOpenChange={setDialogNovoContatoAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>
              Adicione um contato manualmente ao CRM.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="contato-nome" className="text-sm font-medium">
                Nome completo
              </label>
              <Input
                id="contato-nome"
                value={novoContato.nome}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Ex: Ana Carvalho"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-telefone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="contato-telefone"
                value={novoContato.telefone}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    telefone: event.target.value,
                  }))
                }
                placeholder="(11) 90000-0000"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="contato-email"
                value={novoContato.email}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    email: event.target.value,
                  }))
                }
                placeholder="email@empresa.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-empresa" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="contato-empresa"
                value={novoContato.empresa}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    empresa: event.target.value,
                  }))
                }
                placeholder="Nome da empresa"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={novoContato.status}
                onValueChange={(valor) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    status: valor as StatusContato,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={novoContato.owner}
                onValueChange={(owner) =>
                  setNovoContato((atual) => ({ ...atual, owner }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter((owner) => owner !== "todos")
                    .map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-tags" className="text-sm font-medium">
                Tags (separadas por vírgula)
              </label>
              <Input
                id="contato-tags"
                value={novoContato.tags}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    tags: event.target.value,
                  }))
                }
                placeholder="Ex: VIP, Inbound"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogNovoContatoAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCriarContato}>Salvar contato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(contatoAtivo)}
        onOpenChange={(aberto) => {
          if (!aberto) setContatoAtivo(null);
        }}
      >
        <DialogContent className="left-auto right-0 top-0 h-full max-w-[420px] translate-x-0 translate-y-0 rounded-none border-l bg-background p-0 sm:rounded-l-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do contato</DialogTitle>
            <DialogDescription>
              Painel com informações detalhadas do contato selecionado.
            </DialogDescription>
          </DialogHeader>
          {contatoAtivo && (
            <div className="flex h-full flex-col">
              <div className="border-b border-border/60 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/avatars/contato-placeholder.svg" />
                    <AvatarFallback>
                      {iniciaisContato(contatoAtivo.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold">{contatoAtivo.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {exibirTelefone(contatoAtivo.telefone)} ·{" "}
                      {exibirEmail(contatoAtivo.email)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={statusBadgeVariant[contatoAtivo.status]}>
                    {statusLabel[contatoAtivo.status]}
                  </Badge>
                  {contatoAtivo.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline">{contatoAtivo.owner}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  <div className="grid gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Empresa</span>
                      <span>{contatoAtivo.empresa ?? "Sem empresa"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span>{contatoAtivo.owner}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Última atividade
                      </span>
                      <span>{contatoAtivo.ultimaAtividade}</span>
                    </div>
                  </div>

                  <Tabs defaultValue="visao-geral">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
                      <TabsTrigger value="conversas">Conversas</TabsTrigger>
                      <TabsTrigger value="atividades">Atividades</TabsTrigger>
                      <TabsTrigger value="notas">Notas</TabsTrigger>
                      <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                      <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                    </TabsList>
                    <TabsContent value="visao-geral" className="pt-4">
                      <div className="space-y-3 text-sm">
                        <p className="font-medium">Resumo do contato</p>
                        <p className="text-muted-foreground">
                          Histórico resumido de interações e negócios vinculados.
                        </p>
                        <Separator />
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span>{exibirEmail(contatoAtivo.email)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telefone</span>
                            <span>{exibirTelefone(contatoAtivo.telefone)}</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="conversas" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Conversas vinculadas ao contato aparecerão aqui.
                      </div>
                    </TabsContent>
                    <TabsContent value="atividades" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Atividades e tarefas vinculadas ao contato.
                      </div>
                    </TabsContent>
                    <TabsContent value="notas" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Notas internas serão exibidas aqui.
                      </div>
                    </TabsContent>
                    <TabsContent value="arquivos" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Arquivos compartilhados com o contato.
                      </div>
                    </TabsContent>
                    <TabsContent value="auditoria" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Histórico de alterações do contato.
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
