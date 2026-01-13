-- Agent conversation memory chunks (embeddings)

create table if not exists public.agent_conversation_chunks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  message_id uuid references public.messages on delete set null,
  content text not null,
  tokens integer,
  embedding_openai vector(1536),
  embedding_gemini vector(768),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_conversation_chunks_agent_idx
  on public.agent_conversation_chunks (agent_id);
create index if not exists agent_conversation_chunks_conversation_idx
  on public.agent_conversation_chunks (conversation_id);

create or replace function public.match_agent_conversation_openai(
  p_agent_id uuid,
  p_conversation_id uuid,
  p_embedding vector(1536),
  p_match_count integer
)
returns table (
  id uuid,
  message_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    agent_conversation_chunks.id,
    agent_conversation_chunks.message_id,
    agent_conversation_chunks.content,
    1 - (agent_conversation_chunks.embedding_openai <=> p_embedding) as similarity
  from public.agent_conversation_chunks
  where agent_conversation_chunks.agent_id = p_agent_id
    and agent_conversation_chunks.conversation_id = p_conversation_id
  order by agent_conversation_chunks.embedding_openai <=> p_embedding
  limit p_match_count;
$$;

create or replace function public.match_agent_conversation_gemini(
  p_agent_id uuid,
  p_conversation_id uuid,
  p_embedding vector(768),
  p_match_count integer
)
returns table (
  id uuid,
  message_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    agent_conversation_chunks.id,
    agent_conversation_chunks.message_id,
    agent_conversation_chunks.content,
    1 - (agent_conversation_chunks.embedding_gemini <=> p_embedding) as similarity
  from public.agent_conversation_chunks
  where agent_conversation_chunks.agent_id = p_agent_id
    and agent_conversation_chunks.conversation_id = p_conversation_id
  order by agent_conversation_chunks.embedding_gemini <=> p_embedding
  limit p_match_count;
$$;

alter table public.agent_conversation_chunks enable row level security;

create policy "Agent conversation chunks are viewable by admins"
on public.agent_conversation_chunks
for select
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
);

create policy "Agent conversation chunks are manageable by admins"
on public.agent_conversation_chunks
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
);
