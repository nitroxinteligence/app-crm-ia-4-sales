import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { badRequest, forbidden, notFound } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { planosConfig, resolverPlanoEfetivo } from "@/lib/planos";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  senha: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { token, nome, senha } = parsed.data;

  const { data: invite, error: inviteError } = await supabaseServer
    .from("workspace_invites")
    .select(
      "id, email, status, expires_at, workspaces (id, trial_ends_at, plano_selected_at, plano, trial_plano)"
    )
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return notFound("Invite not found.");
  }

  if (invite.status !== "pendente") {
    return badRequest("Invite already used.");
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return badRequest("Invite expired.");
  }

  const workspace = Array.isArray(invite.workspaces)
    ? invite.workspaces[0]
    : invite.workspaces;
  if (workspace?.trial_ends_at && !workspace?.plano_selected_at) {
    const trialEndsAt = new Date(workspace.trial_ends_at).getTime();
    if (trialEndsAt < Date.now()) {
      return forbidden("Workspace trial expired.");
    }
  }

  if (workspace?.id) {
    const planoEfetivo = resolverPlanoEfetivo(workspace);
    const limiteUsuarios = planosConfig[planoEfetivo].usuarios ?? 0;
    if (limiteUsuarios > 0 && limiteUsuarios < 999999) {
      const { count: membros } = await supabaseServer
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);
      if ((membros ?? 0) >= limiteUsuarios) {
        return forbidden("Limite de membros atingido para o seu plano.");
      }
    }
  }

  const { data, error } = await supabaseServer.auth.admin.createUser({
    email: invite.email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      full_name: nome,
      invite_token: token,
    },
  });

  if (error || !data.user) {
    return badRequest(error?.message ?? "Failed to create user.");
  }

  return Response.json({ ok: true });
}
