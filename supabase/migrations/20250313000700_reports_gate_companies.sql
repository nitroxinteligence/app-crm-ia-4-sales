-- Gate report views by active workspace and lock companies when trial expires

drop policy if exists "Companies are viewable by members" on public.companies;
drop policy if exists "Companies are manageable by members" on public.companies;
create policy "Companies are viewable by members"
on public.companies
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Companies are manageable by members"
on public.companies
for all
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
)
with check (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);

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
  and public.is_workspace_active(workspace_id)
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
  and public.is_workspace_active(workspace_id)
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
  and public.is_workspace_active(workspace_id)
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
  and public.is_workspace_active(workspace_id)
group by workspace_id, dia, actor_type, actor_id, canal;
