"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function FormLogin() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/app/painel");
      }
    });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !senha) {
      setErro("Preencha email e senha.");
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }
    router.push("/app/painel");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/recuperar-senha" className="hover:text-foreground">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="hover:text-foreground">
          Criar conta
        </Link>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <Button className="w-full" onClick={handleLogin} disabled={carregando}>
        {carregando ? "Entrando..." : "Entrar"}
      </Button>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Ao continuar voce concorda com os termos de uso e politica de privacidade.
      </p>
    </div>
  );
}
