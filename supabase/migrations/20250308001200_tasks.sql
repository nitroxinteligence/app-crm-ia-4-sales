-- Tasks (user-only) + relations

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_type') then
    create type public.task_type as enum (
      'ligacao',
      'reuniao',
      'follow-up',
      'email',
      'outro'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('pendente', 'concluida');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_origin') then
    create type public.task_origin as enum ('usuario', 'agente');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_relation_type') then
    create type public.task_relation_type as enum (
      'lead',
      'deal',
      'ticket',
      'conversa'
    );
  end if;
end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  titulo text not null,
  descricao text,
  tipo public.task_type not null default 'outro',
  status public.task_status not null default 'pendente',
  due_at timestamptz not null,
  responsavel_id uuid references auth.users on delete set null,
  criado_por_tipo public.task_origin not null default 'usuario',
  criado_por_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_relations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks on delete cascade,
  relacionamento_tipo public.task_relation_type not null,
  relacionamento_id uuid,
  relacionamento_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists task_relations_task_idx on public.task_relations (task_id);
create index if not exists tasks_workspace_idx on public.tasks (workspace_id);
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists tasks_due_idx on public.tasks (due_at);
create index if not exists tasks_status_idx on public.tasks (status);

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger set_task_relations_updated_at
before update on public.task_relations
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.task_relations enable row level security;

create policy "Tasks are viewable by owner"
on public.tasks
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
);

create policy "Tasks are manageable by owner"
on public.tasks
for all
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
)
with check (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
);

create policy "Task relations are viewable by owner"
on public.task_relations
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
);

create policy "Task relations are manageable by owner"
on public.task_relations
for all
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
);
