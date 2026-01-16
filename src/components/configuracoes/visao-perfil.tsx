"use client";

import * as React from "react";
import { ImagePlus, Lock, Moon, Save, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { supabaseClient } from "@/lib/supabase/client";
import { buildR2PublicUrl } from "@/lib/r2/public";
import { uploadFileToR2 } from "@/lib/r2/browser";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type PerfilState = {
  nome: string;
  email: string;
  avatarUrl?: string | null;
  idioma?: string | null;
};

export function VisaoPerfilConfiguracoes() {
  const { usuario, workspace, idioma, plano, recarregar } = useAutenticacao();
  const { theme, setTheme } = useTheme();
  const [perfil, setPerfil] = React.useState<PerfilState | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);
  const [enviandoAvatar, setEnviandoAvatar] = React.useState(false);
  const [dialogSenhaAberto, setDialogSenhaAberto] = React.useState(false);
  const [novaSenha, setNovaSenha] = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [erroSenha, setErroSenha] = React.useState<string | null>(null);
  const [workspaceBusca, setWorkspaceBusca] = React.useState("");
  const [montado, setMontado] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarAtual = perfil?.avatarUrl ?? usuario.avatarUrl ?? null;

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const iniciais = React.useMemo(() => {
    const nomeBase = perfil?.nome || usuario.nome;
    return nomeBase
      .split(" ")
      .map((parte) => parte[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [perfil?.nome, usuario.nome]);

  const iniciaisWorkspace = React.useCallback((nome: string) => {
    const partes = nome.split(" ").filter(Boolean);
    if (partes.length === 0) return "W";
    return partes
      .map((parte) => parte[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, []);

  const temaAtual = (theme ?? "dark") === "light" ? "light" : "dark";
  const planoLabel = workspace.plano ?? plano.nome;

  const workspaces = React.useMemo(
    () => [
      {
        id: workspace.id,
        nome: workspace.nome,
        plano: planoLabel,
        role: usuario.role,
      },
    ],
    [planoLabel, usuario.role, workspace.id, workspace.nome]
  );

  const workspacesFiltrados = React.useMemo(() => {
    const termo = workspaceBusca.trim().toLowerCase();
    if (!termo) return workspaces;
    return workspaces.filter((item) =>
      item.nome.toLowerCase().includes(termo)
    );
  }, [workspaceBusca, workspaces]);

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const carregarPerfil = React.useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setCarregando(false);
      return;
    }

    const response = await fetch("/api/settings/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao carregar perfil.", "Failed to load profile."));
      setCarregando(false);
      return;
    }

    const payload = (await response.json()) as {
      profile?: {
        nome?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        idioma?: string | null;
      };
    };
    setPerfil({
      nome: payload.profile?.nome ?? usuario.nome,
      email: payload.profile?.email ?? usuario.email,
      avatarUrl: payload.profile?.avatar_url ?? null,
      idioma: payload.profile?.idioma ?? "pt-BR",
    });
    setCarregando(false);
  }, [obterToken, t, usuario.email, usuario.nome]);

  React.useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  React.useEffect(() => {
    setMontado(true);
  }, []);

  const handleSalvar = async () => {
    if (!perfil?.nome.trim()) {
      setErro(t("Informe o nome completo.", "Please provide a full name."));
      return;
    }
    setSalvando(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setSalvando(false);
      return;
    }

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: perfil.nome.trim(),
        avatarUrl: perfil.avatarUrl ?? null,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao salvar perfil.", "Failed to save profile."));
      setSalvando(false);
      return;
    }

    const payload = (await response.json()) as {
      profile?: {
        nome?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        idioma?: string | null;
      };
    };
    setPerfil((atual) => ({
      nome: payload.profile?.nome ?? atual?.nome ?? usuario.nome,
      email: payload.profile?.email ?? atual?.email ?? usuario.email,
      avatarUrl: payload.profile?.avatar_url ?? atual?.avatarUrl ?? null,
      idioma: payload.profile?.idioma ?? atual?.idioma ?? "pt-BR",
    }));
    await recarregar();
    setSalvando(false);
  };

  const handleAtualizarSenha = async () => {
    setErroSenha(null);
    if (!novaSenha || novaSenha.length < 8) {
      setErroSenha(t("A senha deve ter pelo menos 8 caracteres.", "Password must be at least 8 characters."));
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha(t("As senhas não coincidem.", "Passwords do not match."));
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });
    if (error) {
      setErroSenha(error.message);
      return;
    }
    setDialogSenhaAberto(false);
    setNovaSenha("");
    setConfirmarSenha("");
  };

  const handleSelecionarAvatar = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErro(t("Selecione um arquivo de imagem válido.", "Select a valid image file."));
      event.target.value = "";
      return;
    }

    setEnviandoAvatar(true);
    setErro(null);

    const extensao = arquivo.name.split(".").pop() ?? "png";
    const caminho = `${usuario.id}/${Date.now()}.${extensao}`;

    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    try {
      await uploadFileToR2({
        token,
        bucket: "user-avatars",
        key: caminho,
        file: arquivo,
      });
    } catch (error) {
      setErro(
        t("Não foi possível atualizar a foto.", "Unable to update the photo.")
      );
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    const publicUrl = buildR2PublicUrl("user-avatars", caminho);
    if (!publicUrl) {
      setErro(
        t(
          "Não foi possível gerar a URL da foto.",
          "Unable to generate the photo URL."
        )
      );
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: publicUrl }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(
        message ||
          t("Não foi possível salvar a foto.", "Unable to save the photo.")
      );
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    setPerfil((atual) => (atual ? { ...atual, avatarUrl: publicUrl } : atual));
    await recarregar();
    setEnviandoAvatar(false);
    event.target.value = "";
  };

  const handleRemoverAvatar = async () => {
    if (!avatarAtual) return;
    setEnviandoAvatar(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setEnviandoAvatar(false);
      return;
    }

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: null }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Não foi possível remover a foto.", "Unable to remove the photo."));
      setEnviandoAvatar(false);
      return;
    }

    setPerfil((atual) => (atual ? { ...atual, avatarUrl: null } : atual));
    await recarregar();
    setEnviandoAvatar(false);
  };

  return (
    <div className="space-y-8 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <Card className="relative overflow-hidden border border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--primary)_0,_transparent_55%)] opacity-10" />
        <CardContent className="relative flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16 border border-border/60 bg-background/80">
                {avatarAtual && (
                  <AvatarImage
                    src={avatarAtual}
                    alt={perfil?.nome ?? usuario.nome}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-lg font-semibold">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={enviandoAvatar}
                  aria-label={t("Enviar foto", "Upload photo")}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRemoverAvatar}
                  disabled={enviandoAvatar || !avatarAtual}
                  aria-label={t("Remover foto", "Remove photo")}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelecionarAvatar}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">
                  {perfil?.nome ?? usuario.nome}
                </p>
                <Badge variant="secondary">{usuario.role}</Badge>
                <Badge variant="outline">{planoLabel}</Badge>
              </div>
                <p className="text-sm text-muted-foreground">
                  {perfil?.email ?? usuario.email}
                </p>
                <p className="text-xs text-muted-foreground">
                {t("Workspace ativo:", "Active workspace:")}{" "}
                <span className="font-medium text-foreground">
                  {workspace.nome}
                </span>
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="flex items-center gap-2 px-3 py-1 text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("Conta ativa", "Active account")}
          </Badge>
        </CardContent>
      </Card>

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[200px_1fr]">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {t("Informações", "Information")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Suas informações de cadastro e login.",
                    "Your account and login details."
                  )}
                </p>
              </div>
              {carregando || !perfil ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">
                      {t("Nome completo", "Full name")}
                    </label>
                    <Input
                      value={perfil.nome}
                      onChange={(event) =>
                        setPerfil((atual) =>
                          atual ? { ...atual, nome: event.target.value } : atual
                        )
                      }
                      placeholder={t("Nome completo", "Full name")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input value={perfil.email} disabled />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{workspace.nome}</Badge>
                    <Badge variant="secondary">{usuario.role}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {t("Segurança", "Security")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Proteja sua conta com uma senha forte.",
                    "Keep your account protected with a strong password."
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {t("Senha de acesso", "Account password")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Recomendamos atualizar a senha periodicamente.",
                      "We recommend updating your password regularly."
                    )}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setDialogSenhaAberto(true)}>
                  {t("Alterar senha", "Change password")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {t("Preferências", "Preferences")}
                  </p>
                  <Badge variant="outline">Beta</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Personalize a aparência do app selecionando o tema.",
                    "Personalize the app appearance by selecting the theme."
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("Tema", "Theme")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={temaAtual === "light" ? "secondary" : "outline"}
                    className="w-full justify-start gap-2"
                    onClick={() => setTheme("light")}
                    disabled={!montado}
                    aria-pressed={temaAtual === "light"}
                  >
                    <Sun className="h-4 w-4" />
                    {t("Claro", "Light")}
                  </Button>
                  <Button
                    type="button"
                    variant={temaAtual === "dark" ? "secondary" : "outline"}
                    className="w-full justify-start gap-2"
                    onClick={() => setTheme("dark")}
                    disabled={!montado}
                    aria-pressed={temaAtual === "dark"}
                  >
                    <Moon className="h-4 w-4" />
                    {t("Escuro", "Dark")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "A mudança vale para todo o workspace.",
                    "Changes apply across the workspace."
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {t("Workspaces", "Workspaces")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Workspaces que você possui ou participa.",
                    "Workspaces you own or belong to."
                  )}
                </p>
              </div>
              <Input
                value={workspaceBusca}
                onChange={(event) => setWorkspaceBusca(event.target.value)}
                placeholder={t("Pesquisar workspaces", "Search workspaces")}
              />
              {workspacesFiltrados.length === 0 ? (
                <div className="rounded-[6px] border border-border/60 px-3 py-4 text-xs text-muted-foreground">
                  {t(
                    "Nenhum workspace encontrado.",
                    "No workspaces found."
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {workspacesFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/60 bg-background/80">
                          <AvatarFallback className="text-xs font-semibold">
                            {iniciaisWorkspace(item.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("Workspace atual", "Current workspace")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{item.plano}</Badge>
                        <Badge variant="secondary">{item.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button
          className="gap-2"
          onClick={handleSalvar}
          disabled={salvando || carregando || !perfil || enviandoAvatar}
        >
          <Save className="h-4 w-4" />
          {salvando ? t("Salvando...", "Saving...") : t("Salvar alterações", "Save changes")}
        </Button>
      </div>

      <Dialog open={dialogSenhaAberto} onOpenChange={setDialogSenhaAberto}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>{t("Atualizar senha", "Update password")}</DialogTitle>
            <DialogDescription>
              {t(
                "Defina uma nova senha para sua conta.",
                "Set a new password for your account."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("Nova senha", "New password")}
              </label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                placeholder={t("Mínimo de 8 caracteres", "Minimum 8 characters")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("Confirmar senha", "Confirm password")}
              </label>
              <Input
                type="password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
              />
            </div>
            {erroSenha && (
              <p className="text-xs text-destructive">{erroSenha}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogSenhaAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button className="gap-2" onClick={handleAtualizarSenha}>
              <Lock className="h-4 w-4" />
              {t("Atualizar", "Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
