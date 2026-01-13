-- Custom fields for deals + order support

alter table public.custom_fields_lead
  add column if not exists ordem integer not null default 0;

create table if not exists public.custom_fields_deal (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  tipo public.custom_field_type not null,
  opcoes jsonb,
  obrigatorio boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create index if not exists custom_fields_deal_workspace_idx
  on public.custom_fields_deal (workspace_id);

create trigger set_custom_fields_deal_updated_at
before update on public.custom_fields_deal
for each row execute function public.set_updated_at();

alter table public.custom_fields_deal enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'custom_fields_deal'
      and policyname = 'Deal custom fields are viewable by members'
  ) then
    create policy "Deal custom fields are viewable by members"
    on public.custom_fields_deal
    for select
    to authenticated
    using (public.is_workspace_member(workspace_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'custom_fields_deal'
      and policyname = 'Deal custom fields are manageable by members'
  ) then
    create policy "Deal custom fields are manageable by members"
    on public.custom_fields_deal
    for all
    to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));
  end if;

end $$;
