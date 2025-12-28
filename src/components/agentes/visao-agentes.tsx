"use client";

import Link from "next/link";
import { CircleAlert, Plus } from "lucide-react";
import { agentesIA } from "@/lib/mock/agentes";
import { nomeCanal } from "@/lib/canais";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { statusBadge, tiposAgente } from "@/lib/config-agentes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function VisaoAgentes() {
  const { plano } = useAutenticacao();
  const agentes = agentesIA;
  const limiteAgentes = plano.limites.agentes;
  const limiteAtingido = agentes.length >= limiteAgentes;

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

  return (
    <div className="space-y-6">
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
              <TooltipContent>
                Limite de {limiteAgentes} agentes atingido. Faça upgrade.
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {limiteAtingido && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 text-sm">
              <CircleAlert className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Limite de agentes atingido</p>
                <p className="text-xs text-muted-foreground">
                  Seu plano permite {limiteAgentes} agentes simultâneos.
                </p>
              </div>
            </div>
            <Button variant="outline">Fazer upgrade</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agentes.map((agente) => {
          const usoPercentual = Math.min(
            100,
            Math.round((agente.uso.utilizado / agente.uso.limite) * 100)
          );
          return (
            <Link
              key={agente.id}
              href={`/app/agentes/${agente.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <Card className="transition hover:border-primary/40 hover:bg-primary/5">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold">{agente.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {tiposAgente.find((item) => item.value === agente.tipo)?.label}
                      </p>
                    </div>
                    <Badge variant={statusBadge[agente.status].variant}>
                      {statusBadge[agente.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agente.canais.map((canal) => (
                      <Badge key={canal} variant="outline">
                        {nomeCanal(canal)}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Uso do agente</span>
                      <span>
                        {agente.uso.utilizado}/{agente.uso.limite}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/70"
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
    </div>
  );
}
