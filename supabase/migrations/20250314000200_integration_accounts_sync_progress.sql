-- Track sync progress for integrations (UAZAPI history)

alter table public.integration_accounts
  add column if not exists sync_status text,
  add column if not exists sync_total integer,
  add column if not exists sync_done integer,
  add column if not exists sync_started_at timestamptz,
  add column if not exists sync_finished_at timestamptz,
  add column if not exists sync_last_error text;
