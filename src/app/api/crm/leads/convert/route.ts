import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
      return new Response("Missing Supabase env vars", { status: 500 });
    }

    const userClient = getUserClient(request);
    if (!userClient) {
      return new Response("Missing auth header", { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response("Invalid auth", { status: 401 });
    }

    const body = await request.json();
    const leadId = body.leadId as string | undefined;
    const empresa = (body.empresa ?? body.companyName) as string | undefined;

    if (!leadId) {
      return new Response("Missing leadId", { status: 400 });
    }

    const { data: lead, error: leadError } = await supabaseServer
      .from("leads")
      .select("id, workspace_id, nome, telefone, email, contato_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response("Lead not found", { status: 404 });
    }

    const { data: membership } = await userClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", lead.workspace_id)
      .maybeSingle();

    if (!membership) {
      return new Response("Forbidden", { status: 403 });
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
        return new Response("Failed to create contact", { status: 500 });
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
    return new Response(message, { status: 500 });
  }
}
