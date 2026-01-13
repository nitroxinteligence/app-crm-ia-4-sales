import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type DealPayload = {
  conversationId?: string;
  title?: string;
  value?: string;
  currency?: string;
};

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
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const body = (await request.json()) as DealPayload;
  const conversationId = body?.conversationId?.trim();
  const title = body?.title?.trim();

  if (!conversationId || !title) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data: conversation } = await userClient
    .from("conversations")
    .select("id, lead_id, contact_id")
    .eq("id", conversationId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!conversation) {
    return new Response("Conversation not found.", { status: 404 });
  }

  let contactId = conversation.contact_id ?? null;

  if (!contactId && conversation.lead_id) {
    const { data: lead } = await supabaseServer
      .from("leads")
      .select("id, workspace_id, nome, telefone, email, contato_id, empresa")
      .eq("id", conversation.lead_id)
      .maybeSingle();

    if (!lead) {
      return new Response("Lead not found.", { status: 404 });
    }

    const { data: membershipCheck } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", lead.workspace_id)
      .maybeSingle();

    if (!membershipCheck) {
      return new Response("Forbidden.", { status: 403 });
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
          return new Response("Failed to create contact.", { status: 500 });
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

  const valor = parseValor(body?.value);
  const moeda = body?.currency?.trim() || "BRL";

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
    return new Response(dealError?.message ?? "Failed to create deal.", {
      status: 500,
    });
  }

  return Response.json({ id: deal.id });
}
