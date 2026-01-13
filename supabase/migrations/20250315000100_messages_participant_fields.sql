alter table public.messages
  add column if not exists sender_id text,
  add column if not exists sender_nome text,
  add column if not exists sender_avatar_url text;
