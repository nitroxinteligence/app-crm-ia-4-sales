-- Support multiple WhatsApp accounts (official + unofficial) per workspace
-- and bind conversations to a specific integration account.

alter table public.integration_accounts
  add column if not exists provider text,
  add column if not exists instance_id text,
  add column if not exists numero text,
  add column if not exists status text not null default 'desconectado',
  add column if not exists connected_at timestamptz;

alter table public.integration_tokens
  add column if not exists integration_account_id uuid references public.integration_accounts on delete cascade;

alter table public.conversations
  add column if not exists integration_account_id uuid references public.integration_accounts on delete set null;

create index if not exists integration_accounts_provider_idx
  on public.integration_accounts (provider);

create index if not exists integration_accounts_instance_idx
  on public.integration_accounts (instance_id);

create index if not exists integration_accounts_status_idx
  on public.integration_accounts (status);

create index if not exists integration_tokens_account_idx
  on public.integration_tokens (integration_account_id);

create index if not exists conversations_integration_account_idx
  on public.conversations (integration_account_id);

create unique index if not exists integration_tokens_account_unique
  on public.integration_tokens (integration_account_id)
  where integration_account_id is not null;

alter table public.conversations
  drop constraint if exists conversations_workspace_id_lead_id_canal_key;

alter table public.conversations
  add constraint conversations_workspace_lead_canal_account_key
  unique (workspace_id, lead_id, canal, integration_account_id);

update public.integration_accounts ia
set provider = case
  when i.canal = 'whatsapp' then 'whatsapp_oficial'
  when i.canal = 'instagram' then 'instagram'
  else i.canal::text
end
from public.integrations i
where ia.integration_id = i.id
  and ia.provider is null;

update public.integration_accounts ia
set status = case when i.status = 'conectado' then 'conectado' else 'desconectado' end,
    connected_at = case when i.status = 'conectado' then i.connected_at else ia.connected_at end
from public.integrations i
where ia.integration_id = i.id
  and (ia.status is null or ia.status = 'desconectado');

update public.integration_tokens it
set integration_account_id = ia.id
from public.integration_accounts ia
where it.integration_id = ia.integration_id
  and it.integration_account_id is null;
