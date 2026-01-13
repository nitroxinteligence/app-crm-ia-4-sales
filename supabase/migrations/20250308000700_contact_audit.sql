-- Contact audit log

create table if not exists public.contact_audit (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  autor_id uuid references auth.users on delete set null,
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_audit_workspace_idx
  on public.contact_audit (workspace_id);
create index if not exists contact_audit_contact_idx
  on public.contact_audit (contact_id);

create trigger set_contact_audit_updated_at
before update on public.contact_audit
for each row execute function public.set_updated_at();

alter table public.contact_audit enable row level security;

create policy "Contact audit is viewable by members"
on public.contact_audit
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Contact audit is manageable by members"
on public.contact_audit
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
