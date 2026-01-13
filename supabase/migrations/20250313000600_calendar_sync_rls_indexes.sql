-- Calendar sync state RLS + performance indexes for multi-tenant scale

drop policy if exists "Calendar sync state is viewable by owner" on public.calendar_sync_state;
create policy "Calendar sync state is viewable by owner"
on public.calendar_sync_state
for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_integrations ci
    where ci.id = integration_id
      and ci.user_id = auth.uid()
      and public.is_workspace_member(ci.workspace_id)
      and public.is_workspace_not_expired(ci.workspace_id)
  )
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

create index if not exists integration_accounts_integration_idx
  on public.integration_accounts (integration_id);

create index if not exists integration_tokens_integration_idx
  on public.integration_tokens (integration_id);

create index if not exists webhook_events_integration_idx
  on public.webhook_events (integration_id);
