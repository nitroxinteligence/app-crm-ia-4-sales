-- Ensure integration accounts changes are streamed via Supabase Realtime

do $$
begin
  begin
    alter publication supabase_realtime add table public.integration_accounts;
  exception
    when duplicate_object then null;
  end;
end $$;
