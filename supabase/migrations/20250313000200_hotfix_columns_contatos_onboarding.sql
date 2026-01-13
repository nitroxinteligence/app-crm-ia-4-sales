-- Hotfix: ensure required columns exist for contacts + onboarding

alter table public.contacts
  add column if not exists empresa text,
  add column if not exists avatar_url text;

alter table public.workspace_settings
  add column if not exists onboarding_concluido boolean not null default false,
  add column if not exists onboarding_etapas jsonb not null default '[]'::jsonb,
  add column if not exists onboarding_pulado boolean not null default false;

do $$
begin
  if to_regclass('public.companies') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'contacts'
        and column_name = 'company_id'
    ) then
      update public.contacts as c
      set empresa = coalesce(c.empresa, comp.nome)
      from public.companies as comp
      where c.company_id = comp.id;
    end if;
  end if;
end $$;
