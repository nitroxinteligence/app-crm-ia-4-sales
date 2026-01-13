-- Agents core schema (config, knowledge, logs)

create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'agent_status') then
    create type public.agent_status as enum ('ativo', 'pausado');
  end if;
  if not exists (select 1 from pg_type where typname = 'agent_type') then
    create type public.agent_type as enum (
      'sdr',
      'atendimento',
      'suporte',
      'copiloto',
      'propostas',
      'voice'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'agent_action') then
    create type public.agent_action as enum (
      'enviar_mensagem',
      'criar_lead',
      'editar_lead',
      'criar_contato',
      'editar_contato',
      'criar_deal',
      'mover_etapa',
      'aplicar_tag',
      'alterar_campo_customizado',
      'resolver_conversa',
      'marcar_spam',
      'follow_up',
      'calendar_criar',
      'calendar_editar',
      'calendar_cancelar',
      'calendar_consultar'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'agent_run_status') then
    create type public.agent_run_status as enum (
      'pendente',
      'executando',
      'concluido',
      'falhou'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'agent_knowledge_status') then
    create type public.agent_knowledge_status as enum (
      'pendente',
      'processando',
      'pronto',
      'erro'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'deal_status') then
    create type public.deal_status as enum ('aberto', 'ganho', 'perdido', 'pausado');
  end if;
end $$;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  company_id uuid references public.companies on delete set null,
  pipeline_id uuid references public.pipelines on delete set null,
  stage_id uuid references public.pipeline_stages on delete set null,
  owner_id uuid references auth.users on delete set null,
  titulo text,
  valor numeric,
  moeda text not null default 'BRL',
  status public.deal_status not null default 'aberto',
  origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_field_values_deal (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  deal_id uuid not null references public.deals on delete cascade,
  field_id uuid not null references public.custom_fields_deal on delete cascade,
  valor jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, field_id)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  criado_por uuid references auth.users on delete set null,
  nome text not null,
  tipo public.agent_type not null default 'sdr',
  status public.agent_status not null default 'ativo',
  integration_account_id uuid references public.integration_accounts on delete set null,
  pipeline_id uuid references public.pipelines on delete set null,
  etapa_inicial_id uuid references public.pipeline_stages on delete set null,
  detectar_idioma boolean not null default true,
  idioma_padrao text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  tempo_resposta_segundos integer not null default 30,
  pausar_em_tags uuid[],
  pausar_em_etapas uuid[],
  pausar_ao_responder_humano boolean not null default true,
  campos_bloqueados uuid[],
  configuracao jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table if not exists public.agent_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  acao public.agent_action not null,
  habilitado boolean not null default true,
  configuracao jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, acao)
);

create table if not exists public.agent_followups (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  nome text not null,
  habilitado boolean not null default true,
  ordem integer not null default 1,
  delay_minutos integer not null default 30,
  usar_template boolean not null default true,
  template_id uuid references public.whatsapp_templates on delete set null,
  mensagem_texto text,
  somente_fora_janela boolean not null default false,
  max_tentativas integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_calendar_links (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  integration_id uuid not null references public.calendar_integrations on delete cascade,
  calendar_id text not null,
  created_at timestamptz not null default now(),
  unique (agent_id, calendar_id)
);

create table if not exists public.agent_knowledge_files (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  criado_por uuid references auth.users on delete set null,
  nome text not null,
  mime_type text,
  storage_path text not null,
  tamanho_bytes integer,
  status public.agent_knowledge_status not null default 'pendente',
  origem text not null default 'upload',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  file_id uuid references public.agent_knowledge_files on delete set null,
  content text not null,
  tokens integer,
  embedding_openai vector(1536),
  embedding_gemini vector(768),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_conversation_state (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  idioma_detectado text,
  pausado boolean not null default false,
  pausado_motivo text,
  ultimo_contato_em timestamptz,
  ultimo_agente_em timestamptz,
  ultimo_humano_em timestamptz,
  followup_step integer not null default 0,
  followup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, conversation_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  conversation_id uuid references public.conversations on delete set null,
  status public.agent_run_status not null default 'pendente',
  modelo text,
  fallback_modelo text,
  credits_usados integer not null default 0,
  latencia_ms integer,
  erro text,
  resumo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concluido_em timestamptz
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  conversation_id uuid references public.conversations on delete set null,
  resumo text not null,
  tool_calls jsonb,
  metrics jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  data date not null,
  mensagens_enviadas integer not null default 0,
  conversas_resolvidas integer not null default 0,
  leads_convertidos integer not null default 0,
  csat numeric(5,2),
  tempo_medio_resposta_segundos integer,
  credits_consumidos integer not null default 0,
  created_at timestamptz not null default now(),
  unique (agent_id, data)
);

create table if not exists public.agent_consents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  ip text,
  consentido_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (agent_id, user_id)
);

create table if not exists public.agent_credit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  agent_id uuid references public.agents on delete set null,
  conversation_id uuid references public.conversations on delete set null,
  message_id uuid references public.messages on delete set null,
  credits integer not null,
  direction text not null default 'debit',
  created_at timestamptz not null default now()
);

create index if not exists agents_workspace_idx on public.agents (workspace_id);
create index if not exists agents_integration_idx on public.agents (integration_account_id);
create index if not exists agent_permissions_agent_idx on public.agent_permissions (agent_id);
create index if not exists agent_followups_agent_idx on public.agent_followups (agent_id);
create index if not exists agent_calendar_links_agent_idx on public.agent_calendar_links (agent_id);
create index if not exists agent_knowledge_files_agent_idx on public.agent_knowledge_files (agent_id);
create index if not exists agent_knowledge_chunks_agent_idx on public.agent_knowledge_chunks (agent_id);
create index if not exists agent_conversation_state_agent_idx on public.agent_conversation_state (agent_id);
create index if not exists agent_conversation_state_conversation_idx on public.agent_conversation_state (conversation_id);
create index if not exists agent_runs_agent_idx on public.agent_runs (agent_id);
create index if not exists agent_runs_workspace_idx on public.agent_runs (workspace_id);
create index if not exists agent_logs_agent_idx on public.agent_logs (agent_id);
create index if not exists agent_metrics_workspace_idx on public.agent_metrics_daily (workspace_id);
create index if not exists agent_credit_events_workspace_idx on public.agent_credit_events (workspace_id);
create index if not exists deals_workspace_idx on public.deals (workspace_id);
create index if not exists deals_stage_idx on public.deals (stage_id);
create index if not exists deals_contact_idx on public.deals (contact_id);
create index if not exists deal_custom_values_workspace_idx on public.custom_field_values_deal (workspace_id);

create index if not exists agent_chunks_openai_idx
  on public.agent_knowledge_chunks
  using ivfflat (embedding_openai vector_cosine_ops) with (lists = 100);

create index if not exists agent_chunks_gemini_idx
  on public.agent_knowledge_chunks
  using ivfflat (embedding_gemini vector_cosine_ops) with (lists = 100);

create or replace function public.match_agent_knowledge_openai(
  p_agent_id uuid,
  p_embedding vector(1536),
  p_match_count integer
)
returns table (
  id uuid,
  file_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    agent_knowledge_chunks.id,
    agent_knowledge_chunks.file_id,
    agent_knowledge_chunks.content,
    1 - (agent_knowledge_chunks.embedding_openai <=> p_embedding) as similarity
  from public.agent_knowledge_chunks
  where agent_knowledge_chunks.agent_id = p_agent_id
  order by agent_knowledge_chunks.embedding_openai <=> p_embedding
  limit greatest(p_match_count, 1);
$$;

create or replace function public.match_agent_knowledge_gemini(
  p_agent_id uuid,
  p_embedding vector(768),
  p_match_count integer
)
returns table (
  id uuid,
  file_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    agent_knowledge_chunks.id,
    agent_knowledge_chunks.file_id,
    agent_knowledge_chunks.content,
    1 - (agent_knowledge_chunks.embedding_gemini <=> p_embedding) as similarity
  from public.agent_knowledge_chunks
  where agent_knowledge_chunks.agent_id = p_agent_id
  order by agent_knowledge_chunks.embedding_gemini <=> p_embedding
  limit greatest(p_match_count, 1);
$$;

create trigger set_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

create trigger set_agent_permissions_updated_at
before update on public.agent_permissions
for each row execute function public.set_updated_at();

create trigger set_agent_followups_updated_at
before update on public.agent_followups
for each row execute function public.set_updated_at();

create trigger set_agent_knowledge_files_updated_at
before update on public.agent_knowledge_files
for each row execute function public.set_updated_at();

create trigger set_agent_conversation_state_updated_at
before update on public.agent_conversation_state
for each row execute function public.set_updated_at();

create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

create trigger set_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

create trigger set_custom_field_values_deal_updated_at
before update on public.custom_field_values_deal
for each row execute function public.set_updated_at();

alter table public.deals enable row level security;
alter table public.custom_field_values_deal enable row level security;
alter table public.agents enable row level security;
alter table public.agent_permissions enable row level security;
alter table public.agent_followups enable row level security;
alter table public.agent_calendar_links enable row level security;
alter table public.agent_knowledge_files enable row level security;
alter table public.agent_knowledge_chunks enable row level security;
alter table public.agent_conversation_state enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_metrics_daily enable row level security;
alter table public.agent_consents enable row level security;
alter table public.agent_credit_events enable row level security;

create policy "Agents are viewable by admins"
on public.agents
for select
to authenticated
using (public.is_workspace_admin(workspace_id));

create policy "Agents are manageable by admins"
on public.agents
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Deals are viewable by members"
on public.deals
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Deals are manageable by members"
on public.deals
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Deal custom values are viewable by members"
on public.custom_field_values_deal
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Deal custom values are manageable by members"
on public.custom_field_values_deal
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Agent permissions are manageable by admins"
on public.agent_permissions
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

create policy "Agent followups are manageable by admins"
on public.agent_followups
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

create policy "Agent calendar links are manageable by admins"
on public.agent_calendar_links
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

create policy "Agent knowledge files are manageable by admins"
on public.agent_knowledge_files
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Agent knowledge chunks are manageable by admins"
on public.agent_knowledge_chunks
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

create policy "Agent conversation state is manageable by admins"
on public.agent_conversation_state
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Agent runs are manageable by admins"
on public.agent_runs
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Agent logs are manageable by admins"
on public.agent_logs
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Agent metrics are manageable by admins"
on public.agent_metrics_daily
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Agent consents are manageable by admins"
on public.agent_consents
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

create policy "Agent credit events are manageable by admins"
on public.agent_credit_events
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

insert into storage.buckets (id, name, public)
values ('agent-knowledge', 'agent-knowledge', false)
on conflict (id) do update set public = excluded.public;

create policy "Agent knowledge objects are manageable by admins"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'agent-knowledge'
  and public.is_workspace_admin(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
)
with check (
  bucket_id = 'agent-knowledge'
  and public.is_workspace_admin(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
);
