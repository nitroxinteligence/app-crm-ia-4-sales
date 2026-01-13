"use client";

import * as React from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { Button } from "@/components/ui/button";

export function AvisoOnboarding() {
  const { workspace } = useAutenticacao();
  const [visivel, setVisivel] = React.useState(false);

  React.useEffect(() => {
    if (!workspace?.id) return;
    let ativo = true;

    const carregar = async () => {
      const { data } = await supabaseClient
        .from("workspace_settings")
        .select("onboarding_concluido, onboarding_pulado")
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (!ativo) return;
      const concluido = data?.onboarding_concluido ?? false;
      const pulado = data?.onboarding_pulado ?? false;
      setVisivel(!concluido && !pulado);
    };

    carregar();
    return () => {
      ativo = false;
    };
  }, [workspace?.id]);

  const handleDispensar = async () => {
    if (!workspace?.id) return;
    await supabaseClient
      .from("workspace_settings")
      .update({ onboarding_pulado: true })
      .eq("workspace_id", workspace.id);
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Finalize o onboarding do workspace</p>
          <p className="text-xs text-muted-foreground">
            Conecte canais e crie seu primeiro agente quando quiser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/onboarding">Abrir onboarding</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDispensar}>
            Dispensar
          </Button>
        </div>
      </div>
    </div>
  );
}
