-- Settings core (workspace settings, invites, profile language, plan fields)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('Essential', 'Premium', 'Pro');
  end if;
end $$;

alter table public.workspaces
  add column if not exists plano public.plan_tier not null default 'Essential',
  add column if not exists trial_ends_at timestamptz;

alter table public.profiles
  add column if not exists idioma text not null default 'pt-BR';

create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  mascarar_viewer boolean not null default true,
  retencao_dias integer not null default 365,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  email text not null,
  role public.app_role not null default 'MEMBER',
  token text not null,
  status text not null default 'pendente',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_settings_workspace_idx
  on public.workspace_settings (workspace_id);
create index if not exists workspace_invites_workspace_idx
  on public.workspace_invites (workspace_id);
create index if not exists workspace_invites_token_idx
  on public.workspace_invites (token);

create trigger set_workspace_settings_updated_at
before update on public.workspace_settings
for each row execute function public.set_updated_at();

create trigger set_workspace_invites_updated_at
before update on public.workspace_invites
for each row execute function public.set_updated_at();

alter table public.workspace_settings enable row level security;
alter table public.workspace_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_settings'
      and policyname = 'Workspace settings are viewable by members'
  ) then
    create policy "Workspace settings are viewable by members"
    on public.workspace_settings
    for select
    to authenticated
    using (public.is_workspace_member(workspace_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_settings'
      and policyname = 'Workspace settings are manageable by admins'
  ) then
    create policy "Workspace settings are manageable by admins"
    on public.workspace_settings
    for all
    to authenticated
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_invites'
      and policyname = 'Workspace invites are viewable by admins'
  ) then
    create policy "Workspace invites are viewable by admins"
    on public.workspace_invites
    for select
    to authenticated
    using (public.is_workspace_admin(workspace_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_invites'
      and policyname = 'Workspace invites are manageable by admins'
  ) then
    create policy "Workspace invites are manageable by admins"
    on public.workspace_invites
    for all
    to authenticated
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id));
  end if;
end $$;

insert into public.workspace_settings (workspace_id)
select id from public.workspaces
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  new_workspace_id uuid;
begin
  workspace_name := coalesce(
    new.raw_user_meta_data->>'workspace_name',
    new.raw_user_meta_data->>'company_name',
    split_part(new.email, '@', 1) || ' Workspace'
  );

  insert into public.workspaces (nome, owner_id, plano, trial_ends_at)
  values (workspace_name, new.id, 'Essential', now() + interval '7 days')
  returning id into new_workspace_id;

  insert into public.profiles (user_id, nome, email, avatar_url, idioma)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'pt-BR'
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'ADMIN');

  insert into public.workspace_settings (workspace_id)
  values (new_workspace_id)
  on conflict do nothing;

  return new;
end;
$$;
