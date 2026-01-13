"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PROVIDER_OFICIAL = "whatsapp_oficial" as const;
const PROVIDER_BAILEYS = "whatsapp_baileys" as const;

export function SelecionarProviderAgente() {
  const router = useRouter();

  const irParaConfiguracao = (
    provider: typeof PROVIDER_OFICIAL | typeof PROVIDER_BAILEYS
  ) => {
    router.push(`/app/agentes/novo/configuracao?provider=${provider}`);
  };

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Conectar canal do agente</h1>
        <p className="text-sm text-muted-foreground">
          Escolha a integracao principal para configurar o agente.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer border-border/60 transition hover:border-foreground/40">
          <CardContent className="space-y-3 p-5" onClick={() => irParaConfiguracao(PROVIDER_OFICIAL)}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">API Oficial do WhatsApp (Meta)</p>
              <Badge variant="secondary">Recomendado</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Templates aprovados e compliance com a Meta.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Conectar API Oficial
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-border/60 transition hover:border-foreground/40">
          <CardContent
            className="space-y-3 p-5"
            onClick={() => irParaConfiguracao(PROVIDER_BAILEYS)}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">WhatsApp (API não oficial)</p>
              <Badge variant="outline">QRCode</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Conecte via QR Code e opere com histórico recente.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Conectar API não oficial
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 opacity-60">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Conectar ao Instagram</p>
              <Badge variant="outline">Em breve</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Em breve: integracao completa com o Instagram.
            </p>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
