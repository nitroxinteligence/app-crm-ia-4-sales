-- Inbox + WhatsApp core schema

do $$
begin
  if not exists (select 1 from pg_type where typname = 'canal_id') then
    create type public.canal_id as enum ('whatsapp','instagram','messenger','email','linkedin');
  end if;
  if not exists (select 1 from pg_type where typname = 'conversation_status') then
    create type public.conversation_status as enum ('aberta','pendente','resolvida','spam');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum ('texto','imagem','pdf','audio');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_author') then
    create type public.message_author as enum ('contato','equipe','agente');
  end if;
end $$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text,
  telefone text,
  email text,
  whatsapp_wa_id text,
  canal_origem public.canal_id not null default 'whatsapp',
  status text not null default 'novo',
  owner_id uuid references auth.users on delete set null,
  contato_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, whatsapp_wa_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  lead_id uuid references public.leads on delete set null,
  contact_id uuid,
  canal public.canal_id not null,
  status public.conversation_status not null default 'aberta',
  owner_id uuid references auth.users on delete set null,
  modo_atendimento_humano boolean not null default false,
  ultima_mensagem text,
  ultima_mensagem_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, lead_id, canal)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  autor public.message_author not null default 'contato',
  tipo public.message_type not null default 'texto',
  conteudo text,
  interno boolean not null default false,
  whatsapp_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, whatsapp_message_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  message_id uuid not null references public.messages on delete cascade,
  storage_path text not null,
  tipo text not null,
  tamanho_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  titulo text not null,
  atalho text not null,
  conteudo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, atalho)
);

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  categoria text not null,
  idioma text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  canal public.canal_id not null,
  status text not null default 'desconectado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, canal)
);

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations on delete cascade,
  nome text not null,
  identificador text,
  responsavel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations on delete cascade,
  access_token text not null,
  refresh_token text,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.integrations on delete set null,
  payload jsonb not null,
  status text not null default 'pendente',
  processado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_workspace_idx on public.leads (workspace_id);
create index leads_status_idx on public.leads (status);

create index conversations_workspace_idx on public.conversations (workspace_id);
create index conversations_status_idx on public.conversations (status);
create index conversations_canal_idx on public.conversations (canal);

create index messages_workspace_idx on public.messages (workspace_id);
create index messages_conversation_idx on public.messages (conversation_id);

create index attachments_workspace_idx on public.attachments (workspace_id);

create index integrations_workspace_idx on public.integrations (workspace_id);

create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger set_attachments_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

create trigger set_quick_replies_updated_at
before update on public.quick_replies
for each row execute function public.set_updated_at();

create trigger set_whatsapp_templates_updated_at
before update on public.whatsapp_templates
for each row execute function public.set_updated_at();

create trigger set_integrations_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

create trigger set_integration_accounts_updated_at
before update on public.integration_accounts
for each row execute function public.set_updated_at();

create trigger set_integration_tokens_updated_at
before update on public.integration_tokens
for each row execute function public.set_updated_at();

create trigger set_webhook_events_updated_at
before update on public.webhook_events
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.quick_replies enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_accounts enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.webhook_events enable row level security;

create policy "Leads are viewable by members"
on public.leads
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Leads are manageable by members"
on public.leads
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Conversations are viewable by members"
on public.conversations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Conversations are manageable by members"
on public.conversations
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Messages are viewable by members"
on public.messages
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Messages are manageable by members"
on public.messages
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Attachments are viewable by members"
on public.attachments
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Attachments are manageable by members"
on public.attachments
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Quick replies are viewable by members"
on public.quick_replies
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Quick replies are manageable by members"
on public.quick_replies
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "WhatsApp templates are viewable by members"
on public.whatsapp_templates
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "WhatsApp templates are manageable by members"
on public.whatsapp_templates
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Integrations are viewable by members"
on public.integrations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Integrations are manageable by admins"
on public.integrations
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Integration accounts are viewable by members"
on public.integration_accounts
for select
to authenticated
using (
  public.is_workspace_member(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

create policy "Integration accounts are manageable by admins"
on public.integration_accounts
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

create policy "Integration tokens are viewable by admins"
on public.integration_tokens
for select
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

create policy "Integration tokens are manageable by admins"
on public.integration_tokens
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

create policy "Webhook events are viewable by admins"
on public.webhook_events
for select
to authenticated
using (
  integration_id is null
  or public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

create policy "Webhook events are manageable by admins"
on public.webhook_events
for all
to authenticated
using (
  integration_id is null
  or public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  integration_id is null
  or public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
);
