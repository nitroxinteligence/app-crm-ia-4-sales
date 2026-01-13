-- Contact profile enhancements: avatar, notes, files, storage buckets

alter table public.contacts
  add column if not exists avatar_url text;

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  autor_id uuid references auth.users on delete set null,
  conteudo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  autor_id uuid references auth.users on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  tamanho_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_notes_workspace_idx on public.contact_notes (workspace_id);
create index if not exists contact_notes_contact_idx on public.contact_notes (contact_id);
create index if not exists contact_files_workspace_idx on public.contact_files (workspace_id);
create index if not exists contact_files_contact_idx on public.contact_files (contact_id);

create trigger set_contact_notes_updated_at
before update on public.contact_notes
for each row execute function public.set_updated_at();

create trigger set_contact_files_updated_at
before update on public.contact_files
for each row execute function public.set_updated_at();

alter table public.contact_notes enable row level security;
alter table public.contact_files enable row level security;

create policy "Contact notes are viewable by members"
on public.contact_notes
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Contact notes are manageable by members"
on public.contact_notes
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Contact files are viewable by members"
on public.contact_files
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Contact files are manageable by members"
on public.contact_files
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public)
values ('contact-avatars', 'contact-avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('contact-files', 'contact-files', true)
on conflict (id) do update set public = excluded.public;

create policy "Contact avatars are viewable"
on storage.objects
for select
to authenticated
using (bucket_id = 'contact-avatars');

create policy "Contact avatars are manageable"
on storage.objects
for all
to authenticated
using (bucket_id = 'contact-avatars')
with check (bucket_id = 'contact-avatars');

create policy "Contact files are viewable"
on storage.objects
for select
to authenticated
using (bucket_id = 'contact-files');

create policy "Contact files are manageable"
on storage.objects
for all
to authenticated
using (bucket_id = 'contact-files')
with check (bucket_id = 'contact-files');
