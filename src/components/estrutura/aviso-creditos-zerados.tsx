"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CreditosWorkspace = {
  credits_total: number;
  credits_used: number;
  period_start: string | null;
  period_end: string | null;
};

const INTERVALO_MS = 60_000;

export function AvisoCreditosZerados() {
  const { usuario, idioma } = useAutenticacao();
  const [creditos, setCreditos] = React.useState<CreditosWorkspace | null>(null);
  const [aberto, setAberto] = React.useState(false);
  const [dispensado, setDispensado] = React.useState(false);

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const carregarCreditos = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/settings/billing", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { credits?: CreditosWorkspace | null };
    setCreditos(payload.credits ?? null);
  }, []);

  React.useEffect(() => {
    if (!usuario?.id) return;
    setDispensado(false);
    void carregarCreditos();
    const timer = window.setInterval(() => {
      void carregarCreditos();
    }, INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, [carregarCreditos, usuario?.id]);

  React.useEffect(() => {
    if (!creditos?.credits_total) {
      setAberto(false);
      return;
    }
    const semCreditos = creditos.credits_used >= creditos.credits_total;
    setAberto(semCreditos && !dispensado);
  }, [creditos, dispensado]);

  if (!creditos?.credits_total) {
    return null;
  }

  const isAdmin = usuario.role === "ADMIN";
  const titulo = t("Créditos esgotados", "Credits exhausted");
  const descricao = isAdmin
    ? t(
        "O agente pausou automaticamente por falta de créditos. Recarregue para voltar a enviar mensagens.",
        "The agent paused automatically due to missing credits. Recharge to send messages again."
      )
    : t(
        "O agente pausou automaticamente por falta de créditos. Fale com o administrador do workspace.",
        "The agent paused automatically due to missing credits. Contact your workspace admin."
      );

  return (
    <Dialog
      open={aberto}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setDispensado(true);
          setAberto(false);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>{t("Uso de créditos", "Credit usage")}</span>
          <Badge variant="outline">
            {creditos.credits_used} / {creditos.credits_total}
          </Badge>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setDispensado(true)}>
            {t("Agora não", "Not now")}
          </Button>
          <Button asChild>
            <Link href="/app/configuracoes/cobranca">
              {isAdmin ? t("Recarregar créditos", "Recharge credits") : t("Ver plano", "View plan")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
