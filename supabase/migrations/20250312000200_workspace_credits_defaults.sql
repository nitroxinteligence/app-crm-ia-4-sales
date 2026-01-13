-- Align workspace credits defaults with plan tiers

alter table public.workspace_credits
  alter column credits_total set default 0;

update public.workspace_credits as wc
set credits_total = case
  when w.plano::text = 'Premium' then 30000
  when w.plano::text = 'Pro' then 10000
  else 0
end
from public.workspaces as w
where wc.workspace_id = w.id
  and wc.credits_total = 1000;
