import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const workspaceId = process.argv[2];
const fullMode = process.argv.includes("--full");
if (!workspaceId) {
  console.error("Uso: node scripts/dedupe-whatsapp-conversations.mjs <workspaceId>");
  process.exit(1);
}

const loadEnvFile = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const entries = {};
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) entries[key] = value;
  }
  return entries;
};

const envFile = loadEnvFile();
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  envFile.SUPABASE_URL ||
  envFile.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  envFile.SUPABASE_SERVICE_ROLE_KEY ||
  envFile.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const sortByLatest = (items) =>
  items.sort((a, b) => {
    const timeA = new Date(a.ultima_mensagem_em || a.created_at || 0).getTime();
    const timeB = new Date(b.ultima_mensagem_em || b.created_at || 0).getTime();
    return timeB - timeA;
  });

const updateConversationRefs = async (table, canonicalId, duplicateIds) => {
  for (const batch of chunk(duplicateIds, 100)) {
    const { error } = await supabase
      .from(table)
      .update({ conversation_id: canonicalId })
      .in("conversation_id", batch);
    if (error) {
      console.warn(`Falha ao mover refs em ${table}:`, error.message);
    }
  }
};

const deleteConversationRefs = async (table, duplicateIds) => {
  for (const batch of chunk(duplicateIds, 100)) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in("conversation_id", batch);
    if (error) {
      console.warn(`Falha ao remover refs em ${table}:`, error.message);
    }
  }
};

const moveOrDeleteState = async (table, canonicalId, duplicateIds) => {
  let failed = false;
  for (const batch of chunk(duplicateIds, 100)) {
    const { error } = await supabase
      .from(table)
      .update({ conversation_id: canonicalId })
      .in("conversation_id", batch);
    if (error) {
      failed = true;
      console.warn(`Falha ao mover refs em ${table}:`, error.message);
    }
  }
  if (failed) {
    await deleteConversationRefs(table, duplicateIds);
  }
};

const main = async () => {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, lead_id, ultima_mensagem_em, created_at")
    .eq("workspace_id", workspaceId)
    .eq("canal", "whatsapp")
    .not("lead_id", "is", null);

  if (error) {
    console.error("Falha ao buscar conversas:", error.message);
    process.exit(1);
  }

  const grouped = new Map();
  for (const convo of conversations ?? []) {
    if (!convo.lead_id) continue;
    if (!grouped.has(convo.lead_id)) {
      grouped.set(convo.lead_id, []);
    }
    grouped.get(convo.lead_id).push(convo);
  }

  let totalDuplicadas = 0;
  let gruposComDuplicadas = 0;
  for (const [leadId, items] of grouped.entries()) {
    if (items.length <= 1) continue;
    gruposComDuplicadas += 1;
    totalDuplicadas += items.length - 1;
    const [canonical, ...duplicates] = sortByLatest(items);
    const duplicateIds = duplicates.map((item) => item.id);

    await updateConversationRefs("messages", canonical.id, duplicateIds);
    if (fullMode) {
      await updateConversationRefs("agent_runs", canonical.id, duplicateIds);
      await updateConversationRefs("agent_logs", canonical.id, duplicateIds);
      await updateConversationRefs("agent_credit_events", canonical.id, duplicateIds);
      await moveOrDeleteState(
        "agent_conversation_state",
        canonical.id,
        duplicateIds
      );
      await moveOrDeleteState(
        "agent_conversation_chunks",
        canonical.id,
        duplicateIds
      );
    }

    for (const batch of chunk(duplicateIds, 100)) {
      const { error: deleteError } = await supabase
        .from("conversations")
        .delete()
        .in("id", batch);
      if (deleteError) {
        console.warn("Falha ao remover conversas duplicadas:", deleteError.message);
      }
    }
  }

  console.log(
    `Concluido. Grupos com duplicadas: ${gruposComDuplicadas}. Conversas removidas: ${totalDuplicadas}.`
  );
};

main().catch((error) => {
  console.error("Erro inesperado:", error.message || error);
  process.exit(1);
});
