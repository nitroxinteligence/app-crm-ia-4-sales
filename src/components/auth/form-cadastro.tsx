"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function FormCadastro() {
  const router = useRouter();
  const [nome, setNome] = React.useState("");
  const [empresa, setEmpresa] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState<string | null>(null);

  const handleCadastro = async () => {
    if (!nome || !empresa || !email || !senha) {
      setErro("Preencha todos os campos.");
      return;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    setCarregando(true);
    setErro(null);
    setSucesso(null);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          full_name: nome,
          workspace_name: empresa,
        },
        emailRedirectTo: `${siteUrl}/onboarding`,
      },
    });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    if (!data.session) {
      setSucesso("Conta criada! Verifique seu email para confirmar o acesso.");
      setCarregando(false);
      return;
    }

    router.push("/onboarding");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <Input
          placeholder="Seu nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
        <Input
          placeholder="Nome da empresa"
          value={empresa}
          onChange={(event) => setEmpresa(event.target.value)}
        />
        <Input
          type="email"
          placeholder="email@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
        />
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {sucesso && <p className="text-xs text-emerald-600">{sucesso}</p>}
      <Button className="w-full" onClick={handleCadastro} disabled={carregando}>
        {carregando ? "Criando conta..." : "Criar conta"}
      </Button>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Ja tem uma conta?{" "}
        <Link href="/entrar" className="text-foreground hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
