"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    let ativo = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      router.replace(data.session ? "/app/painel" : "/entrar");
    });

    return () => {
      ativo = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
      Carregando...
    </div>
  );
}
