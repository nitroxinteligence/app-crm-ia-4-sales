-- Support invites during signup (no new workspace)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  new_workspace_id uuid;
  invite_token text;
  invite_record record;
begin
  invite_token := nullif(new.raw_user_meta_data->>'invite_token', '');

  if invite_token is not null then
    select id, workspace_id, role, email, status, expires_at
      into invite_record
    from public.workspace_invites
    where token = invite_token
      and status = 'pendente'
      and (expires_at is null or expires_at > now())
    limit 1;

    if invite_record.id is null then
      raise exception 'Invalid invite token';
    end if;

    if lower(invite_record.email) <> lower(new.email) then
      raise exception 'Invite email mismatch';
    end if;

    insert into public.profiles (user_id, nome, email, avatar_url, idioma)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.email,
      new.raw_user_meta_data->>'avatar_url',
      'pt-BR'
    )
    on conflict (user_id)
    do update set
      nome = excluded.nome,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      idioma = excluded.idioma;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (invite_record.workspace_id, new.id, invite_record.role)
    on conflict (workspace_id, user_id)
    do update set role = excluded.role;

    update public.workspace_invites
    set status = 'aceito'
    where id = invite_record.id;

    return new;
  end if;

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
