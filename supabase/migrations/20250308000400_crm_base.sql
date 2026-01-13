-- CRM base schema (contacts, companies, tags, custom fields)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contact_status') then
    create type public.contact_status as enum (
      'novo',
      'qualificado',
      'em-negociacao',
      'cliente',
      'inativo'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'custom_field_type') then
    create type public.custom_field_type as enum (
      'text',
      'number',
      'currency',
      'date',
      'select',
      'multi-select',
      'boolean'
    );
  end if;
end $$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  site text,
  setor text,
  telefone text,
  email text,
  owner_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  telefone text,
  email text,
  status public.contact_status not null default 'novo',
  company_id uuid references public.companies on delete set null,
  owner_id uuid references auth.users on delete set null,
  documento_hash text,
  documento_encrypted bytea,
  endereco_encrypted bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email),
  unique (workspace_id, telefone)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  cor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table public.lead_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, tag_id)
);

create table public.contact_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  created_at timestamptz not null default now(),
  unique (contact_id, tag_id)
);

create table public.custom_fields_lead (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  nome text not null,
  tipo public.custom_field_type not null,
  opcoes jsonb,
  obrigatorio boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table public.custom_field_values_lead (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  lead_id uuid not null references public.leads on delete cascade,
  field_id uuid not null references public.custom_fields_lead on delete cascade,
  valor jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, field_id)
);

create index companies_workspace_idx on public.companies (workspace_id);
create index companies_owner_idx on public.companies (owner_id);
create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_status_idx on public.contacts (status);
create index contacts_owner_idx on public.contacts (owner_id);
create index contacts_company_idx on public.contacts (company_id);
create index tags_workspace_idx on public.tags (workspace_id);
create index lead_tags_workspace_idx on public.lead_tags (workspace_id);
create index lead_tags_lead_idx on public.lead_tags (lead_id);
create index contact_tags_workspace_idx on public.contact_tags (workspace_id);
create index contact_tags_contact_idx on public.contact_tags (contact_id);
create index custom_fields_lead_workspace_idx on public.custom_fields_lead (workspace_id);
create index custom_field_values_lead_workspace_idx on public.custom_field_values_lead (workspace_id);
create index custom_field_values_lead_lead_idx on public.custom_field_values_lead (lead_id);

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger set_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

create trigger set_custom_fields_lead_updated_at
before update on public.custom_fields_lead
for each row execute function public.set_updated_at();

create trigger set_custom_field_values_lead_updated_at
before update on public.custom_field_values_lead
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.tags enable row level security;
alter table public.lead_tags enable row level security;
alter table public.contact_tags enable row level security;
alter table public.custom_fields_lead enable row level security;
alter table public.custom_field_values_lead enable row level security;

create policy "Companies are viewable by members"
on public.companies
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Companies are manageable by members"
on public.companies
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Contacts are viewable by members"
on public.contacts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Contacts are manageable by members"
on public.contacts
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Tags are viewable by members"
on public.tags
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Tags are manageable by members"
on public.tags
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Lead tags are viewable by members"
on public.lead_tags
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Lead tags are manageable by members"
on public.lead_tags
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Contact tags are viewable by members"
on public.contact_tags
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Contact tags are manageable by members"
on public.contact_tags
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Lead custom fields are viewable by members"
on public.custom_fields_lead
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Lead custom fields are manageable by admins"
on public.custom_fields_lead
for all
to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Lead custom field values are viewable by members"
on public.custom_field_values_lead
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Lead custom field values are manageable by members"
on public.custom_field_values_lead
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

alter table public.leads
  add constraint leads_contato_id_fkey
  foreign key (contato_id)
  references public.contacts
  on delete set null;

alter table public.conversations
  add constraint conversations_contact_id_fkey
  foreign key (contact_id)
  references public.contacts
  on delete set null;

create index leads_contato_idx on public.leads (contato_id);
create index conversations_contact_idx on public.conversations (contact_id);
