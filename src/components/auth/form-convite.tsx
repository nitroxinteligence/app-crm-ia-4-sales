"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type InvitePayload = {
  invite: {
    email: string;
    role?: string;
    workspaceName?: string | null;
  };
};

export function FormConvite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [carregando, setCarregando] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [workspaceNome, setWorkspaceNome] = React.useState<string | null>(null);
  const [nome, setNome] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      if (!token) {
        setErro("Convite invalido.");
        setCarregando(false);
        return;
      }

      const response = await fetch(
        `/api/invites/validate?token=${encodeURIComponent(token)}`
      );

      if (!ativo) return;

      if (!response.ok) {
        const message = await response.text();
        setErro(message || "Convite invalido.");
        setCarregando(false);
        return;
      }

      const payload = (await response.json()) as InvitePayload;
      setEmail(payload.invite.email ?? "");
      setWorkspaceNome(payload.invite.workspaceName ?? null);
      setCarregando(false);
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [token]);

  const handleAceitar = async () => {
    if (!token || !nome.trim() || !senha) {
      setErro("Preencha nome e senha.");
      return;
    }

    setErro(null);
    setSucesso(null);
    setSalvando(true);

    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        nome: nome.trim(),
        senha,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || "Falha ao aceitar convite.");
      setSalvando(false);
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    setSucesso("Conta criada com sucesso.");
    router.replace("/app/painel");
  };

  if (carregando) {
    return (
      <div className="text-sm text-muted-foreground">Carregando...</div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{erro}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/entrar">Voltar ao login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workspaceNome && (
        <p className="text-xs text-muted-foreground">
          Workspace: <span className="text-foreground">{workspaceNome}</span>
        </p>
      )}
      <Input value={email} disabled />
      <Input
        placeholder="Seu nome"
        value={nome}
        onChange={(event) => setNome(event.target.value)}
      />
      <Input
        type="password"
        placeholder="Crie uma senha"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
      />
      {sucesso && <p className="text-xs text-emerald-600">{sucesso}</p>}
      <Button className="w-full" onClick={handleAceitar} disabled={salvando}>
        {salvando ? "Aceitando..." : "Aceitar convite"}
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
