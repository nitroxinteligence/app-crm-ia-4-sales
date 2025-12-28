"use client";

import * as React from "react";
import { BarraLateral } from "@/components/estrutura/barra-lateral";
import { BarraSuperior } from "@/components/estrutura/barra-superior";
import { ProvedorAutenticacao } from "@/lib/contexto-autenticacao";

const CHAVE_COLAPSO = "vpcrm:sidebar-colapsada";

export function CascaApp({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorAutenticacao>
      <LayoutInterno>{children}</LayoutInterno>
    </ProvedorAutenticacao>
  );
}

function LayoutInterno({ children }: { children: React.ReactNode }) {
  const [colapsada, setColapsada] = React.useState(false);

  React.useEffect(() => {
    const valor = window.localStorage.getItem(CHAVE_COLAPSO);
    if (valor) {
      setColapsada(valor === "true");
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(CHAVE_COLAPSO, String(colapsada));
  }, [colapsada]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <BarraLateral
        colapsada={colapsada}
        aoAlternar={() => setColapsada((atual) => !atual)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <BarraSuperior />
        <main className="flex-1 px-6 pb-10 pt-6">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
