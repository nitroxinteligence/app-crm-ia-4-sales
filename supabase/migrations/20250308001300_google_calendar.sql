-- Google Calendar integration (primary calendar)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_provider') then
    create type public.calendar_provider as enum ('google');
  end if;
  if not exists (select 1 from pg_type where typname = 'calendar_integration_status') then
    create type public.calendar_integration_status as enum (
      'conectado',
      'desconectado',
      'erro'
    );
  end if;
end $$;

create table if not exists public.calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  provider public.calendar_provider not null default 'google',
  status public.calendar_integration_status not null default 'desconectado',
  primary_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.calendar_integrations on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id)
);

create table if not exists public.calendar_sync_state (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.calendar_integrations on delete cascade,
  calendar_id text not null,
  sync_token text,
  channel_id text,
  channel_token text,
  resource_id text,
  expiration timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, calendar_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.calendar_integrations on delete cascade,
  calendar_id text not null,
  google_event_id text not null,
  recurring_event_id text,
  titulo text,
  descricao text,
  localizacao text,
  status text,
  is_all_day boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  updated_at_remote timestamptz,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, google_event_id)
);

create table if not exists public.calendar_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  state text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_integrations_user_idx
  on public.calendar_integrations (user_id);
create index if not exists calendar_events_start_idx
  on public.calendar_events (start_at);
create index if not exists calendar_events_calendar_idx
  on public.calendar_events (calendar_id);

create trigger set_calendar_integrations_updated_at
before update on public.calendar_integrations
for each row execute function public.set_updated_at();

create trigger set_calendar_tokens_updated_at
before update on public.calendar_tokens
for each row execute function public.set_updated_at();

create trigger set_calendar_sync_state_updated_at
before update on public.calendar_sync_state
for each row execute function public.set_updated_at();

create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_integrations enable row level security;
alter table public.calendar_tokens enable row level security;
alter table public.calendar_sync_state enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_oauth_states enable row level security;

create policy "Calendar integrations are viewable by owner"
on public.calendar_integrations
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
);

create policy "Calendar events are viewable by owner"
on public.calendar_events
for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_integrations ci
    where ci.id = integration_id
      and ci.user_id = auth.uid()
      and public.is_workspace_member(ci.workspace_id)
  )
);
