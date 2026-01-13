-- Track onboarding progress at workspace level

alter table public.workspace_settings
  add column if not exists onboarding_concluido boolean not null default false,
  add column if not exists onboarding_etapas jsonb not null default '[]'::jsonb,
  add column if not exists onboarding_pulado boolean not null default false;
