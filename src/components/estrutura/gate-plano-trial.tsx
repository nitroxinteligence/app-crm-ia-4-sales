"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
        status?: "trial_expired" | "trialing" | "active";
      };

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
  }, [router]);

  if (modo !== "trial_expirado") {
    return null;
  }

  return (
    <Dialog open onOpenChange={() => { }}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Seu plano PRO de testes acabou</DialogTitle>
          <DialogDescription>
            Seu trial de 30 dias expirou. Para continuar utilizando todas as funcionalidades e liberar o acesso completo, você precisa escolher um plano.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={() => router.replace("/planos")}
          >
            Escolher plano agora!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
