/**
 * Cloudflare Queue Consumer for Contact Imports
 * 
 * This worker processes batched contact import messages from the queue.
 * Deploy separately: wrangler deploy -c workers/queue-consumer/wrangler.toml
 */

import { createClient } from "@supabase/supabase-js";

interface ContactImportMessage {
    jobId: string;
    workspaceId: string;
    userId: string;
    batchIndex: number;
    contacts: Array<{
        nome: string;
        telefone: string;
        email: string;
        empresa: string;
    }>;
}

interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
    async queue(
        batch: MessageBatch<ContactImportMessage>,
        env: Env
    ): Promise<void> {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        for (const message of batch.messages) {
            const { jobId, workspaceId, userId, batchIndex, contacts } = message.body;

            try {
                // Get default pipeline
                const { data: pipelines } = await supabase
                    .from("pipelines")
                    .select("id, pipeline_stages(id, ordem)")
                    .eq("workspace_id", workspaceId)
                    .order("created_at", { ascending: true })
                    .limit(1);

                const defaultPipeline = pipelines?.[0];
                const stages = (defaultPipeline?.pipeline_stages as { id: string; ordem: number }[]) || [];
                const defaultStage = stages.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];

                // Prepare contacts for insertion
                const contactsToInsert = contacts.map((contact) => ({
                    workspace_id: workspaceId,
                    nome: contact.nome.trim(),
                    telefone: contact.telefone.replace(/\D/g, "") || null,
                    email: contact.email?.trim() || null,
                    empresa: contact.empresa?.trim() || null,
                    status: "novo",
                    owner_id: userId,
                    pipeline_id: defaultPipeline?.id || null,
                    pipeline_stage_id: defaultStage?.id || null,
                    tipo: "contato",
                }));

                // Bulk insert
                const { data: inserted, error: insertError } = await supabase
                    .from("contacts")
                    .insert(contactsToInsert)
                    .select("id");

                const successCount = inserted?.length || 0;
                const errorCount = contacts.length - successCount;

                // Update job progress
                const { data: currentJob } = await supabase
                    .from("import_jobs")
                    .select("processed_rows, success_count, error_count, total_rows")
                    .eq("id", jobId)
                    .single();

                if (currentJob) {
                    const newProcessedRows = (currentJob.processed_rows || 0) + contacts.length;
                    const newSuccessCount = (currentJob.success_count || 0) + successCount;
                    const newErrorCount = (currentJob.error_count || 0) + errorCount;
                    const isComplete = newProcessedRows >= currentJob.total_rows;

                    await supabase
                        .from("import_jobs")
                        .update({
                            processed_rows: newProcessedRows,
                            success_count: newSuccessCount,
                            error_count: newErrorCount,
                            status: isComplete ? "completed" : "processing",
                            completed_at: isComplete ? new Date().toISOString() : null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", jobId);
                }

                // Acknowledge message
                message.ack();
            } catch (error) {
                console.error(`Failed to process batch ${batchIndex} for job ${jobId}:`, error);

                // Update job with error
                await supabase
                    .from("import_jobs")
                    .update({
                        error_count: supabase.rpc("increment_error_count", { job_id: jobId }),
                        error_details: { batchIndex, error: String(error) },
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", jobId);

                // Retry the message
                message.retry();
            }
        }
    },
};
