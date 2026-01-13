-- Remove Companies module and Tickets relation

alter table public.contacts add column if not exists empresa text;
alter table public.leads add column if not exists empresa text;
alter table public.deals add column if not exists empresa text;

update public.contacts as c
set empresa = coalesce(c.empresa, comp.nome)
from public.companies as comp
where c.company_id = comp.id;

update public.deals as d
set empresa = coalesce(d.empresa, comp.nome)
from public.companies as comp
where d.company_id = comp.id;

alter table public.contacts drop column if exists company_id;
alter table public.deals drop column if exists company_id;

drop table if exists public.companies;

do $$
begin
  if to_regclass('public.task_relations') is not null then
    update public.task_relations
      set relacionamento_tipo = 'outro'
      where relacionamento_tipo = 'ticket';
  end if;

  if exists (select 1 from pg_type where typname = 'task_relation_type') then
    create type public.task_relation_type_new as enum ('lead', 'deal', 'conversa', 'outro');
    alter table public.task_relations
      alter column relacionamento_tipo type public.task_relation_type_new
      using relacionamento_tipo::text::public.task_relation_type_new;
    drop type public.task_relation_type;
    alter type public.task_relation_type_new rename to task_relation_type;
  end if;
end $$;
