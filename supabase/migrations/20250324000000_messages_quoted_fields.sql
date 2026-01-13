alter table public.messages
  add column if not exists quoted_message_id text,
  add column if not exists quoted_conteudo text,
  add column if not exists quoted_tipo text,
  add column if not exists quoted_autor public.message_author,
  add column if not exists quoted_sender_id text,
  add column if not exists quoted_sender_nome text;
