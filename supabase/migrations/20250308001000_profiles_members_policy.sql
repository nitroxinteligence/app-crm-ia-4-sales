-- Allow workspace members to view profiles of peers

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles are viewable by workspace members'
  ) then
    create policy "Profiles are viewable by workspace members"
    on public.profiles
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.workspace_members wm
        where wm.user_id = profiles.user_id
          and wm.workspace_id in (
            select workspace_id
            from public.workspace_members
            where user_id = auth.uid()
          )
      )
    );
  end if;
end $$;
