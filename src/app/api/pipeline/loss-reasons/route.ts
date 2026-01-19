import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const createSchema = z.object({
  titulo: z.string().trim().min(1),
  obrigatorio: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().trim().min(1),
  titulo: z.string().trim().min(1),
  obrigatorio: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getMembership(userClient: any, userId: string) {
  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .maybeSingle();
  return membership;
}

export async function GET(request: Request) {
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

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const { data, error } = await userClient
    .from("loss_reasons")
    .select("id, titulo, obrigatorio, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  if (error) {
    return serverError(error.message);
  }

  const lossReasons =
    data?.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      obrigatorio: item.obrigatorio,
      criadoEm: item.created_at,
    })) ?? [];

  return Response.json({ lossReasons });
}

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

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { titulo } = parsed.data;
  const obrigatorio = parsed.data.obrigatorio ?? false;

  const { data, error } = await userClient
    .from("loss_reasons")
    .insert({
      workspace_id: membership.workspace_id,
      titulo,
      obrigatorio,
    })
    .select("id, titulo, obrigatorio, created_at")
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "Failed to create loss reason.");
  }

  return Response.json({
    lossReason: {
      id: data.id,
      titulo: data.titulo,
      obrigatorio: data.obrigatorio,
      criadoEm: data.created_at,
    },
  });
}

export async function PUT(request: Request) {
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

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { id, titulo } = parsed.data;
  const obrigatorio = parsed.data.obrigatorio ?? false;

  const { data, error } = await userClient
    .from("loss_reasons")
    .update({ titulo, obrigatorio })
    .eq("workspace_id", membership.workspace_id)
    .eq("id", id)
    .select("id, titulo, obrigatorio, created_at")
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "Failed to update loss reason.");
  }

  return Response.json({
    lossReason: {
      id: data.id,
      titulo: data.titulo,
      obrigatorio: data.obrigatorio,
      criadoEm: data.created_at,
    },
  });
}

export async function DELETE(request: Request) {
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

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, deleteSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { id } = parsed.data;

  const { error } = await userClient
    .from("loss_reasons")
    .delete()
    .eq("workspace_id", membership.workspace_id)
    .eq("id", id);

  if (error) {
    return serverError(error.message);
  }

  return new Response(null, { status: 204 });
}
