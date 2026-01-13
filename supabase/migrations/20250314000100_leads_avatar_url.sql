-- Add avatar_url to leads for inbox contact avatars

alter table public.leads
  add column if not exists avatar_url text;
