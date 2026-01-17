import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { badRequest, forbidden, notFound } from "@/lib/api/responses";

export const runtime = "nodejs";

const tokenSchema = z.string().trim().min(1);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenParam = searchParams.get("token");
  const tokenResult = tokenSchema.safeParse(tokenParam);

  if (!tokenResult.success) {
    return badRequest("Missing token.");
  }
  const token = tokenResult.data;

  const { data, error } = await supabaseServer
    .from("workspace_invites")
    .select("id, email, role, status, expires_at, workspace_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return notFound("Invite not found.");
  }

  if (data.status !== "pendente") {
    return badRequest("Invite already used.");
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return badRequest("Invite expired.");
  }

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("nome, trial_ends_at")
    .eq("id", data.workspace_id)
    .maybeSingle();
  if (workspace?.trial_ends_at) {
    const trialEndsAt = new Date(workspace.trial_ends_at).getTime();
    if (trialEndsAt < Date.now()) {
      return forbidden("Workspace trial expired.");
    }
  }

  return Response.json({
    invite: {
      email: data.email,
      role: data.role,
      workspaceName: workspace?.nome ?? null,
    },
  });
}
