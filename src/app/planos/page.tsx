"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAutenticacao, ProvedorAutenticacao } from "@/lib/contexto-autenticacao";
import { GatePlanoTrial } from "@/components/estrutura/gate-plano-trial";
import { VisaoCobrancaConfiguracoes } from "@/components/configuracoes/visao-cobranca";

function ConteudoPlanosPage() {
  const router = useRouter();
  const { workspace, session } = useAutenticacao();
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    if (!session) {
      router.replace("/entrar");
      return;
    }
    setCarregando(false);
  }, [router, session]);

  React.useEffect(() => {
    if (!carregando && workspace?.planoSelecionadoEm) {
      router.replace("/app/painel");
    }
  }, [carregando, router, workspace?.planoSelecionadoEm]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <GatePlanoTrial />
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <VisaoCobrancaConfiguracoes modo="selecao" layout="pagina" />
      </div>
    </main>
  );
}

function PlanosPage() {
  return (
    <ProvedorAutenticacao>
      <ConteudoPlanosPage />
    </ProvedorAutenticacao>
  );
}

export default PlanosPage;
