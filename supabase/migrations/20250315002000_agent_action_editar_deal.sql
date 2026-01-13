-- Add editar_deal permission for agents

do $$
begin
  if not exists (
    select 1
    from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'agent_action'
      and pg_enum.enumlabel = 'editar_deal'
  ) then
    alter type public.agent_action add value 'editar_deal';
  end if;
end $$;
