-- Enforce active workspace (plan selected + trial not expired) for core app data

create or replace function public.is_workspace_active(check_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces
    where id = check_workspace_id
      and plano_selected_at is not null
      and (trial_ends_at is null or trial_ends_at >= now())
  );
$$;

-- CRM base
drop policy if exists "Contacts are viewable by members" on public.contacts;
drop policy if exists "Contacts are manageable by members" on public.contacts;
create policy "Contacts are viewable by members"
on public.contacts
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Contacts are manageable by members"
on public.contacts
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

drop policy if exists "Tags are viewable by members" on public.tags;
drop policy if exists "Tags are manageable by members" on public.tags;
create policy "Tags are viewable by members"
on public.tags
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Tags are manageable by members"
on public.tags
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

drop policy if exists "Lead tags are viewable by members" on public.lead_tags;
drop policy if exists "Lead tags are manageable by members" on public.lead_tags;
create policy "Lead tags are viewable by members"
on public.lead_tags
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Lead tags are manageable by members"
on public.lead_tags
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

drop policy if exists "Contact tags are viewable by members" on public.contact_tags;
drop policy if exists "Contact tags are manageable by members" on public.contact_tags;
create policy "Contact tags are viewable by members"
on public.contact_tags
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Contact tags are manageable by members"
on public.contact_tags
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

drop policy if exists "Lead custom fields are viewable by members" on public.custom_fields_lead;
drop policy if exists "Lead custom fields are manageable by admins" on public.custom_fields_lead;
create policy "Lead custom fields are viewable by members"
on public.custom_fields_lead
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Lead custom fields are manageable by admins"
on public.custom_fields_lead
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_active(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_active(workspace_id)
);

drop policy if exists "Lead custom field values are viewable by members" on public.custom_field_values_lead;
drop policy if exists "Lead custom field values are manageable by members" on public.custom_field_values_lead;
create policy "Lead custom field values are viewable by members"
on public.custom_field_values_lead
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Lead custom field values are manageable by members"
on public.custom_field_values_lead
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

-- Inbox core
drop policy if exists "Leads are viewable by members" on public.leads;
drop policy if exists "Leads are manageable by members" on public.leads;
create policy "Leads are viewable by members"
on public.leads
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Leads are manageable by members"
on public.leads
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

drop policy if exists "Conversations are viewable by members" on public.conversations;
drop policy if exists "Conversations are manageable by members" on public.conversations;
create policy "Conversations are viewable by members"
on public.conversations
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Conversations are manageable by members"
on public.conversations
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

drop policy if exists "Messages are viewable by members" on public.messages;
drop policy if exists "Messages are manageable by members" on public.messages;
create policy "Messages are viewable by members"
on public.messages
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Messages are manageable by members"
on public.messages
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

drop policy if exists "Attachments are viewable by members" on public.attachments;
drop policy if exists "Attachments are manageable by members" on public.attachments;
create policy "Attachments are viewable by members"
on public.attachments
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Attachments are manageable by members"
on public.attachments
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

drop policy if exists "Quick replies are viewable by members" on public.quick_replies;
drop policy if exists "Quick replies are manageable by members" on public.quick_replies;
create policy "Quick replies are viewable by members"
on public.quick_replies
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Quick replies are manageable by members"
on public.quick_replies
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

drop policy if exists "WhatsApp templates are viewable by members" on public.whatsapp_templates;
drop policy if exists "WhatsApp templates are manageable by members" on public.whatsapp_templates;
create policy "WhatsApp templates are viewable by members"
on public.whatsapp_templates
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "WhatsApp templates are manageable by members"
on public.whatsapp_templates
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

-- Pipelines
drop policy if exists "Pipelines are viewable by members" on public.pipelines;
drop policy if exists "Pipelines are manageable by admins" on public.pipelines;
create policy "Pipelines are viewable by members"
on public.pipelines
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Pipelines are manageable by admins"
on public.pipelines
for all
to authenticated
using (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_active(workspace_id)
)
with check (
  public.is_workspace_admin(workspace_id)
  and public.is_workspace_active(workspace_id)
);

drop policy if exists "Pipeline stages are viewable by members" on public.pipeline_stages;
drop policy if exists "Pipeline stages are manageable by admins" on public.pipeline_stages;
create policy "Pipeline stages are viewable by members"
on public.pipeline_stages
for select
to authenticated
using (
  public.is_workspace_member(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
  and public.is_workspace_active(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
);
create policy "Pipeline stages are manageable by admins"
on public.pipeline_stages
for all
to authenticated
using (
  public.is_workspace_admin(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
  and public.is_workspace_active(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
)
with check (
  public.is_workspace_admin(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
  and public.is_workspace_active(
    (select workspace_id from public.pipelines where id = pipeline_id)
  )
);

-- Contact notes/files/audit
drop policy if exists "Contact notes are viewable by members" on public.contact_notes;
drop policy if exists "Contact notes are manageable by members" on public.contact_notes;
create policy "Contact notes are viewable by members"
on public.contact_notes
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Contact notes are manageable by members"
on public.contact_notes
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

drop policy if exists "Contact files are viewable by members" on public.contact_files;
drop policy if exists "Contact files are manageable by members" on public.contact_files;
create policy "Contact files are viewable by members"
on public.contact_files
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Contact files are manageable by members"
on public.contact_files
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

drop policy if exists "Contact audit is viewable by members" on public.contact_audit;
drop policy if exists "Contact audit is manageable by members" on public.contact_audit;
create policy "Contact audit is viewable by members"
on public.contact_audit
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Contact audit is manageable by members"
on public.contact_audit
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

-- Deals and custom fields (deal)
drop policy if exists "Deals are viewable by members" on public.deals;
drop policy if exists "Deals are manageable by members" on public.deals;
create policy "Deals are viewable by members"
on public.deals
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Deals are manageable by members"
on public.deals
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

drop policy if exists "Deal custom values are viewable by members" on public.custom_field_values_deal;
drop policy if exists "Deal custom values are manageable by members" on public.custom_field_values_deal;
create policy "Deal custom values are viewable by members"
on public.custom_field_values_deal
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Deal custom values are manageable by members"
on public.custom_field_values_deal
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

drop policy if exists "Deal custom fields are viewable by members" on public.custom_fields_deal;
drop policy if exists "Deal custom fields are manageable by members" on public.custom_fields_deal;
create policy "Deal custom fields are viewable by members"
on public.custom_fields_deal
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Deal custom fields are manageable by members"
on public.custom_fields_deal
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

-- Tasks
drop policy if exists "Tasks are viewable by owner" on public.tasks;
drop policy if exists "Tasks are manageable by owner" on public.tasks;
create policy "Tasks are viewable by owner"
on public.tasks
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
create policy "Tasks are manageable by owner"
on public.tasks
for all
to authenticated
using (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
)
with check (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);

drop policy if exists "Task relations are viewable by owner" on public.task_relations;
drop policy if exists "Task relations are manageable by owner" on public.task_relations;
create policy "Task relations are viewable by owner"
on public.task_relations
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
      and public.is_workspace_active(t.workspace_id)
  )
);
create policy "Task relations are manageable by owner"
on public.task_relations
for all
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
      and public.is_workspace_active(t.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
      and public.is_workspace_active(t.workspace_id)
  )
);

-- Events
drop policy if exists "Events are viewable by members" on public.events;
create policy "Events are viewable by members"
on public.events
for select
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and public.is_workspace_active(workspace_id)
);
