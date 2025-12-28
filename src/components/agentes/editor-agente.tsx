"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, PauseCircle, UploadCloud } from "lucide-react";
import type {
  AgenteIA,
  ArquivoConhecimento,
  CanalId,
  IdiomaAgente,
  LogAgente,
  ModoAgente,
  TipoAgente,
  TomAgente,
} from "@/lib/types";
import { nomeCanal } from "@/lib/canais";
import { arquivosConhecimentoMock, logsAgentesMock } from "@/lib/mock/agentes";
import {
  canaisDisponiveis,
  horariosAgente,
  idiomasAgente,
  modosAgente,
  permissoesBase,
  statusBadge,
  templatesAgente,
  tiposAgente,
  tonsAgente,
} from "@/lib/config-agentes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EditorAgenteProps = {
  modo: "criar" | "editar";
  agenteInicial?: AgenteIA;
};

const agenteVazio: AgenteIA = {
  id: "novo",
  nome: "",
  tipo: "sdr",
  status: "ativo",
  canais: ["whatsapp"],
  modo: "assistido",
  idioma: "pt",
  tom: "consultivo",
  horario: "comercial",
  uso: { utilizado: 0, limite: 600 },
};

export function EditorAgente({ modo, agenteInicial }: EditorAgenteProps) {
  const router = useRouter();
  const modoCriacao = modo === "criar";
  const agenteBase = React.useMemo(
    () => agenteInicial ?? agenteVazio,
    [agenteInicial]
  );

  const [abaAtiva, setAbaAtiva] = React.useState("configuracao");
  const [formAgente, setFormAgente] = React.useState<AgenteIA>(agenteBase);
  const [permissoes, setPermissoes] = React.useState<Record<string, boolean>>(
    () =>
      permissoesBase.reduce(
        (acc, item) => ({ ...acc, [item.id]: item.habilitado }),
        {} as Record<string, boolean>
      )
  );
  const [arquivosConhecimento, setArquivosConhecimento] =
    React.useState<ArquivoConhecimento[]>(arquivosConhecimentoMock);
  const [faq, setFaq] = React.useState("");
  const [logsAuditoria, setLogsAuditoria] =
    React.useState<LogAgente[]>(logsAgentesMock);
  const [mensagensTeste, setMensagensTeste] = React.useState<
    { id: string; autor: "usuario" | "agente"; texto: string }[]
  >([
    { id: "msg-1", autor: "usuario", texto: "Olá, preciso de ajuda com uma proposta." },
    {
      id: "msg-2",
      autor: "agente",
      texto: "Claro! Posso sugerir um resumo da conversa e próximos passos.",
    },
  ]);
  const [mensagemAtual, setMensagemAtual] = React.useState("");
  const [filtroAuditoriaPeriodo, setFiltroAuditoriaPeriodo] =
    React.useState("30d");
  const [filtroAuditoriaCanal, setFiltroAuditoriaCanal] =
    React.useState<CanalId | "todos">("todos");
  const [filtroAuditoriaAcao, setFiltroAuditoriaAcao] =
    React.useState("todas");

  React.useEffect(() => {
    setFormAgente(agenteBase);
  }, [agenteBase]);

  const handleToggleCanal = (canal: CanalId) => {
    setFormAgente((atual) => {
      const existe = atual.canais.includes(canal);
      return {
        ...atual,
        canais: existe
          ? atual.canais.filter((item) => item !== canal)
          : [...atual.canais, canal],
      };
    });
  };

  const handleTogglePermissao = (id: string, habilitado: boolean) => {
    setPermissoes((atual) => ({ ...atual, [id]: habilitado }));
  };

  const handleUploadConhecimento = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = Array.from(event.target.files ?? []);
    if (arquivos.length === 0) return;
    setArquivosConhecimento((atual) => {
      const restante = 10 - atual.length;
      const novos = arquivos.slice(0, Math.max(restante, 0)).map((arquivo) => {
        const extensao = arquivo.name.split(".").pop()?.toLowerCase();
        const tipo =
          extensao === "pdf" || extensao === "txt" || extensao === "docx"
            ? (extensao as "pdf" | "txt" | "docx")
            : "pdf";
        return {
          id: `arquivo-${Date.now()}-${arquivo.name}`,
          nome: arquivo.name,
          tipo,
          status: "processando",
        } satisfies ArquivoConhecimento;
      });
      return [...atual, ...novos];
    });
    event.target.value = "";
  };

  const handleRemoverArquivo = (id: string) => {
    setArquivosConhecimento((atual) => atual.filter((item) => item.id !== id));
  };

  const handleEnviarTeste = () => {
    if (!mensagemAtual.trim()) return;
    const texto = mensagemAtual.trim();
    setMensagensTeste((atual) => [
      ...atual,
      { id: `msg-${Date.now()}`, autor: "usuario", texto },
      {
        id: `msg-${Date.now()}-bot`,
        autor: "agente",
        texto: "Resposta gerada pelo agente com base nas políticas atuais.",
      },
    ]);
    setMensagemAtual("");
  };

  const handleResetarTeste = () => {
    setMensagensTeste([]);
  };

  const handleSalvarAgente = () => {
    if (!formAgente.nome.trim()) return;
    router.push("/app/agentes");
  };

  const logsFiltrados = React.useMemo(() => {
    return logsAuditoria.filter((log) => {
      if (filtroAuditoriaCanal !== "todos" && log.canal !== filtroAuditoriaCanal) {
        return false;
      }
      if (
        filtroAuditoriaAcao !== "todas" &&
        !log.acao.toLowerCase().includes(filtroAuditoriaAcao.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filtroAuditoriaAcao, filtroAuditoriaCanal, logsAuditoria]);

  const nomeInvalido = !formAgente.nome.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/agentes" className="inline-flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar para agentes
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {modoCriacao ? "Novo agente" : formAgente.nome || "Agente"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {modoCriacao
                ? "Etapas para configurar o agente."
                : tiposAgente.find((item) => item.value === formAgente.tipo)?.label}
            </p>
          </div>
        </div>
        {!modoCriacao && (
          <Badge variant={statusBadge[formAgente.status].variant}>
            {statusBadge[formAgente.status].label}
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4">
            <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="configuracao">Configuração</TabsTrigger>
                <TabsTrigger value="acoes">Ações</TabsTrigger>
                <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
                <TabsTrigger value="testar">Testar</TabsTrigger>
                <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
              </TabsList>

              <TabsContent value="configuracao" className="pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Templates recomendados</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {templatesAgente.map((template) => {
                        const Icone = template.icone;
                        const ativo = formAgente.tipo === template.id;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              setFormAgente((atual) => ({
                                ...atual,
                                tipo: template.id as TipoAgente,
                              }))
                            }
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3 text-left text-sm transition",
                              ativo && "border-primary/50 bg-primary/5"
                            )}
                          >
                            <span className="mt-1 rounded-lg bg-primary/10 p-2 text-primary">
                              <Icone className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="font-medium">{template.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {template.descricao}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <label htmlFor="agente-nome" className="text-sm font-medium">
                        Nome do agente
                      </label>
                      <Input
                        id="agente-nome"
                        value={formAgente.nome}
                        onChange={(event) =>
                          setFormAgente((atual) => ({
                            ...atual,
                            nome: event.target.value,
                          }))
                        }
                        placeholder="Ex: Maya SDR"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Função</label>
                      <Select
                        value={formAgente.tipo}
                        onValueChange={(valor) =>
                          setFormAgente((atual) => ({
                            ...atual,
                            tipo: valor as TipoAgente,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposAgente.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Tom de voz</label>
                        <Select
                          value={formAgente.tom}
                          onValueChange={(valor) =>
                            setFormAgente((atual) => ({
                              ...atual,
                              tom: valor as TomAgente,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tom" />
                          </SelectTrigger>
                          <SelectContent>
                            {tonsAgente.map((tom) => (
                              <SelectItem key={tom.value} value={tom.value}>
                                {tom.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Idioma</label>
                        <Select
                          value={formAgente.idioma}
                          onValueChange={(valor) =>
                            setFormAgente((atual) => ({
                              ...atual,
                              idioma: valor as IdiomaAgente,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o idioma" />
                          </SelectTrigger>
                          <SelectContent>
                            {idiomasAgente.map((idioma) => (
                              <SelectItem key={idioma.value} value={idioma.value}>
                                {idioma.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Horário de atuação
                      </label>
                      <Select
                        value={formAgente.horario}
                        onValueChange={(valor) =>
                          setFormAgente((atual) => ({
                            ...atual,
                            horario: valor as AgenteIA["horario"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {horariosAgente.map((horario) => (
                            <SelectItem key={horario.value} value={horario.value}>
                              {horario.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Canais ativos</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {canaisDisponiveis.map((canal) => (
                          <label
                            key={canal}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={formAgente.canais.includes(canal)}
                              onCheckedChange={() => handleToggleCanal(canal)}
                            />
                            {nomeCanal(canal)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                      <p className="font-medium">Escalonamento para humano</p>
                      <p className="text-xs text-muted-foreground">
                        Defina regras para pausar o agente e transferir para o time.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Variáveis do workspace</p>
                      <div className="flex flex-wrap gap-2">
                        {["Nome da empresa", "Plano", "Segmento"].map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="acoes" className="pt-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Modo de atuação</label>
                    <Select
                      value={formAgente.modo}
                      onValueChange={(valor) =>
                        setFormAgente((atual) => ({
                          ...atual,
                          modo: valor as ModoAgente,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modosAgente.map((modo) => (
                          <SelectItem key={modo.value} value={modo.value}>
                            {modo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Permissões</p>
                    <div className="space-y-2">
                      {permissoesBase.map((permissao) => (
                        <div
                          key={permissao.id}
                          className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{permissao.label}</p>
                            {permissao.bloqueado && (
                              <p className="text-xs text-muted-foreground">
                                Bloqueado nesta versão.
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={permissoes[permissao.id]}
                            onCheckedChange={(valor) =>
                              handleTogglePermissao(permissao.id, valor)
                            }
                            disabled={permissao.bloqueado}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Ações por minuto
                      </label>
                      <Input type="number" placeholder="Ex: 20" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Ações por dia
                      </label>
                      <Input type="number" placeholder="Ex: 200" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="conhecimento" className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Arquivos de conhecimento</p>
                      <p className="text-xs text-muted-foreground">
                        Limite de 10 arquivos por agente.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {arquivosConhecimento.length}/10
                    </Badge>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-sm">
                    <UploadCloud className="h-4 w-4" />
                    Enviar arquivos
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.txt,.docx"
                      onChange={handleUploadConhecimento}
                    />
                  </label>
                  <div className="space-y-2">
                    {arquivosConhecimento.map((arquivo) => (
                      <div
                        key={arquivo.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{arquivo.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {arquivo.tipo.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              arquivo.status === "pronto" ? "secondary" : "outline"
                            }
                          >
                            {arquivo.status === "pronto" ? "Pronto" : "Processando"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverArquivo(arquivo.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">FAQ / Manual</label>
                    <Textarea
                      value={faq}
                      onChange={(event) => setFaq(event.target.value)}
                      placeholder="Adicione instruções, respostas e políticas internas."
                      rows={5}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testar" className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Sandbox</p>
                    <Button variant="outline" size="sm" onClick={handleResetarTeste}>
                      Resetar conversa
                    </Button>
                  </div>
                  <div className="flex h-[320px] flex-col rounded-xl border border-border/60 bg-background/70">
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {mensagensTeste.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground">
                            Inicie uma conversa para testar o agente.
                          </p>
                        ) : (
                          mensagensTeste.map((mensagem) => (
                            <div
                              key={mensagem.id}
                              className={cn(
                                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                                mensagem.autor === "usuario"
                                  ? "ml-auto bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              {mensagem.texto}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <div className="border-t border-border/60 p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={mensagemAtual}
                          onChange={(event) => setMensagemAtual(event.target.value)}
                          placeholder="Digite uma mensagem..."
                        />
                        <Button onClick={handleEnviarTeste}>Enviar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="auditoria" className="pt-4">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                      value={filtroAuditoriaPeriodo}
                      onValueChange={setFiltroAuditoriaPeriodo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filtroAuditoriaCanal}
                      onValueChange={(valor) =>
                        setFiltroAuditoriaCanal(valor as CanalId | "todos")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os canais</SelectItem>
                        {canaisDisponiveis.map((canal) => (
                          <SelectItem key={canal} value={canal}>
                            {nomeCanal(canal)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={filtroAuditoriaAcao}
                      onChange={(event) => setFiltroAuditoriaAcao(event.target.value)}
                      placeholder="Filtrar ação"
                    />
                  </div>
                  <div className="space-y-3">
                    {logsFiltrados.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{log.acao}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.data} · {nomeCanal(log.canal)}
                            </p>
                          </div>
                          <Badge variant="outline">{log.resultado}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {log.alvo}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {formAgente.status === "ativo" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <PauseCircle className="h-4 w-4 text-muted-foreground" />
              )}
              {modoCriacao ? "Configuração em andamento" : "Status do agente"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push("/app/agentes")}
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvarAgente} disabled={nomeInvalido}>
                {modoCriacao ? "Criar agente" : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
