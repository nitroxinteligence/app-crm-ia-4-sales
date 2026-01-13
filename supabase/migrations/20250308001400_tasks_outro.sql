do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'outro'
      and enumtypid = (select oid from pg_type where typname = 'task_relation_type')
  ) then
    alter type public.task_relation_type add value 'outro';
  end if;
end $$;

alter table public.tasks
  add column if not exists tipo_outro text;
