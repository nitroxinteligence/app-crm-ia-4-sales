alter table public.integration_accounts
  add column if not exists sync_total_chats integer,
  add column if not exists sync_done_chats integer;
