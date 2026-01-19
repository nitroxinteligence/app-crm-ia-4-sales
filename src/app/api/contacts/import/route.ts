import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { planosConfig, resolverPlanoEfetivo } from "@/lib/planos";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MAX_CONTACTS = 10000;
const BATCH_SIZE = 500;

const contactSchema = z.object({
    nome: z.string().min(1).max(255),
    telefone: z.string().optional().default(""),
    email: z.string().email().optional().or(z.literal("")),
    empresa: z.string().optional().default(""),
});

const importRequestSchema = z.object({
    contacts: z.array(contactSchema).min(1).max(MAX_CONTACTS),
    fileName: z.string().optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

async function getWorkspaceFromToken(token: string) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return { error: "Unauthorized", user: null, workspaceId: null };
    }

    const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (memberError || !member?.workspace_id) {
        return { error: "No workspace found", user, workspaceId: null };
    }

    return { error: null, user, workspaceId: member.workspace_id };
}

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const { error: authError, user, workspaceId } = await getWorkspaceFromToken(token);

        if (authError || !user || !workspaceId) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = importRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { contacts, fileName } = parsed.data;

        if (contacts.length > MAX_CONTACTS) {
            return NextResponse.json(
                { error: `Maximum ${MAX_CONTACTS} contacts allowed per import` },
                { status: 400 }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: workspace } = await supabase
            .from("workspaces")
            .select("plano, trial_plano, trial_ends_at, plano_selected_at")
            .eq("id", workspaceId)
            .maybeSingle();

        const trialEndsAt = workspace?.trial_ends_at ? Date.parse(workspace.trial_ends_at) : null;
        const trialExpirado =
            trialEndsAt !== null && !Number.isNaN(trialEndsAt) && trialEndsAt < Date.now();

        if (trialExpirado && !workspace?.plano_selected_at) {
            return NextResponse.json(
                { error: "Trial encerrado. Selecione um plano para continuar." },
                { status: 409 }
            );
        }

        const planoEfetivo = resolverPlanoEfetivo(workspace);
        const limiteContatos = planosConfig[planoEfetivo].contatos ?? 0;

        if (limiteContatos > 0) {
            const { count } = await supabase
                .from("contacts")
                .select("id", { count: "exact", head: true })
                .eq("workspace_id", workspaceId);

            if ((count ?? 0) + contacts.length > limiteContatos) {
                return NextResponse.json(
                    { error: "Limite de contatos atingido." },
                    { status: 409 }
                );
            }
        }

        // Create import job for tracking
        const { data: job, error: jobError } = await supabase
            .from("import_jobs")
            .insert({
                workspace_id: workspaceId,
                user_id: user.id,
                status: "processing",
                total_rows: contacts.length,
                file_name: fileName || null,
            })
            .select("id")
            .single();

        if (jobError) {
            console.error("Failed to create import job:", jobError);
            // Continue without job tracking if it fails
        }

        const jobId = job?.id;

        // Get default pipeline and stage
        const { data: pipelines } = await supabase
            .from("pipelines")
            .select("id, pipeline_stages(id, ordem)")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true })
            .limit(1);

        const defaultPipeline = pipelines?.[0];
        const stages = (defaultPipeline?.pipeline_stages as { id: string; ordem: number }[]) || [];
        const defaultStage = stages.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];

        let successCount = 0;
        let errorCount = 0;
        const errors: { row: number; error: string }[] = [];

        // Process in batches
        for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
            const batch = contacts.slice(i, i + BATCH_SIZE);

            const contactsToInsert = batch.map((contact) => ({
                workspace_id: workspaceId,
                nome: contact.nome.trim(),
                telefone: normalizePhone(contact.telefone || "") || null,
                email: contact.email?.trim() || null,
                empresa: contact.empresa?.trim() || null,
                status: "novo",
                owner_id: user.id,
                pipeline_id: defaultPipeline?.id || null,
                pipeline_stage_id: defaultStage?.id || null,
                tipo: "contato",
            }));

            const { data: inserted, error: insertError } = await supabase
                .from("contacts")
                .insert(contactsToInsert)
                .select("id");

            if (insertError) {
                console.error("Batch insert error:", insertError);
                errorCount += batch.length;
                errors.push({
                    row: i,
                    error: insertError.message,
                });
            } else {
                successCount += inserted?.length || 0;
                errorCount += batch.length - (inserted?.length || 0);
            }

            // Update job progress
            if (jobId) {
                await supabase
                    .from("import_jobs")
                    .update({
                        processed_rows: Math.min(i + BATCH_SIZE, contacts.length),
                        success_count: successCount,
                        error_count: errorCount,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", jobId);
            }
        }

        // Mark job as completed
        if (jobId) {
            await supabase
                .from("import_jobs")
                .update({
                    status: errorCount === contacts.length ? "failed" : "completed",
                    processed_rows: contacts.length,
                    success_count: successCount,
                    error_count: errorCount,
                    error_details: errors.length > 0 ? errors : null,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", jobId);
        }

        return NextResponse.json({
            success: true,
            jobId,
            total: contacts.length,
            imported: successCount,
            errors: errorCount,
            errorDetails: errors.slice(0, 10), // Return first 10 errors only
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const { error: authError, workspaceId } = await getWorkspaceFromToken(token);

        if (authError || !workspaceId) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json({ error: "jobId required" }, { status: 400 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: job, error: jobError } = await supabase
            .from("import_jobs")
            .select("*")
            .eq("id", jobId)
            .eq("workspace_id", workspaceId)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({
            jobId: job.id,
            status: job.status,
            totalRows: job.total_rows,
            processedRows: job.processed_rows,
            successCount: job.success_count,
            errorCount: job.error_count,
            completedAt: job.completed_at,
            progress: job.total_rows > 0
                ? Math.round((job.processed_rows / job.total_rows) * 100)
                : 0,
        });
    } catch (error) {
        console.error("Get job status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
