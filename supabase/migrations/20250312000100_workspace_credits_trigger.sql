-- Ensure workspace credits are created with each workspace

create or replace function public.create_workspace_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  credits_total integer;
  start_date date;
  end_date date;
begin
  start_date := date_trunc('month', now())::date;
  end_date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;

  credits_total := case
    when new.plano::text = 'Premium' then 30000
    when new.plano::text = 'Pro' then 10000
    else 0
  end;

  insert into public.workspace_credits (
    workspace_id,
    credits_total,
    credits_used,
    period_start,
    period_end
  )
  values (new.id, credits_total, 0, start_date, end_date)
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_workspaces_create_credits on public.workspaces;
create trigger on_workspaces_create_credits
after insert on public.workspaces
for each row execute function public.create_workspace_credits();

insert into public.workspace_credits (
  workspace_id,
  credits_total,
  credits_used,
  period_start,
  period_end
)
select
  workspaces.id,
  case
    when workspaces.plano::text = 'Premium' then 30000
    when workspaces.plano::text = 'Pro' then 10000
    else 0
  end,
  0,
  date_trunc('month', now())::date,
  (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date
from public.workspaces
left join public.workspace_credits
  on public.workspace_credits.workspace_id = workspaces.id
where public.workspace_credits.workspace_id is null;
