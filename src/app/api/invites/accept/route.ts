import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Payload = {
  token?: string;
  nome?: string;
  senha?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!token || !nome || !senha) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data: invite, error: inviteError } = await supabaseServer
    .from("workspace_invites")
    .select("id, email, status, expires_at, workspaces (trial_ends_at)")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return new Response("Invite not found.", { status: 404 });
  }

  if (invite.status !== "pendente") {
    return new Response("Invite already used.", { status: 400 });
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response("Invite expired.", { status: 400 });
  }

  const workspace = Array.isArray(invite.workspaces)
    ? invite.workspaces[0]
    : invite.workspaces;
  if (workspace?.trial_ends_at) {
    const trialEndsAt = new Date(workspace.trial_ends_at).getTime();
    if (trialEndsAt < Date.now()) {
      return new Response("Workspace trial expired.", { status: 403 });
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
    return new Response(error?.message ?? "Failed to create user.", {
      status: 400,
    });
  }

  return Response.json({ ok: true });
}
