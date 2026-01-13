alter table public.messages
  add column if not exists send_status text not null default 'sent',
  add column if not exists send_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_send_status_check'
  ) then
    alter table public.messages
      add constraint messages_send_status_check
      check (send_status in ('sending', 'sent', 'failed'));
  end if;
end $$;

