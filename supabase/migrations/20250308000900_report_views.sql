-- Reports: backfill + materialized views

drop view if exists public.v_inbox_daily;
drop view if exists public.v_leads_daily;
drop view if exists public.v_pipeline_daily;
drop view if exists public.v_activity_daily;
drop materialized view if exists public.mv_inbox_daily;
drop materialized view if exists public.mv_leads_daily;
drop materialized view if exists public.mv_pipeline_daily;
drop materialized view if exists public.mv_activity_daily;

create or replace function public.backfill_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with mensagens as (
    select
      m.id,
      m.workspace_id,
      m.conversation_id,
      m.autor,
      m.tipo,
      m.interno,
      m.created_at,
      c.canal,
      case
        when m.interno then 'inbox.message.internal'
        when m.autor = 'contato' then 'inbox.message.received'
        else 'inbox.message.sent'
      end as event_type,
      case
        when m.autor = 'agente' then 'agent'
        when m.autor = 'equipe' then 'user'
        when m.autor = 'contato' then 'contact'
        else 'system'
      end as actor_type
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
  )
  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    mensagens.workspace_id,
    mensagens.event_type,
    'message',
    mensagens.id,
    mensagens.actor_type,
    null,
    mensagens.canal,
    jsonb_build_object(
      'conversation_id', mensagens.conversation_id,
      'autor', mensagens.autor,
      'tipo', mensagens.tipo,
      'interno', mensagens.interno
    ),
    mensagens.created_at
  from mensagens
  where not exists (
    select 1
    from public.events e
    where e.entity_type = 'message'
      and e.entity_id = mensagens.id
      and e.event_type = mensagens.event_type
  );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    l.workspace_id,
    'crm.lead.created',
    'lead',
    l.id,
    case when l.owner_id is not null then 'user' else 'system' end,
    l.owner_id,
    l.canal_origem,
    jsonb_build_object('status', l.status),
    l.created_at
  from public.leads l
  where not exists (
    select 1
    from public.events e
    where e.entity_type = 'lead'
      and e.entity_id = l.id
      and e.event_type = 'crm.lead.created'
  );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    l.workspace_id,
    'crm.lead.converted',
    'lead',
    l.id,
    case when l.owner_id is not null then 'user' else 'system' end,
    l.owner_id,
    l.canal_origem,
    jsonb_build_object('contact_id', l.contato_id),
    l.updated_at
  from public.leads l
  where l.contato_id is not null
    and not exists (
      select 1
      from public.events e
      where e.entity_type = 'lead'
        and e.entity_id = l.id
        and e.event_type = 'crm.lead.converted'
    );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    c.workspace_id,
    'crm.contact.created',
    'contact',
    c.id,
    case when c.owner_id is not null then 'user' else 'system' end,
    c.owner_id,
    null,
    jsonb_build_object('status', c.status),
    c.created_at
  from public.contacts c
  where not exists (
    select 1
    from public.events e
    where e.entity_type = 'contact'
      and e.entity_id = c.id
      and e.event_type = 'crm.contact.created'
  );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    c.workspace_id,
    'pipeline.stage.changed',
    'contact',
    c.id,
    case when c.owner_id is not null then 'user' else 'system' end,
    c.owner_id,
    null,
    jsonb_build_object(
      'from_stage_id', null,
      'to_stage_id', c.pipeline_stage_id,
      'pipeline_id', c.pipeline_id
    ),
    c.updated_at
  from public.contacts c
  where c.pipeline_stage_id is not null
    and not exists (
      select 1
      from public.events e
      where e.entity_type = 'contact'
        and e.entity_id = c.id
        and e.event_type = 'pipeline.stage.changed'
    );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    c.workspace_id,
    'inbox.conversation.status_changed',
    'conversation',
    c.id,
    case when c.owner_id is not null then 'user' else 'system' end,
    c.owner_id,
    c.canal,
    jsonb_build_object(
      'from_status', null,
      'to_status', c.status
    ),
    c.updated_at
  from public.conversations c
  where not exists (
    select 1
    from public.events e
    where e.entity_type = 'conversation'
      and e.entity_id = c.id
      and e.event_type = 'inbox.conversation.status_changed'
  );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    payload_minimo,
    occurred_at
  )
  select
    i.workspace_id,
    'integrations.whatsapp.connected',
    'integration',
    i.id,
    'system',
    null,
    i.canal,
    jsonb_build_object('connected_at', i.connected_at),
    coalesce(i.connected_at, i.updated_at, i.created_at)
  from public.integrations i
  where i.canal = 'whatsapp'
    and i.status = 'conectado'
    and not exists (
      select 1
      from public.events e
      where e.entity_type = 'integration'
        and e.entity_id = i.id
        and e.event_type = 'integrations.whatsapp.connected'
    );
end;
$$;

create materialized view public.mv_inbox_daily as
select
  workspace_id,
  date_trunc('day', occurred_at)::date as dia,
  canal,
  count(*) filter (where event_type = 'inbox.message.received') as mensagens_recebidas,
  count(*) filter (where event_type = 'inbox.message.sent') as mensagens_enviadas,
  count(*) filter (where event_type = 'inbox.message.internal') as mensagens_internas,
  count(distinct (payload_minimo->>'conversation_id')) filter (
    where event_type in (
      'inbox.message.received',
      'inbox.message.sent',
      'inbox.message.internal'
    )
  ) as conversas_ativas,
  count(*) filter (
    where event_type = 'inbox.conversation.status_changed'
      and payload_minimo->>'to_status' = 'aberta'
  ) as conversas_abertas,
  count(*) filter (
    where event_type = 'inbox.conversation.status_changed'
      and payload_minimo->>'to_status' = 'pendente'
  ) as conversas_pendentes,
  count(*) filter (
    where event_type = 'inbox.conversation.status_changed'
      and payload_minimo->>'to_status' = 'resolvida'
  ) as conversas_resolvidas,
  count(*) filter (
    where event_type = 'inbox.conversation.status_changed'
      and payload_minimo->>'to_status' = 'spam'
  ) as conversas_spam
from public.events
where event_type in (
  'inbox.message.received',
  'inbox.message.sent',
  'inbox.message.internal',
  'inbox.conversation.status_changed'
)
group by workspace_id, dia, canal;

create unique index mv_inbox_daily_unique
  on public.mv_inbox_daily (workspace_id, dia, canal);

create materialized view public.mv_leads_daily as
select
  workspace_id,
  date_trunc('day', occurred_at)::date as dia,
  canal,
  count(*) filter (where event_type = 'crm.lead.created') as leads_criados,
  count(*) filter (where event_type = 'crm.lead.converted') as leads_convertidos
from public.events
where event_type in ('crm.lead.created', 'crm.lead.converted')
group by workspace_id, dia, canal;

create unique index mv_leads_daily_unique
  on public.mv_leads_daily (workspace_id, dia, canal);

create materialized view public.mv_pipeline_daily as
select
  workspace_id,
  date_trunc('day', occurred_at)::date as dia,
  nullif(payload_minimo->>'pipeline_id', '')::uuid as pipeline_id,
  nullif(payload_minimo->>'to_stage_id', '')::uuid as stage_id,
  count(*) as mudancas
from public.events
where event_type = 'pipeline.stage.changed'
group by workspace_id, dia, pipeline_id, stage_id;

create unique index mv_pipeline_daily_unique
  on public.mv_pipeline_daily (workspace_id, dia, pipeline_id, stage_id);

create materialized view public.mv_activity_daily as
select
  workspace_id,
  date_trunc('day', occurred_at)::date as dia,
  actor_type,
  actor_id,
  canal,
  count(*) as total_eventos,
  count(*) filter (where event_type like 'inbox.message.%') as mensagens,
  count(*) filter (where event_type = 'crm.lead.created') as leads_criados,
  count(*) filter (where event_type = 'crm.lead.converted') as leads_convertidos
from public.events
group by workspace_id, dia, actor_type, actor_id, canal;

create unique index mv_activity_daily_unique
  on public.mv_activity_daily (workspace_id, dia, actor_type, actor_id, canal);

create table if not exists public.report_refresh_state (
  id integer primary key default 1,
  last_refreshed_at timestamptz not null default now()
);

insert into public.report_refresh_state (id, last_refreshed_at)
values (1, now())
on conflict (id) do nothing;

create or replace function public.refresh_report_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.mv_inbox_daily;
  refresh materialized view public.mv_leads_daily;
  refresh materialized view public.mv_pipeline_daily;
  refresh materialized view public.mv_activity_daily;

  update public.report_refresh_state
  set last_refreshed_at = now()
  where id = 1;
end;
$$;

revoke all on public.mv_inbox_daily from public;
revoke all on public.mv_leads_daily from public;
revoke all on public.mv_pipeline_daily from public;
revoke all on public.mv_activity_daily from public;

grant select on public.mv_inbox_daily to service_role;
grant select on public.mv_leads_daily to service_role;
grant select on public.mv_pipeline_daily to service_role;
grant select on public.mv_activity_daily to service_role;

create or replace view public.v_inbox_daily
with (security_barrier = true) as
with refresh_state as (
  select coalesce(
    (select last_refreshed_at from public.report_refresh_state where id = 1),
    now() - interval '1 day'
  ) as last_refreshed_at
),
base as (
  select * from public.mv_inbox_daily
),
delta as (
  select
    workspace_id,
    date_trunc('day', occurred_at)::date as dia,
    canal,
    count(*) filter (where event_type = 'inbox.message.received') as mensagens_recebidas,
    count(*) filter (where event_type = 'inbox.message.sent') as mensagens_enviadas,
    count(*) filter (where event_type = 'inbox.message.internal') as mensagens_internas,
    count(distinct (payload_minimo->>'conversation_id')) filter (
      where event_type in (
        'inbox.message.received',
        'inbox.message.sent',
        'inbox.message.internal'
      )
    ) as conversas_ativas,
    count(*) filter (
      where event_type = 'inbox.conversation.status_changed'
        and payload_minimo->>'to_status' = 'aberta'
    ) as conversas_abertas,
    count(*) filter (
      where event_type = 'inbox.conversation.status_changed'
        and payload_minimo->>'to_status' = 'pendente'
    ) as conversas_pendentes,
    count(*) filter (
      where event_type = 'inbox.conversation.status_changed'
        and payload_minimo->>'to_status' = 'resolvida'
    ) as conversas_resolvidas,
    count(*) filter (
      where event_type = 'inbox.conversation.status_changed'
        and payload_minimo->>'to_status' = 'spam'
    ) as conversas_spam
  from public.events, refresh_state
  where event_type in (
    'inbox.message.received',
    'inbox.message.sent',
    'inbox.message.internal',
    'inbox.conversation.status_changed'
  )
    and occurred_at >= refresh_state.last_refreshed_at
  group by workspace_id, dia, canal
),
combinado as (
  select * from base
  union all
  select * from delta
)
select
  workspace_id,
  dia,
  canal,
  sum(mensagens_recebidas) as mensagens_recebidas,
  sum(mensagens_enviadas) as mensagens_enviadas,
  sum(mensagens_internas) as mensagens_internas,
  sum(conversas_ativas) as conversas_ativas,
  sum(conversas_abertas) as conversas_abertas,
  sum(conversas_pendentes) as conversas_pendentes,
  sum(conversas_resolvidas) as conversas_resolvidas,
  sum(conversas_spam) as conversas_spam
from combinado
where public.is_workspace_member(workspace_id)
group by workspace_id, dia, canal;

create or replace view public.v_leads_daily
with (security_barrier = true) as
with refresh_state as (
  select coalesce(
    (select last_refreshed_at from public.report_refresh_state where id = 1),
    now() - interval '1 day'
  ) as last_refreshed_at
),
base as (
  select * from public.mv_leads_daily
),
delta as (
  select
    workspace_id,
    date_trunc('day', occurred_at)::date as dia,
    canal,
    count(*) filter (where event_type = 'crm.lead.created') as leads_criados,
    count(*) filter (where event_type = 'crm.lead.converted') as leads_convertidos
  from public.events, refresh_state
  where event_type in ('crm.lead.created', 'crm.lead.converted')
    and occurred_at >= refresh_state.last_refreshed_at
  group by workspace_id, dia, canal
),
combinado as (
  select * from base
  union all
  select * from delta
)
select
  workspace_id,
  dia,
  canal,
  sum(leads_criados) as leads_criados,
  sum(leads_convertidos) as leads_convertidos
from combinado
where public.is_workspace_member(workspace_id)
group by workspace_id, dia, canal;

create or replace view public.v_pipeline_daily
with (security_barrier = true) as
with refresh_state as (
  select coalesce(
    (select last_refreshed_at from public.report_refresh_state where id = 1),
    now() - interval '1 day'
  ) as last_refreshed_at
),
base as (
  select * from public.mv_pipeline_daily
),
delta as (
  select
    workspace_id,
    date_trunc('day', occurred_at)::date as dia,
    nullif(payload_minimo->>'pipeline_id', '')::uuid as pipeline_id,
    nullif(payload_minimo->>'to_stage_id', '')::uuid as stage_id,
    count(*) as mudancas
  from public.events, refresh_state
  where event_type = 'pipeline.stage.changed'
    and occurred_at >= refresh_state.last_refreshed_at
  group by workspace_id, dia, pipeline_id, stage_id
),
combinado as (
  select * from base
  union all
  select * from delta
)
select
  workspace_id,
  dia,
  pipeline_id,
  stage_id,
  sum(mudancas) as mudancas
from combinado
where public.is_workspace_member(workspace_id)
group by workspace_id, dia, pipeline_id, stage_id;

create or replace view public.v_activity_daily
with (security_barrier = true) as
with refresh_state as (
  select coalesce(
    (select last_refreshed_at from public.report_refresh_state where id = 1),
    now() - interval '1 day'
  ) as last_refreshed_at
),
base as (
  select * from public.mv_activity_daily
),
delta as (
  select
    workspace_id,
    date_trunc('day', occurred_at)::date as dia,
    actor_type,
    actor_id,
    canal,
    count(*) as total_eventos,
    count(*) filter (where event_type like 'inbox.message.%') as mensagens,
    count(*) filter (where event_type = 'crm.lead.created') as leads_criados,
    count(*) filter (where event_type = 'crm.lead.converted') as leads_convertidos
  from public.events, refresh_state
  where occurred_at >= refresh_state.last_refreshed_at
  group by workspace_id, dia, actor_type, actor_id, canal
),
combinado as (
  select * from base
  union all
  select * from delta
)
select
  workspace_id,
  dia,
  actor_type,
  actor_id,
  canal,
  sum(total_eventos) as total_eventos,
  sum(mensagens) as mensagens,
  sum(leads_criados) as leads_criados,
  sum(leads_convertidos) as leads_convertidos
from combinado
where public.is_workspace_member(workspace_id)
group by workspace_id, dia, actor_type, actor_id, canal;

grant select on public.v_inbox_daily to authenticated;
grant select on public.v_leads_daily to authenticated;
grant select on public.v_pipeline_daily to authenticated;
grant select on public.v_activity_daily to authenticated;

revoke execute on function public.backfill_events() from public;
revoke execute on function public.refresh_report_views() from public;
grant execute on function public.backfill_events() to service_role;
grant execute on function public.refresh_report_views() to service_role;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if not exists (select 1 from cron.job where jobname = 'refresh_report_views') then
      perform cron.schedule(
        'refresh_report_views',
        '*/15 * * * *',
        'select public.refresh_report_views();'
      );
    end if;
  end if;
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end;
$$;

select public.backfill_events();
select public.refresh_report_views();
