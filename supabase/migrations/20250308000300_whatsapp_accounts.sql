-- Extra fields for WhatsApp integration accounts

alter table public.integration_accounts
  add column if not exists phone_number_id text,
  add column if not exists waba_id text,
  add column if not exists business_account_id text;

create index if not exists integration_accounts_phone_idx
  on public.integration_accounts (phone_number_id);

alter table public.integrations
  add column if not exists connected_at timestamptz;
