"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarraLateral } from "@/components/estrutura/barra-lateral";
import { AvisoCreditosZerados } from "@/components/estrutura/aviso-creditos-zerados";
import { AvisoOnboarding } from "@/components/estrutura/aviso-onboarding";
import { GatePlanoTrial } from "@/components/estrutura/gate-plano-trial";
import { ProvedorAutenticacao } from "@/lib/contexto-autenticacao";
import { supabaseClient } from "@/lib/supabase/client";

const CHAVE_COLAPSO = "vpcrm:sidebar-colapsada";

export function CascaApp({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorAutenticacao>
      <LayoutInterno>{children}</LayoutInterno>
    </ProvedorAutenticacao>
  );
}

function LayoutInterno({ children }: { children: React.ReactNode }) {
  const [colapsada, setColapsada] = React.useState(true);
  const [sessaoValida, setSessaoValida] = React.useState(false);
  const [verificandoSessao, setVerificandoSessao] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const modoFoco = pathname.startsWith("/app/agentes/novo");
  const modoInbox = pathname.startsWith("/app/inbox");

  React.useEffect(() => {
    let ativo = true;

    const validarSessao = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!ativo) return;
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      setSessaoValida(true);
      setVerificandoSessao(false);
    };

    void validarSessao();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession) {
        setSessaoValida(false);
        setVerificandoSessao(true);
        router.replace("/entrar");
        return;
      }
      setSessaoValida(true);
      setVerificandoSessao(false);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [router]);

  React.useEffect(() => {
    const valor = window.localStorage.getItem(CHAVE_COLAPSO);
    if (valor !== null) {
      setColapsada(valor === "true");
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(CHAVE_COLAPSO, String(colapsada));
  }, [colapsada]);

  if (verificandoSessao || !sessaoValida) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (modoFoco) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <GatePlanoTrial />
        <AvisoCreditosZerados />
        <main className="min-h-screen px-6 py-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <GatePlanoTrial />
      <AvisoCreditosZerados />
      <BarraLateral
        colapsada={colapsada}
        aoAlternar={() => setColapsada((atual) => !atual)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main
          className={
            modoInbox
              ? "flex-1 min-h-0 px-6 pb-10 pt-4 overflow-hidden"
              : "flex-1 px-6 pb-10 pt-6"
          }
        >
          <div className="mx-auto w-full max-w-[1440px]">
            <AvisoOnboarding />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
