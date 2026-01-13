-- Store avatar URL for connected integration accounts

alter table public.integration_accounts
  add column if not exists avatar_url text;
