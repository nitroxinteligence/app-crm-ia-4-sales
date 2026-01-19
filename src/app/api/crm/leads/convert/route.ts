import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { planosConfig, resolverPlanoEfetivo } from "@/lib/planos";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
  leadId: z.string().trim().min(1),
  empresa: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return serverError("Missing Supabase env vars.");
    }

    const userClient = getUserClient(request);
    if (!userClient) {
      return unauthorized("Missing auth header.");
    }

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return unauthorized("Invalid auth.");
    }

    const parsed = await parseJsonBody(request, payloadSchema);
    if (!parsed.ok) {
      return badRequest("Invalid payload.");
    }
    const leadId = parsed.data.leadId;
    const empresa = parsed.data.empresa ?? parsed.data.companyName;

    const { data: lead, error: leadError } = await supabaseServer
      .from("leads")
      .select("id, workspace_id, nome, telefone, email, contato_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return notFound("Lead not found.");
    }

    const { data: membership } = await userClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", lead.workspace_id)
      .maybeSingle();

    if (!membership) {
      return forbidden("Forbidden.");
    }

    if (lead.contato_id) {
      return Response.json({
        contactId: lead.contato_id,
        alreadyConverted: true,
      });
    }

    const empresaTrim = empresa?.trim() || null;

    let contactId: string | null = null;
    const orFilters: string[] = [];

    if (lead.email) {
      orFilters.push(`email.eq.${lead.email}`);
    }
    if (lead.telefone) {
      orFilters.push(`telefone.eq.${lead.telefone}`);
    }

    if (orFilters.length > 0) {
      const { data: existingContact } = await supabaseServer
        .from("contacts")
        .select("id")
        .eq("workspace_id", lead.workspace_id)
        .or(orFilters.join(","))
        .limit(1)
        .maybeSingle();

      contactId = existingContact?.id ?? null;
    }

    if (!contactId) {
      const { data: workspace } = await supabaseServer
        .from("workspaces")
        .select("plano, trial_plano, trial_ends_at, plano_selected_at")
        .eq("id", lead.workspace_id)
        .maybeSingle();

      const trialEndsAt = workspace?.trial_ends_at
        ? Date.parse(workspace.trial_ends_at)
        : null;
      const trialExpirado =
        trialEndsAt !== null && !Number.isNaN(trialEndsAt) && trialEndsAt < Date.now();

      if (trialExpirado && !workspace?.plano_selected_at) {
        return conflict("Trial encerrado. Selecione um plano para continuar.");
      }

      const planoEfetivo = resolverPlanoEfetivo(workspace);
      const limiteContatos = planosConfig[planoEfetivo].contatos ?? 0;

      if (limiteContatos > 0) {
        const { count } = await supabaseServer
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", lead.workspace_id);

        if ((count ?? 0) >= limiteContatos) {
          return conflict("Limite de contatos atingido.");
        }
      }

      const { data: createdContact, error: contactError } = await supabaseServer
        .from("contacts")
        .insert({
          workspace_id: lead.workspace_id,
          nome: lead.nome ?? "Contato",
          telefone: lead.telefone ?? null,
          email: lead.email ?? null,
          status: "novo",
          owner_id: user.id,
          empresa: empresaTrim,
        })
        .select("id")
        .single();

      if (contactError || !createdContact) {
        return serverError("Failed to create contact");
      }

      contactId = createdContact.id;
    }

    await supabaseServer
      .from("leads")
      .update({ contato_id: contactId })
      .eq("id", lead.id)
      .eq("workspace_id", lead.workspace_id);

    await supabaseServer
      .from("conversations")
      .update({ contact_id: contactId })
      .eq("lead_id", lead.id)
      .eq("workspace_id", lead.workspace_id);

    return Response.json({ contactId, alreadyConverted: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Lead convert failed:", message);
    return serverError(message);
  }
}
