"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GateMode = "none" | "planos" | "trial_expirado";

export function GatePlanoTrial() {
  const pathname = usePathname();
  const router = useRouter();
  const [modo, setModo] = React.useState<GateMode>("none");

  React.useEffect(() => {
    let ativo = true;

    const carregarStatus = async () => {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) {
        if (ativo) setModo("none");
        return;
      }

      const response = await fetch("/api/plans/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!ativo) return;

      if (!response.ok) {
        setModo("none");
        return;
      }

      const payload = (await response.json()) as {
        status?: "plan_unselected" | "trial_expired" | "trialing";
      };

      if (payload.status === "plan_unselected") {
        setModo("planos");
        if (pathname !== "/planos") {
          router.replace("/planos");
        }
        return;
      }

      if (payload.status === "trial_expired") {
        setModo("trial_expirado");
        return;
      }

      setModo("none");
    };

    void carregarStatus();

    return () => {
      ativo = false;
    };
  }, [pathname, router]);

  if (modo !== "trial_expirado") {
    return null;
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Periodo de teste encerrado</DialogTitle>
          <DialogDescription>
            Seu trial de 30 dias terminou. O acesso ao app permanece bloqueado
            ate a liberacao do checkout de assinatura.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.replace("/planos")}>
            Ver planos
          </Button>
          <Button onClick={() => router.replace("/entrar")}>Sair</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
