-- Events log for reports

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  actor_type text,
  actor_id uuid,
  canal public.canal_id,
  valor_num numeric,
  payload_minimo jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_workspace_idx on public.events (workspace_id);
create index events_workspace_occurred_idx on public.events (workspace_id, occurred_at desc);
create index events_workspace_type_idx on public.events (workspace_id, event_type);
create index events_workspace_entity_idx on public.events (workspace_id, entity_type, entity_id);
create index events_workspace_canal_idx on public.events (workspace_id, canal);

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.log_event(
  p_workspace_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_canal public.canal_id,
  p_valor_num numeric,
  p_payload_minimo jsonb,
  p_occurred_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    valor_num,
    payload_minimo,
    occurred_at
  )
  values (
    p_workspace_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_actor_type,
    p_actor_id,
    p_canal,
    p_valor_num,
    p_payload_minimo,
    coalesce(p_occurred_at, now())
  );
end;
$$;

create or replace function public.handle_message_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  event_tipo text;
  canal_id public.canal_id;
begin
  if new.interno then
    event_tipo := 'inbox.message.internal';
  elsif new.autor = 'contato' then
    event_tipo := 'inbox.message.received';
  else
    event_tipo := 'inbox.message.sent';
  end if;

  select canal into canal_id
  from public.conversations
  where id = new.conversation_id;

  perform public.log_event(
    new.workspace_id,
    event_tipo,
    'message',
    new.id,
    case
      when new.autor = 'agente' then 'agent'
      when new.autor = 'equipe' then 'user'
      when new.autor = 'contato' then 'contact'
      else 'system'
    end,
    null,
    canal_id,
    null,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'autor', new.autor,
      'tipo', new.tipo,
      'interno', new.interno
    ),
    new.created_at
  );

  return new;
end;
$$;

create or replace function public.handle_lead_insert_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_tipo text;
begin
  actor_id := coalesce(auth.uid(), new.owner_id);
  actor_tipo := case when actor_id is not null then 'user' else 'system' end;

  perform public.log_event(
    new.workspace_id,
    'crm.lead.created',
    'lead',
    new.id,
    actor_tipo,
    actor_id,
    new.canal_origem,
    null,
    jsonb_build_object('status', new.status),
    new.created_at
  );

  return new;
end;
$$;

create or replace function public.handle_lead_convert_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_tipo text;
begin
  if old.contato_id is null and new.contato_id is not null then
    actor_id := coalesce(auth.uid(), new.owner_id);
    actor_tipo := case when actor_id is not null then 'user' else 'system' end;

    perform public.log_event(
      new.workspace_id,
      'crm.lead.converted',
      'lead',
      new.id,
      actor_tipo,
      actor_id,
      new.canal_origem,
      null,
      jsonb_build_object('contact_id', new.contato_id),
      now()
    );
  end if;

  return new;
end;
$$;

create or replace function public.handle_contact_insert_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_tipo text;
begin
  actor_id := coalesce(auth.uid(), new.owner_id);
  actor_tipo := case when actor_id is not null then 'user' else 'system' end;

  perform public.log_event(
    new.workspace_id,
    'crm.contact.created',
    'contact',
    new.id,
    actor_tipo,
    actor_id,
    null,
    null,
    jsonb_build_object('status', new.status),
    new.created_at
  );

  return new;
end;
$$;

create or replace function public.handle_contact_pipeline_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_tipo text;
begin
  if old.pipeline_stage_id is distinct from new.pipeline_stage_id then
    actor_id := coalesce(auth.uid(), new.owner_id);
    actor_tipo := case when actor_id is not null then 'user' else 'system' end;

    perform public.log_event(
      new.workspace_id,
      'pipeline.stage.changed',
      'contact',
      new.id,
      actor_tipo,
      actor_id,
      null,
      null,
      jsonb_build_object(
        'from_stage_id', old.pipeline_stage_id,
        'to_stage_id', new.pipeline_stage_id,
        'pipeline_id', new.pipeline_id
      ),
      now()
    );
  end if;

  return new;
end;
$$;

create or replace function public.handle_conversation_status_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_id uuid;
  actor_tipo text;
begin
  if old.status is distinct from new.status then
    actor_id := coalesce(auth.uid(), new.owner_id);
    actor_tipo := case when actor_id is not null then 'user' else 'system' end;

    perform public.log_event(
      new.workspace_id,
      'inbox.conversation.status_changed',
      'conversation',
      new.id,
      actor_tipo,
      actor_id,
      new.canal,
      null,
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status
      ),
      now()
    );
  end if;

  return new;
end;
$$;

create trigger on_messages_insert_event
after insert on public.messages
for each row execute function public.handle_message_event();

create trigger on_leads_insert_event
after insert on public.leads
for each row execute function public.handle_lead_insert_event();

create trigger on_leads_convert_event
after update of contato_id on public.leads
for each row execute function public.handle_lead_convert_event();

create trigger on_contacts_insert_event
after insert on public.contacts
for each row execute function public.handle_contact_insert_event();

create trigger on_contacts_pipeline_event
after update of pipeline_stage_id on public.contacts
for each row execute function public.handle_contact_pipeline_event();

create trigger on_conversations_status_event
after update of status on public.conversations
for each row execute function public.handle_conversation_status_event();

alter table public.events enable row level security;

create policy "Events are viewable by members"
on public.events
for select
to authenticated
using (public.is_workspace_member(workspace_id));
