"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import type { CanalId } from "@/lib/types";
import { nomeCanal } from "@/lib/canais";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { statusBadge, templatesAgente, tiposAgente } from "@/lib/config-agentes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconeCanal } from "@/components/inbox/icone-canal";

type AgenteCard = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  canais: CanalId[];
  uso: { utilizado: number; limite: number };
};

const canalBadgeStyles: Record<CanalId, string> = {
  whatsapp: "border-emerald-200/70 bg-emerald-500/10 text-emerald-700",
  instagram: "border-pink-200/70 bg-pink-500/10 text-pink-700",
};

export function VisaoAgentes() {
  const { plano, workspace, usuario } = useAutenticacao();
  const podeEditar = usuario?.role === "ADMIN";
  const autenticando = !usuario?.id;
  const [agentes, setAgentes] = React.useState<AgenteCard[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [agenteExclusao, setAgenteExclusao] = React.useState<AgenteCard | null>(
    null
  );
  const [excluindo, setExcluindo] = React.useState(false);
  const [erroExclusao, setErroExclusao] = React.useState<string | null>(null);
  const limiteAgentes = plano.limites.agentes;
  const limiteIlimitado = plano.nome === "Premium";
  const limiteAtingido = !limiteIlimitado && agentes.length >= limiteAgentes;
  const limiteAgentesLabel = limiteIlimitado
    ? "ilimitados"
    : String(limiteAgentes);

  React.useEffect(() => {
    if (!usuario?.id) {
      return;
    }
    if (!workspace?.id || !podeEditar) {
      setCarregando(false);
      return;
    }
    let ativo = true;

    const carregar = async () => {
      try {
        setErro(null);
        setCarregando(true);

        const { data: agentesDb } = await supabaseClient
          .from("agents")
          .select("id, nome, tipo, status, integration_account_id")
          .eq("workspace_id", workspace.id);

        const { data: credits } = await supabaseClient
          .from("workspace_credits")
          .select("credits_total")
          .eq("workspace_id", workspace.id)
          .maybeSingle();

        const { data: creditEvents } = await supabaseClient
          .from("agent_credit_events")
          .select("agent_id, credits")
          .eq("workspace_id", workspace.id);

        const usageMap = new Map<string, number>();
        (creditEvents ?? []).forEach((evento) => {
          const atual = usageMap.get(evento.agent_id) ?? 0;
          usageMap.set(evento.agent_id, atual + Number(evento.credits || 0));
        });

        if (!ativo) return;

        const limite = credits?.credits_total ?? 0;
        setAgentes(
          (agentesDb ?? []).map((agente) => ({
            id: agente.id,
            nome: agente.nome,
            tipo: agente.tipo,
            status: agente.status,
            canais: agente.integration_account_id ? ["whatsapp"] : ([] as CanalId[]),
            uso: {
              utilizado: usageMap.get(agente.id) ?? 0,
              limite,
            },
          }))
        );
      } catch {
        if (ativo) {
          setErro("Nao foi possivel carregar os agentes.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, [workspace?.id, podeEditar, usuario?.id]);

  const skeletonCards = Array.from({ length: 3 }).map((_, index) => (
    <Card key={`agente-skeleton-${index}`}>
      <CardContent className="space-y-3 p-3 text-center">
        <Skeleton className="mx-auto h-5 w-20 rounded-[6px]" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-40" />
          <Skeleton className="mx-auto h-3 w-32" />
        </div>
        <div className="flex justify-center gap-2">
          <Skeleton className="h-5 w-20 rounded-[6px]" />
          <Skeleton className="h-5 w-20 rounded-[6px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-3 w-28" />
          <Skeleton className="h-2 w-full" />
        </div>
      </CardContent>
    </Card>
  ));

  if (!podeEditar) {
    if (autenticando) {
      return (
        <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {skeletonCards}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4 [&_*]:rounded-[6px] [&_*]:shadow-none">
        <h1 className="text-2xl font-semibold">Agentes I.A</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Apenas administradores podem acessar as configuracoes do agente.
          </CardContent>
        </Card>
      </div>
    );
  }

  const botaoCriar = limiteAtingido ? (
    <Button className="gap-2" disabled>
      <Plus className="h-4 w-4" />
      Criar agente
    </Button>
  ) : (
    <Button asChild className="gap-2">
      <Link href="/app/agentes/novo">
        <Plus className="h-4 w-4" />
        Criar agente
      </Link>
    </Button>
  );

  const handleConfirmarExclusao = async () => {
    if (!agenteExclusao) return;
    setExcluindo(true);
    setErroExclusao(null);
    const { error } = await supabaseClient
      .from("agents")
      .delete()
      .eq("id", agenteExclusao.id);
    if (error) {
      setErroExclusao("Nao foi possivel excluir o agente.");
      setExcluindo(false);
      return;
    }
    setAgentes((atual) => atual.filter((item) => item.id !== agenteExclusao.id));
    setAgenteExclusao(null);
    setExcluindo(false);
  };

  const renderStatusBadge = (status: string) => {
    type StatusAgente = keyof typeof statusBadge;
    const key: StatusAgente = status in statusBadge ? (status as StatusAgente) : "pausado";
    const badge = statusBadge[key];
    return (
      <Badge
        variant={badge.variant}
        className="inline-flex items-center gap-2 px-3 py-1 text-[11px]"
      >
        {key === "ativo" && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-[6px] bg-emerald-500/70 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-[6px] bg-emerald-500" />
          </span>
        )}
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agentes I.A</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie agentes inteligentes e seus limites de atuação.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{botaoCriar}</TooltipTrigger>
            {limiteAtingido && (
              <TooltipContent className="rounded-[6px] shadow-none">
                Limite de {limiteAgentesLabel} agentes atingido. Faça upgrade.
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {erro && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      )}

      {limiteAtingido && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 text-sm">
              <CircleAlert className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Limite de agentes atingido</p>
                <p className="text-xs text-muted-foreground">
                  Seu plano permite {limiteAgentesLabel} agentes simultâneos.
                </p>
              </div>
            </div>
            <Button variant="outline">Fazer upgrade</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {carregando && skeletonCards}
        {!carregando && agentes.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum agente criado ainda.
            </CardContent>
          </Card>
        )}
        {!carregando &&
          agentes.map((agente) => {
          const usoPercentual = agente.uso.limite
            ? Math.min(
                100,
                Math.round((agente.uso.utilizado / agente.uso.limite) * 100)
              )
            : 0;
          const descricao = templatesAgente.find(
            (item) => item.id === agente.tipo
          )?.descricao;
          return (
            <Link
              key={agente.id}
              href={`/app/agentes/${agente.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <Card className="relative transition hover:border-primary/40 hover:bg-primary/5">
                <CardContent className="space-y-2 p-3 pt-10 text-left">
                  <div className="absolute left-2 top-2">
                    {renderStatusBadge(agente.status)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAgenteExclusao(agente);
                    }}
                    aria-label={`Excluir ${agente.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">{agente.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {tiposAgente.find((item) => item.value === agente.tipo)?.label}
                    </p>
                    {descricao && (
                      <p className="text-xs text-muted-foreground">{descricao}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-start gap-2">
                    {agente.canais.map((canal) => (
                      <Badge
                        key={canal}
                        variant="outline"
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 text-[11px]",
                          canalBadgeStyles[canal]
                        )}
                      >
                        <IconeCanal canal={canal} className="h-3.5 w-3.5" />
                        {nomeCanal(canal)}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Uso do agente</span>
                      <span>
                        {agente.uso.utilizado}/{agente.uso.limite}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-[6px] bg-muted">
                      <div
                        className="h-1.5 rounded-[6px] bg-primary/70"
                        style={{ width: `${usoPercentual}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <Dialog open={Boolean(agenteExclusao)} onOpenChange={() => setAgenteExclusao(null)}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Excluir agente?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente e remove as configurações do agente.
            </DialogDescription>
          </DialogHeader>
          {erroExclusao && (
            <p className="text-sm text-destructive">{erroExclusao}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={excluindo}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
