"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

const CHAVE_SOM = "vpcrm:alerta-som";

export function SomAlerta({ ativo }: { ativo: boolean }) {
  const [somAtivo, setSomAtivo] = React.useState(false);

  React.useEffect(() => {
    const valor = window.localStorage.getItem(CHAVE_SOM);
    if (valor) {
      setSomAtivo(valor === "true");
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(CHAVE_SOM, String(somAtivo));
  }, [somAtivo]);

  React.useEffect(() => {
    if (!somAtivo || !ativo) {
      return;
    }

    const contexto = new AudioContext();
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();

    oscilador.type = "sine";
    oscilador.frequency.value = 760;
    ganho.gain.value = 0.12;

    oscilador.connect(ganho);
    ganho.connect(contexto.destination);

    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.4);

    return () => {
      oscilador.disconnect();
      ganho.disconnect();
      contexto.close();
    };
  }, [somAtivo, ativo]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2">
      <div>
        <p className="text-sm font-medium">Som de alertas</p>
        <p className="text-xs text-muted-foreground">
          Ative para receber aviso sonoro.
        </p>
      </div>
      <Switch checked={somAtivo} onCheckedChange={setSomAtivo} />
    </div>
  );
}
