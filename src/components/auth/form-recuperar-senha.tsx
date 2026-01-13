"use client";

import * as React from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function FormRecuperarSenha() {
  const [email, setEmail] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState<string | null>(null);

  const handleEnviar = async () => {
    if (!email) {
      setErro("Informe seu email.");
      return;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    setCarregando(true);
    setErro(null);
    setSucesso(null);
    const redirectTo = `${siteUrl}/atualizar-senha`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }
    setSucesso("Enviamos um link para redefinir sua senha.");
    setCarregando(false);
  };

  return (
    <div className="space-y-4">
      <Input
        type="email"
        placeholder="email@empresa.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {sucesso && <p className="text-xs text-emerald-600">{sucesso}</p>}
      <Button className="w-full" onClick={handleEnviar} disabled={carregando}>
        {carregando ? "Enviando..." : "Enviar link"}
      </Button>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Lembrou da senha?{" "}
        <Link href="/entrar" className="text-foreground hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
