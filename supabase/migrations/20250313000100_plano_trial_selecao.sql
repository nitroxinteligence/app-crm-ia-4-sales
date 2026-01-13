-- Plan selection + 30-day trial fields

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_period') then
    create type public.plan_period as enum ('mensal', 'semestral', 'anual');
  end if;
end $$;

alter table public.workspaces
  add column if not exists plano_periodo public.plan_period,
  add column if not exists plano_selected_at timestamptz,
  add column if not exists trial_started_at timestamptz;

update public.workspaces
set
  plano_periodo = coalesce(plano_periodo, 'mensal'::public.plan_period),
  plano_selected_at = coalesce(plano_selected_at, now()),
  trial_started_at = coalesce(trial_started_at, now()),
  trial_ends_at = coalesce(trial_ends_at, now() + interval '30 days')
where plano_selected_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  new_workspace_id uuid;
begin
  workspace_name := coalesce(
    new.raw_user_meta_data->>'workspace_name',
    new.raw_user_meta_data->>'company_name',
    split_part(new.email, '@', 1) || ' Workspace'
  );

  insert into public.workspaces (nome, owner_id, plano)
  values (workspace_name, new.id, 'Essential')
  returning id into new_workspace_id;

  insert into public.profiles (user_id, nome, email, avatar_url, idioma)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'pt-BR'
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'ADMIN');

  insert into public.workspace_settings (workspace_id)
  values (new_workspace_id)
  on conflict do nothing;

  return new;
end;
$$;
