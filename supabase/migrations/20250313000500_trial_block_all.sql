-- Block all workspace data after trial expires while allowing onboarding pre-plan

create or replace function public.is_workspace_not_expired(check_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces
    where id = check_workspace_id
      and (trial_ends_at is null or trial_ends_at >= now())
  );
$$;

-- Workspaces
drop policy if exists "Workspaces are viewable by members" on public.workspaces;
drop policy if exists "Workspaces can be updated by admins" on public.workspaces;
create policy "Workspaces are viewable by members"
on public.workspaces
for select
to authenticated
using (
  public.is_workspace_member(id)
  and public.is_workspace_not_expired(id)
);
create policy "Workspaces can be updated by admins"
on public.workspaces
for update
to authenticated
using (
  public.is_workspace_admin(id)
  and public.is_workspace_not_expired(id)
)
with check (
  public.is_workspace_admin(id)
  and public.is_workspace_not_expired(id)
);

-- Workspace members
drop policy if exists "Workspace members are viewable by members" on public.workspace_members;
drop policy if exists "Workspace members can be inserted by admins" on public.workspace_members;
drop policy if exists "Workspace members can be updated by admins" on public.workspace_members;
drop policy if exists "Workspace members can be deleted by admins" on public.workspace_members;
create policy "Workspace members are viewable by members"
on public.workspace_members
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace members can be inserted by admins"
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace members can be updated by admins"
on public.workspace_members
for update
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace members can be deleted by admins"
on public.workspace_members
for delete
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

-- Workspace settings + invites
drop policy if exists "Workspace settings are viewable by members" on public.workspace_settings;
drop policy if exists "Workspace settings are manageable by admins" on public.workspace_settings;
create policy "Workspace settings are viewable by members"
on public.workspace_settings
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace settings are manageable by admins"
on public.workspace_settings
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Workspace invites are viewable by admins" on public.workspace_invites;
drop policy if exists "Workspace invites are manageable by admins" on public.workspace_invites;
create policy "Workspace invites are viewable by admins"
on public.workspace_invites
for select
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace invites are manageable by admins"
on public.workspace_invites
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

-- Workspace credits
drop policy if exists "Workspace credits are viewable by members" on public.workspace_credits;
drop policy if exists "Workspace credits are manageable by admins" on public.workspace_credits;
create policy "Workspace credits are viewable by members"
on public.workspace_credits
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Workspace credits are manageable by admins"
on public.workspace_credits
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

-- Integrations
drop policy if exists "Integrations are viewable by members" on public.integrations;
drop policy if exists "Integrations are manageable by admins" on public.integrations;
create policy "Integrations are viewable by members"
on public.integrations
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Integrations are manageable by admins"
on public.integrations
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Integration accounts are viewable by members" on public.integration_accounts;
drop policy if exists "Integration accounts are manageable by admins" on public.integration_accounts;
create policy "Integration accounts are viewable by members"
on public.integration_accounts
for select
to authenticated
using (
  public.is_workspace_member(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);
create policy "Integration accounts are manageable by admins"
on public.integration_accounts
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

drop policy if exists "Integration tokens are viewable by admins" on public.integration_tokens;
drop policy if exists "Integration tokens are manageable by admins" on public.integration_tokens;
create policy "Integration tokens are viewable by admins"
on public.integration_tokens
for select
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);
create policy "Integration tokens are manageable by admins"
on public.integration_tokens
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

drop policy if exists "Webhook events are viewable by admins" on public.webhook_events;
drop policy if exists "Webhook events are manageable by admins" on public.webhook_events;
create policy "Webhook events are viewable by admins"
on public.webhook_events
for select
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);
create policy "Webhook events are manageable by admins"
on public.webhook_events
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.integrations where id = integration_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.integrations where id = integration_id)
  )
);

-- Calendar
drop policy if exists "Calendar integrations are viewable by owner" on public.calendar_integrations;
drop policy if exists "Calendar events are viewable by owner" on public.calendar_events;
create policy "Calendar integrations are viewable by owner"
on public.calendar_integrations
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
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
      and public.is_workspace_not_expired(ci.workspace_id)
  )
);

-- Agents
drop policy if exists "Agents are viewable by admins" on public.agents;
drop policy if exists "Agents are manageable by admins" on public.agents;
create policy "Agents are viewable by admins"
on public.agents
for select
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);
create policy "Agents are manageable by admins"
on public.agents
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent permissions are manageable by admins" on public.agent_permissions;
create policy "Agent permissions are manageable by admins"
on public.agent_permissions
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

drop policy if exists "Agent followups are manageable by admins" on public.agent_followups;
create policy "Agent followups are manageable by admins"
on public.agent_followups
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

drop policy if exists "Agent calendar links are manageable by admins" on public.agent_calendar_links;
create policy "Agent calendar links are manageable by admins"
on public.agent_calendar_links
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

drop policy if exists "Agent knowledge files are manageable by admins" on public.agent_knowledge_files;
create policy "Agent knowledge files are manageable by admins"
on public.agent_knowledge_files
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent knowledge chunks are manageable by admins" on public.agent_knowledge_chunks;
create policy "Agent knowledge chunks are manageable by admins"
on public.agent_knowledge_chunks
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

drop policy if exists "Agent conversation state is manageable by admins" on public.agent_conversation_state;
create policy "Agent conversation state is manageable by admins"
on public.agent_conversation_state
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent runs are manageable by admins" on public.agent_runs;
create policy "Agent runs are manageable by admins"
on public.agent_runs
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent logs are manageable by admins" on public.agent_logs;
create policy "Agent logs are manageable by admins"
on public.agent_logs
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent metrics are manageable by admins" on public.agent_metrics_daily;
create policy "Agent metrics are manageable by admins"
on public.agent_metrics_daily
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

drop policy if exists "Agent consents are manageable by admins" on public.agent_consents;
create policy "Agent consents are manageable by admins"
on public.agent_consents
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

drop policy if exists "Agent credit events are manageable by admins" on public.agent_credit_events;
create policy "Agent credit events are manageable by admins"
on public.agent_credit_events
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_not_expired(workspace_id)
);

-- Agent conversation chunks
drop policy if exists "Agent conversation chunks are viewable by admins" on public.agent_conversation_chunks;
drop policy if exists "Agent conversation chunks are manageable by admins" on public.agent_conversation_chunks;
create policy "Agent conversation chunks are viewable by admins"
on public.agent_conversation_chunks
for select
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);
create policy "Agent conversation chunks are manageable by admins"
on public.agent_conversation_chunks
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.agents where id = agent_id)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents where id = agent_id)
  )
);

-- Storage buckets
drop policy if exists "Inbox attachments are viewable by members" on storage.objects;
drop policy if exists "Inbox attachments are manageable by members" on storage.objects;
create policy "Inbox attachments are viewable by members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inbox-attachments'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);
create policy "Inbox attachments are manageable by members"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'inbox-attachments'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
)
with check (
  bucket_id = 'inbox-attachments'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);

drop policy if exists "Contact avatars are viewable" on storage.objects;
drop policy if exists "Contact avatars are manageable" on storage.objects;
create policy "Contact avatars are viewable"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'contact-avatars'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);
create policy "Contact avatars are manageable"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'contact-avatars'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
)
with check (
  bucket_id = 'contact-avatars'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);

drop policy if exists "Contact files are viewable" on storage.objects;
drop policy if exists "Contact files are manageable" on storage.objects;
create policy "Contact files are viewable"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'contact-files'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);
create policy "Contact files are manageable"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'contact-files'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
)
with check (
  bucket_id = 'contact-files'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
  and public.is_workspace_active(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);

drop policy if exists "Agent knowledge objects are manageable by admins" on storage.objects;
create policy "Agent knowledge objects are manageable by admins"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'agent-knowledge'
  and public.is_workspace_admin(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
)
with check (
  bucket_id = 'agent-knowledge'
  and public.is_workspace_admin(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
  and public.is_workspace_not_expired(
    (select workspace_id from public.agents
      where id = nullif((storage.foldername(name))[1], '')::uuid)
  )
);
