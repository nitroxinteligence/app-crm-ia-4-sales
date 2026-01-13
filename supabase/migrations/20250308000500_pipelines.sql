-- Pipelines and stages

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines on delete cascade,
  nome text not null,
  ordem integer not null default 1,
  cor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, nome),
  unique (pipeline_id, ordem)
);

alter table public.contacts
  add column if not exists pipeline_id uuid references public.pipelines on delete set null,
  add column if not exists pipeline_stage_id uuid references public.pipeline_stages on delete set null;

create index if not exists pipelines_workspace_idx on public.pipelines (workspace_id);
create index if not exists pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id);
create index if not exists contacts_pipeline_idx on public.contacts (pipeline_id);
create index if not exists contacts_pipeline_stage_idx on public.contacts (pipeline_stage_id);

create trigger set_pipelines_updated_at
before update on public.pipelines
for each row execute function public.set_updated_at();

create trigger set_pipeline_stages_updated_at
before update on public.pipeline_stages
for each row execute function public.set_updated_at();

alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;

create policy "Pipelines are viewable by members"
on public.pipelines
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Pipelines are manageable by admins"
on public.pipelines
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Pipeline stages are viewable by members"
on public.pipeline_stages
for select
to authenticated
using (
  public.is_workspace_member(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
);

create policy "Pipeline stages are manageable by admins"
on public.pipeline_stages
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
);

create or replace function public.create_default_pipeline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pipeline_id uuid;
begin
  insert into public.pipelines (workspace_id, nome, descricao)
  values (new.id, 'Funil de vendas', 'Pipeline padrão')
  on conflict (workspace_id, nome)
  do update set nome = excluded.nome
  returning id into pipeline_id;

  insert into public.pipeline_stages (pipeline_id, nome, ordem, cor)
  values
    (pipeline_id, 'Novo Lead', 1, '#2563eb'),
    (pipeline_id, 'Qualificado', 2, '#0ea5e9'),
    (pipeline_id, 'Proposta', 3, '#16a34a'),
    (pipeline_id, 'Fechado', 4, '#8b5cf6')
  on conflict (pipeline_id, nome)
  do update set ordem = excluded.ordem, cor = excluded.cor;

  return new;
end;
$$;

drop trigger if exists on_workspaces_create_pipeline on public.workspaces;
create trigger on_workspaces_create_pipeline
after insert on public.workspaces
for each row execute function public.create_default_pipeline();

with pipelines_seed as (
  insert into public.pipelines (workspace_id, nome, descricao)
  select id, 'Funil de vendas', 'Pipeline padrão'
  from public.workspaces
  on conflict (workspace_id, nome)
  do update set nome = excluded.nome
  returning id
)
insert into public.pipeline_stages (pipeline_id, nome, ordem, cor)
select pipelines_seed.id, stage.nome, stage.ordem, stage.cor
from pipelines_seed
cross join (
  values
    ('Novo Lead', 1, '#2563eb'),
    ('Qualificado', 2, '#0ea5e9'),
    ('Proposta', 3, '#16a34a'),
    ('Fechado', 4, '#8b5cf6')
) as stage(nome, ordem, cor)
on conflict (pipeline_id, nome)
do update set ordem = excluded.ordem, cor = excluded.cor;
