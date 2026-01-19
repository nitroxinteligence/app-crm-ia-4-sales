"use client";

import * as React from "react";
import { Copy, MailPlus, Trash2, UserPlus } from "lucide-react";
import type { Role } from "@/lib/types";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { supabaseClient } from "@/lib/supabase/client";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type MembroEquipe = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  criadoEm?: string | null;
  atual?: boolean;
};

type ConviteEquipe = {
  id: string;
  email: string;
  role: Role;
  status: string;
  token: string;
  expires_at?: string | null;
  created_at?: string | null;
};

const rolesLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

export function VisaoEquipeConfiguracoes() {
  const { usuario, idioma } = useAutenticacao();
  const [membros, setMembros] = React.useState<MembroEquipe[]>([]);
  const [convites, setConvites] = React.useState<ConviteEquipe[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [dialogInviteAberto, setDialogInviteAberto] = React.useState(false);
  const [dialogExcluirAberto, setDialogExcluirAberto] = React.useState(false);
  const [memberExcluir, setMemberExcluir] = React.useState<MembroEquipe | null>(null);
  const [emailConvite, setEmailConvite] = React.useState("");
  const [roleConvite, setRoleConvite] = React.useState<Role>("MEMBER");
  const [salvando, setSalvando] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<string | null>(null);

  const isAdmin = usuario.role === "ADMIN";
  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const carregarEquipe = React.useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setCarregando(false);
      return;
    }

    const response = await fetch("/api/settings/team", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao carregar equipe.", "Failed to load team."));
      setCarregando(false);
      return;
    }

    const payload = (await response.json()) as { members: MembroEquipe[] };
    setMembros(payload.members ?? []);

    if (isAdmin) {
      const invitesResponse = await fetch("/api/settings/invites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (invitesResponse.ok) {
        const invitesPayload = (await invitesResponse.json()) as {
          invites: ConviteEquipe[];
        };
        setConvites(invitesPayload.invites ?? []);
      }
    }

    setCarregando(false);
  }, [isAdmin, obterToken, t]);

  React.useEffect(() => {
    void carregarEquipe();
  }, [carregarEquipe]);

  const handleAtualizarRole = async (memberId: string, role: Role) => {
    if (!isAdmin) return;
    setMensagem(null);
    const token = await obterToken();
    if (!token) return;
    const response = await fetch("/api/settings/team", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId, role }),
    });
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao atualizar permissão.", "Failed to update role."));
      return;
    }
    setMembros((atual) =>
      atual.map((membro) =>
        membro.id === memberId ? { ...membro, role } : membro
      )
    );
  };

  const handleExcluir = async () => {
    if (!memberExcluir) return;
    const token = await obterToken();
    if (!token) return;
    const response = await fetch(
      `/api/settings/team?memberId=${memberExcluir.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao remover membro.", "Failed to remove member."));
      return;
    }
    setMembros((atual) => atual.filter((membro) => membro.id !== memberExcluir.id));
    setMemberExcluir(null);
    setDialogExcluirAberto(false);
  };

  const handleCriarConvite = async () => {
    if (!emailConvite.trim()) return;
    setSalvando(true);
    setMensagem(null);
    const token = await obterToken();
    if (!token) {
      setSalvando(false);
      return;
    }
    const response = await fetch("/api/settings/invites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: emailConvite.trim(), role: roleConvite }),
    });
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao criar convite.", "Failed to create invite."));
      setSalvando(false);
      return;
    }
    const payload = (await response.json()) as { invite: ConviteEquipe };
    setConvites((atual) => [payload.invite, ...atual]);
    setEmailConvite("");
    setRoleConvite("MEMBER");
    setDialogInviteAberto(false);
    setMensagem(
      t("Convite criado. Compartilhe o link com o usuário.", "Invite created. Share the link with the user.")
    );
    setSalvando(false);
  };

  const handleCopiarLink = async (token: string) => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/convite?token=${token}`;
    await navigator.clipboard.writeText(link);
    setMensagem(
      t(
        "Link copiado para a área de transferência.",
        "Link copied to clipboard."
      )
    );
  };

  const handleReenviarConvite = async (inviteId: string) => {
    const token = await obterToken();
    if (!token) return;
    const response = await fetch("/api/invites/resend", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteId }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao reenviar convite.", "Failed to resend invite."));
      return;
    }

    const payload = (await response.json()) as { invite: ConviteEquipe };
    setConvites((atual) =>
      atual.map((invite) =>
        invite.id === payload.invite.id ? payload.invite : invite
      )
    );
    await handleCopiarLink(payload.invite.token);
    setMensagem(
      t(
        "Convite reenviado. Link copiado.",
        "Invite resent. Link copied."
      )
    );
  };

  const handleExcluirConvite = async (inviteId: string) => {
    const token = await obterToken();
    if (!token) return;
    const response = await fetch(
      `/api/settings/invites?inviteId=${inviteId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao remover convite.", "Failed to delete invite."));
      return;
    }
    setConvites((atual) => atual.filter((invite) => invite.id !== inviteId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("Equipe & permissões", "Team & roles")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Gerencie membros, papéis e convites do workspace.",
              "Manage members, roles, and workspace invites."
            )}
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setDialogInviteAberto(true)}
          disabled={!isAdmin}
        >
          <UserPlus className="h-4 w-4" />
          {t("Convidar usuário", "Invite user")}
        </Button>
      </div>

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="rounded-[6px] border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {mensagem}
        </div>
      )}

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t("Membros ativos", "Active members")}
          </CardTitle>
          <Badge variant="secondary">
            {membros.length} {t("usuários", "users")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregando ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : membros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Nenhum membro encontrado.", "No members found.")}
            </p>
          ) : (
            membros.map((membro) => (
              <div
                key={membro.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-white dark:bg-neutral-950 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {membro.nome}
                    {membro.atual && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {t("Você", "You")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{membro.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={membro.role}
                    onValueChange={(value) =>
                      handleAtualizarRole(membro.id, value as Role)
                    }
                    disabled={!isAdmin || membro.atual}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(rolesLabel).map(([role, label]) => (
                        <SelectItem key={role} value={role}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      setMemberExcluir(membro);
                      setDialogExcluirAberto(true);
                    }}
                    disabled={!isAdmin || membro.atual}
                    aria-label={t("Remover membro", "Remove member")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t("Convites pendentes", "Pending invites")}
          </CardTitle>
          <Badge variant="outline">
            {convites.length} {t("pendentes", "pending")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isAdmin ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "Apenas administradores podem gerenciar convites.",
                "Only admins can manage invites."
              )}
            </p>
          ) : convites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "Nenhum convite pendente no momento.",
                "No pending invites at the moment."
              )}
            </p>
          ) : (
            convites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-white dark:bg-neutral-950 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{rolesLabel[invite.role]}</span>
                    <span>•</span>
                    <span>
                      {t("Status:", "Status:")} {invite.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleCopiarLink(invite.token)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {t("Copiar link", "Copy link")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleReenviarConvite(invite.id)}
                  >
                    <MailPlus className="h-3.5 w-3.5" />
                    {t("Reenviar convite", "Resend invite")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleExcluirConvite(invite.id)}
                    aria-label={t("Cancelar convite", "Cancel invite")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogInviteAberto} onOpenChange={setDialogInviteAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Convidar novo usuário", "Invite new user")}</DialogTitle>
            <DialogDescription>
              {t(
                "Gere um convite para adicionar membros ao workspace.",
                "Generate an invite to add members to the workspace."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                placeholder="email@empresa.com"
                value={emailConvite}
                onChange={(event) => setEmailConvite(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("Permissão", "Role")}
              </label>
              <Select
                value={roleConvite}
                onValueChange={(value) => setRoleConvite(value as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rolesLabel).map(([role, label]) => (
                    <SelectItem key={role} value={role}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                {rolesLabel[roleConvite]}
              </p>
              {roleConvite === "ADMIN" &&
                t(
                  "Acesso total ao workspace: configurações, cobrança, equipe e todos os recursos.",
                  "Full workspace access: settings, billing, team, and all features."
                )}
              {roleConvite === "MEMBER" &&
                t(
                  "Acesso operacional: gerenciar contatos, deals e tarefas. Sem acesso a configurações.",
                  "Operational access: manage contacts, deals, and tasks. No settings access."
                )}
              {roleConvite === "VIEWER" &&
                t(
                  "Acesso de visualização: pode ver tudo mas não pode criar, editar ou excluir nada.",
                  "View-only access: can view everything but cannot create, edit, or delete."
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogInviteAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button
              className="gap-2"
              onClick={handleCriarConvite}
              disabled={salvando}
            >
              <UserPlus className="h-4 w-4" />
              {salvando ? t("Gerando...", "Generating...") : t("Gerar convite", "Create invite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Remover membro", "Remove member")}</DialogTitle>
            <DialogDescription>
              {t(
                "Essa ação remove o acesso do usuário ao workspace.",
                "This action removes the user's access to the workspace."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExcluirAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              {t("Remover", "Remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
