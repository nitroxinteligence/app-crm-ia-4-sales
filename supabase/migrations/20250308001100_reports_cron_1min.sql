-- Reports: refresh a cada 1 minuto + expor estado de refresh

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    if exists (select 1 from cron.job where jobname = 'refresh_report_views') then
      update cron.job
      set schedule = '* * * * *',
          command = 'select public.refresh_report_views();'
      where jobname = 'refresh_report_views';
    else
      perform cron.schedule(
        'refresh_report_views',
        '* * * * *',
        'select public.refresh_report_views();'
      );
    end if;
  end if;
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'report_refresh_state'
  ) then
    grant select on public.report_refresh_state to authenticated;
  end if;
end;
$$;
