-- Initial auth/workspace schema for VP CRM

create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN','MANAGER','MEMBER','VIEWER');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento text,
  tamanho_time text,
  status text not null default 'ativo',
  owner_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  nome text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.app_role not null default 'ADMIN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(check_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = check_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(check_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = check_workspace_id
      and user_id = auth.uid()
      and role = 'ADMIN'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Profiles can be inserted by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Profiles can be updated by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Workspaces are viewable by members"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy "Workspaces can be updated by admins"
on public.workspaces
for update
to authenticated
using (public.is_workspace_admin(id))
with check (public.is_workspace_admin(id));

create policy "Workspace members are viewable by members"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can be inserted by admins"
on public.workspace_members
for insert
to authenticated
with check (public.is_workspace_admin(workspace_id));

create policy "Workspace members can be updated by admins"
on public.workspace_members
for update
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Workspace members can be deleted by admins"
on public.workspace_members
for delete
to authenticated
using (public.is_workspace_admin(workspace_id));

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

  insert into public.workspaces (nome, owner_id)
  values (workspace_name, new.id)
  returning id into new_workspace_id;

  insert into public.profiles (user_id, nome, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'ADMIN');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
