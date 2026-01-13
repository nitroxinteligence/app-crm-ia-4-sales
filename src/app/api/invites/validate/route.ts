import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return new Response("Missing token.", { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("workspace_invites")
    .select("id, email, role, status, expires_at, workspaces (nome, trial_ends_at)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return new Response("Invite not found.", { status: 404 });
  }

  if (data.status !== "pendente") {
    return new Response("Invite already used.", { status: 400 });
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return new Response("Invite expired.", { status: 400 });
  }

  const workspace = Array.isArray(data.workspaces)
    ? data.workspaces[0]
    : data.workspaces;
  if (workspace?.trial_ends_at) {
    const trialEndsAt = new Date(workspace.trial_ends_at).getTime();
    if (trialEndsAt < Date.now()) {
      return new Response("Workspace trial expired.", { status: 403 });
    }
  }

  return Response.json({
    invite: {
      email: data.email,
      role: data.role,
      workspaceName: Array.isArray(data.workspaces)
        ? data.workspaces[0]?.nome ?? null
        : data.workspaces?.nome ?? null,
    },
  });
}
