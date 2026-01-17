import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const payloadSchema = z.object({
  conversationId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  value: z.string().trim().min(1).optional(),
  currency: z.string().trim().min(1).optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const parseValor = (value?: string) => {
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: Request) {
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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { conversationId, title } = parsed.data;

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return notFound("Conversation not found.");
  }

  let contactId = conversation.contact_id ?? null;

  if (!contactId && conversation.lead_id) {
    const { data: lead } = await supabaseServer
      .from("leads")
      .select("id, workspace_id, nome, telefone, email, contato_id, empresa")
      .eq("id", conversation.lead_id)
      .maybeSingle();

    if (!lead) {
      return notFound("Lead not found.");
    }

    const { data: membershipCheck } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", lead.workspace_id)
      .maybeSingle();

    if (!membershipCheck) {
      return forbidden("Forbidden.");
    }

    contactId = lead.contato_id ?? null;

    if (!contactId) {
      const filters: string[] = [];
      if (lead.email) {
        filters.push(`email.eq.${lead.email}`);
      }
      if (lead.telefone) {
        filters.push(`telefone.eq.${lead.telefone}`);
      }

      if (filters.length) {
        const { data: existingContact } = await supabaseServer
          .from("contacts")
          .select("id")
          .eq("workspace_id", lead.workspace_id)
          .or(filters.join(","))
          .maybeSingle();
        contactId = existingContact?.id ?? null;
      }

      if (!contactId) {
        const { data: createdContact, error: contactError } =
          await supabaseServer
            .from("contacts")
            .insert({
              workspace_id: lead.workspace_id,
              nome: lead.nome ?? "Contato",
              telefone: lead.telefone ?? null,
              email: lead.email ?? null,
              status: "novo",
              owner_id: user.id,
              empresa: lead.empresa ?? null,
            })
            .select("id")
            .single();

        if (contactError || !createdContact) {
          return serverError("Failed to create contact.");
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
        .eq("id", conversation.id)
        .eq("workspace_id", lead.workspace_id);
    }
  }

  const { data: contact } = contactId
    ? await userClient
        .from("contacts")
        .select("pipeline_id, pipeline_stage_id, empresa")
        .eq("id", contactId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle()
    : { data: null };

  const valor = parseValor(parsed.data.value);
  const moeda = parsed.data.currency ?? "BRL";

  const { data: deal, error: dealError } = await userClient
    .from("deals")
    .insert({
      workspace_id: membership.workspace_id,
      contact_id: contactId,
      empresa: contact?.empresa ?? null,
      pipeline_id: contact?.pipeline_id ?? null,
      stage_id: contact?.pipeline_stage_id ?? null,
      owner_id: user.id,
      titulo: title,
      valor,
      moeda,
      origem: "inbox",
    })
    .select("id")
    .single();

  if (dealError || !deal) {
    return serverError(dealError?.message ?? "Failed to create deal.");
  }

  return Response.json({ id: deal.id });
}
