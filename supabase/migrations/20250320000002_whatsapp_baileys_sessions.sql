-- WhatsApp Baileys session storage

create table if not exists public.whatsapp_baileys_sessions (
  id uuid primary key default gen_random_uuid(),
  integration_account_id uuid not null references public.integration_accounts on delete cascade,
  workspace_id uuid references public.workspaces on delete cascade,
  auth_state jsonb,
  status text,
  last_qr text,
  numero text,
  nome text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_account_id)
);

create index if not exists whatsapp_baileys_sessions_workspace_idx
  on public.whatsapp_baileys_sessions (workspace_id);

create index if not exists whatsapp_baileys_sessions_account_idx
  on public.whatsapp_baileys_sessions (integration_account_id);

create trigger set_whatsapp_baileys_sessions_updated_at
before update on public.whatsapp_baileys_sessions
for each row execute function public.set_updated_at();

alter table public.whatsapp_baileys_sessions enable row level security;

create policy "Baileys sessions are viewable by members"
on public.whatsapp_baileys_sessions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Baileys sessions are manageable by members"
on public.whatsapp_baileys_sessions
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
