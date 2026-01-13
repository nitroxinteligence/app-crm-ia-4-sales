"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function FormAtualizarSenha() {
  const router = useRouter();
  const [senha, setSenha] = React.useState("");
  const [confirmacao, setConfirmacao] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState<string | null>(null);

  const handleAtualizar = async () => {
    if (!senha || !confirmacao) {
      setErro("Preencha a nova senha.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas nao conferem.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setSucesso(null);
    const { error } = await supabaseClient.auth.updateUser({ password: senha });
    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }
    setSucesso("Senha atualizada. Voce ja pode entrar.");
    setCarregando(false);
    setTimeout(() => router.push("/entrar"), 1200);
  };

  return (
    <div className="space-y-4">
      <Input
        type="password"
        placeholder="Nova senha"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
      />
      <Input
        type="password"
        placeholder="Confirmar nova senha"
        value={confirmacao}
        onChange={(event) => setConfirmacao(event.target.value)}
      />
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {sucesso && <p className="text-xs text-emerald-600">{sucesso}</p>}
      <Button className="w-full" onClick={handleAtualizar} disabled={carregando}>
        {carregando ? "Salvando..." : "Atualizar senha"}
      </Button>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Se ja atualizou, volte para o login.
      </p>
    </div>
  );
}
