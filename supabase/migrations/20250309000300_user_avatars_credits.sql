-- User avatars bucket + workspace credit usage

create table if not exists public.workspace_credits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  credits_total integer not null default 1000,
  credits_used integer not null default 0,
  period_start date not null default date_trunc('month', now())::date,
  period_end date not null default (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create index if not exists workspace_credits_workspace_idx
  on public.workspace_credits (workspace_id);

create trigger set_workspace_credits_updated_at
before update on public.workspace_credits
for each row execute function public.set_updated_at();

alter table public.workspace_credits enable row level security;

create policy "Workspace credits are viewable by members"
on public.workspace_credits
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace credits are manageable by admins"
on public.workspace_credits
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

insert into public.workspace_credits (workspace_id)
select id from public.workspaces
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do update set public = excluded.public;

create policy "User avatars are viewable"
on storage.objects
for select
to authenticated
using (bucket_id = 'user-avatars');

create policy "User avatars are manageable"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'user-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'user-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
