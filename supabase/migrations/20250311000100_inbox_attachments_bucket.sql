-- Inbox attachments storage bucket + policies

insert into storage.buckets (id, name, public)
values ('inbox-attachments', 'inbox-attachments', false)
on conflict (id) do update set public = excluded.public;

create policy "Inbox attachments are viewable by members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inbox-attachments'
  and public.is_workspace_member(
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
)
with check (
  bucket_id = 'inbox-attachments'
  and public.is_workspace_member(
    nullif((storage.foldername(name))[1], '')::uuid
  )
);
