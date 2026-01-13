-- Seed demo data for painel/relatorios/contatos/pipeline (14 days)
do $$
declare
  v_workspace_id uuid;
  v_user_id uuid;
  v_pipeline_id uuid;
  v_stage_novo uuid;
  v_stage_qual uuid;
  v_stage_prop uuid;
  v_stage_fech uuid;
  v_tag_quente uuid;
  v_tag_vip uuid;
  v_tag_follow uuid;
  v_contact_1 uuid;
  v_contact_2 uuid;
  v_contact_3 uuid;
  v_contact_4 uuid;
  v_conv_1 uuid;
  v_conv_2 uuid;
  v_conv_3 uuid;
begin
  -- Optional: force workspace/user by uncommenting
  -- v_workspace_id := '00000000-0000-0000-0000-000000000000';
  -- v_user_id := '00000000-0000-0000-0000-000000000000';

  if v_workspace_id is null or v_user_id is null then
    select workspace_id, user_id
      into v_workspace_id, v_user_id
    from public.workspace_members
    order by created_at
    limit 1;
  end if;

  if v_workspace_id is null or v_user_id is null then
    raise exception 'workspace_members vazio. Crie um workspace e um membro primeiro.';
  end if;

  insert into public.profiles (user_id, nome, email)
  values (v_user_id, 'Usuario Demo', 'demo@vpcrm.local')
  on conflict (user_id)
  do update set nome = excluded.nome, email = excluded.email;

  insert into public.pipelines (workspace_id, nome, descricao)
  values (v_workspace_id, 'Pipeline Demo', 'Pipeline para testes')
  on conflict (workspace_id, nome)
  do update set descricao = excluded.descricao
  returning id into v_pipeline_id;

  insert into public.pipeline_stages (pipeline_id, nome, ordem, cor)
  values
    (v_pipeline_id, 'Novo Lead', 1, '#2563eb'),
    (v_pipeline_id, 'Qualificado', 2, '#0ea5e9'),
    (v_pipeline_id, 'Proposta', 3, '#16a34a'),
    (v_pipeline_id, 'Fechado', 4, '#8b5cf6')
  on conflict (pipeline_id, nome)
  do update set ordem = excluded.ordem, cor = excluded.cor;

  select id into v_stage_novo
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id and nome = 'Novo Lead'
  limit 1;

  select id into v_stage_qual
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id and nome = 'Qualificado'
  limit 1;

  select id into v_stage_prop
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id and nome = 'Proposta'
  limit 1;

  select id into v_stage_fech
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id and nome = 'Fechado'
  limit 1;

  insert into public.tags (workspace_id, nome, cor)
  values
    (v_workspace_id, 'Quente', '#ef4444'),
    (v_workspace_id, 'VIP', '#f59e0b'),
    (v_workspace_id, 'Follow-up', '#22c55e')
  on conflict (workspace_id, nome)
  do update set cor = excluded.cor;

  select id into v_tag_quente
  from public.tags
  where workspace_id = v_workspace_id and nome = 'Quente'
  limit 1;

  select id into v_tag_vip
  from public.tags
  where workspace_id = v_workspace_id and nome = 'VIP'
  limit 1;

  select id into v_tag_follow
  from public.tags
  where workspace_id = v_workspace_id and nome = 'Follow-up'
  limit 1;

  insert into public.contacts (
    workspace_id,
    nome,
    telefone,
    email,
    empresa,
    status,
    owner_id,
    pipeline_id,
    pipeline_stage_id,
    created_at,
    updated_at
  )
  values
    (
      v_workspace_id,
      'Ana Sales',
      '11999990001',
      'ana@demo.local',
      'Acme',
      'novo',
      v_user_id,
      v_pipeline_id,
      v_stage_novo,
      now() - interval '12 days',
      now() - interval '2 days'
    ),
    (
      v_workspace_id,
      'Bruno Lima',
      '11999990002',
      'bruno@demo.local',
      'Beta LLC',
      'qualificado',
      v_user_id,
      v_pipeline_id,
      v_stage_qual,
      now() - interval '10 days',
      now() - interval '1 days'
    ),
    (
      v_workspace_id,
      'Carla Martins',
      '11999990003',
      'carla@demo.local',
      'Orion',
      'em-negociacao',
      v_user_id,
      v_pipeline_id,
      v_stage_prop,
      now() - interval '8 days',
      now() - interval '1 days'
    ),
    (
      v_workspace_id,
      'Diego Santos',
      '11999990004',
      'diego@demo.local',
      'Zeta Co',
      'cliente',
      v_user_id,
      v_pipeline_id,
      v_stage_fech,
      now() - interval '20 days',
      now() - interval '5 days'
    )
  on conflict do nothing;

  select id into v_contact_1
  from public.contacts
  where workspace_id = v_workspace_id and email = 'ana@demo.local'
  limit 1;

  select id into v_contact_2
  from public.contacts
  where workspace_id = v_workspace_id and email = 'bruno@demo.local'
  limit 1;

  select id into v_contact_3
  from public.contacts
  where workspace_id = v_workspace_id and email = 'carla@demo.local'
  limit 1;

  select id into v_contact_4
  from public.contacts
  where workspace_id = v_workspace_id and email = 'diego@demo.local'
  limit 1;

  insert into public.contact_tags (workspace_id, contact_id, tag_id)
  values
    (v_workspace_id, v_contact_1, v_tag_follow),
    (v_workspace_id, v_contact_2, v_tag_quente),
    (v_workspace_id, v_contact_3, v_tag_vip)
  on conflict do nothing;

  insert into public.contact_notes (
    workspace_id,
    contact_id,
    autor_id,
    conteudo,
    created_at
  )
  values
    (
      v_workspace_id,
      v_contact_1,
      v_user_id,
      'Ligacao inicial feita.',
      now() - interval '9 days'
    ),
    (
      v_workspace_id,
      v_contact_3,
      v_user_id,
      'Enviado material comercial.',
      now() - interval '4 days'
    );

  insert into public.contact_audit (
    workspace_id,
    contact_id,
    autor_id,
    acao,
    detalhes,
    created_at
  )
  values
    (
      v_workspace_id,
      v_contact_1,
      v_user_id,
      'status_update',
      jsonb_build_object('mensagem', 'Status atualizado para novo'),
      now() - interval '10 days'
    ),
    (
      v_workspace_id,
      v_contact_2,
      v_user_id,
      'tag_added',
      jsonb_build_object('mensagem', 'Tag Quente adicionada'),
      now() - interval '6 days'
    );

  insert into public.conversations (
    workspace_id,
    contact_id,
    canal,
    status,
    owner_id,
    ultima_mensagem,
    ultima_mensagem_em,
    created_at,
    updated_at
  )
  select
    v_workspace_id,
    v_contact_1,
    'whatsapp',
    'aberta',
    v_user_id,
    'Oi, posso ajudar?',
    now() - interval '2 days',
    now() - interval '12 days',
    now() - interval '2 days'
  where not exists (
    select 1 from public.conversations
    where workspace_id = v_workspace_id
      and contact_id = v_contact_1
      and canal = 'whatsapp'
  );

  insert into public.conversations (
    workspace_id,
    contact_id,
    canal,
    status,
    owner_id,
    ultima_mensagem,
    ultima_mensagem_em,
    created_at,
    updated_at
  )
  select
    v_workspace_id,
    v_contact_2,
    'whatsapp',
    'pendente',
    v_user_id,
    'Enviei a proposta.',
    now() - interval '1 days',
    now() - interval '10 days',
    now() - interval '1 days'
  where not exists (
    select 1 from public.conversations
    where workspace_id = v_workspace_id
      and contact_id = v_contact_2
      and canal = 'whatsapp'
  );

  insert into public.conversations (
    workspace_id,
    contact_id,
    canal,
    status,
    owner_id,
    ultima_mensagem,
    ultima_mensagem_em,
    created_at,
    updated_at
  )
  select
    v_workspace_id,
    v_contact_3,
    'instagram',
    'resolvida',
    v_user_id,
    'Tudo certo, obrigado!',
    now() - interval '3 days',
    now() - interval '8 days',
    now() - interval '3 days'
  where not exists (
    select 1 from public.conversations
    where workspace_id = v_workspace_id
      and contact_id = v_contact_3
      and canal = 'instagram'
  );

  select id into v_conv_1
  from public.conversations
  where workspace_id = v_workspace_id and contact_id = v_contact_1 and canal = 'whatsapp'
  limit 1;

  select id into v_conv_2
  from public.conversations
  where workspace_id = v_workspace_id and contact_id = v_contact_2 and canal = 'whatsapp'
  limit 1;

  select id into v_conv_3
  from public.conversations
  where workspace_id = v_workspace_id and contact_id = v_contact_3 and canal = 'instagram'
  limit 1;

  insert into public.messages (
    workspace_id,
    conversation_id,
    autor,
    tipo,
    conteudo,
    interno,
    whatsapp_message_id,
    created_at
  )
  values
    (v_workspace_id, v_conv_1, 'contato', 'texto', 'Oi, quero saber mais.', false, 'seed-msg-1', now() - interval '12 days'),
    (v_workspace_id, v_conv_1, 'equipe', 'texto', 'Claro! Vamos la.', false, 'seed-msg-2', now() - interval '11 days'),
    (v_workspace_id, v_conv_2, 'equipe', 'texto', 'Enviei a proposta.', false, 'seed-msg-3', now() - interval '7 days'),
    (v_workspace_id, v_conv_3, 'contato', 'texto', 'Obrigado pelo atendimento.', false, 'seed-msg-4', now() - interval '3 days')
  on conflict do nothing;

  insert into public.leads (
    workspace_id,
    nome,
    telefone,
    email,
    whatsapp_wa_id,
    canal_origem,
    status,
    owner_id,
    created_at,
    updated_at
  )
  values
    (
      v_workspace_id,
      'Lead Alpha',
      '11999991001',
      'lead1@demo.local',
      '5511999991001@s.whatsapp.net',
      'whatsapp',
      'novo',
      v_user_id,
      now() - interval '15 days',
      now() - interval '15 days'
    ),
    (
      v_workspace_id,
      'Lead Beta',
      '11999991002',
      'lead2@demo.local',
      '5511999991002@s.whatsapp.net',
      'whatsapp',
      'novo',
      v_user_id,
      now() - interval '9 days',
      now() - interval '9 days'
    )
  on conflict do nothing;

  if v_conv_1 is not null then
    insert into public.events (
      workspace_id,
      event_type,
      entity_type,
      entity_id,
      actor_type,
      actor_id,
      canal,
      valor_num,
      payload_minimo,
      occurred_at
    )
    select
      v_workspace_id,
      'inbox.message.received',
      'conversation',
      v_conv_1,
      'contact',
      null,
      'whatsapp',
      null,
      jsonb_build_object('conversation_id', v_conv_1),
      now() - (g || ' days')::interval
    from generate_series(0, 13) g;

    insert into public.events (
      workspace_id,
      event_type,
      entity_type,
      entity_id,
      actor_type,
      actor_id,
      canal,
      valor_num,
      payload_minimo,
      occurred_at
    )
    select
      v_workspace_id,
      'inbox.message.sent',
      'conversation',
      v_conv_1,
      'user',
      v_user_id,
      'whatsapp',
      null,
      jsonb_build_object('conversation_id', v_conv_1),
      now() - (g || ' days')::interval
    from generate_series(0, 13) g
    where (g % 2) = 0;
  end if;

  if v_conv_2 is not null then
    insert into public.events (
      workspace_id,
      event_type,
      entity_type,
      entity_id,
      actor_type,
      actor_id,
      canal,
      valor_num,
      payload_minimo,
      occurred_at
    )
    select
      v_workspace_id,
      'inbox.message.internal',
      'conversation',
      v_conv_2,
      'user',
      v_user_id,
      'whatsapp',
      null,
      jsonb_build_object('conversation_id', v_conv_2),
      now() - (g || ' days')::interval
    from generate_series(0, 13) g
    where (g % 3) = 0;
  end if;

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    valor_num,
    payload_minimo,
    occurred_at
  )
  values
    (
      v_workspace_id,
      'inbox.conversation.status_changed',
      'conversation',
      v_conv_1,
      'user',
      v_user_id,
      'whatsapp',
      null,
      jsonb_build_object('to_status', 'aberta'),
      now() - interval '12 days'
    ),
    (
      v_workspace_id,
      'inbox.conversation.status_changed',
      'conversation',
      v_conv_2,
      'user',
      v_user_id,
      'whatsapp',
      null,
      jsonb_build_object('to_status', 'pendente'),
      now() - interval '6 days'
    ),
    (
      v_workspace_id,
      'inbox.conversation.status_changed',
      'conversation',
      v_conv_3,
      'user',
      v_user_id,
      'instagram',
      null,
      jsonb_build_object('to_status', 'resolvida'),
      now() - interval '3 days'
    );

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    valor_num,
    payload_minimo,
    occurred_at
  )
  select
    v_workspace_id,
    'pipeline.stage.changed',
    'contact',
    v_contact_1,
    'user',
    v_user_id,
    'whatsapp',
    null,
    jsonb_build_object(
      'pipeline_id',
      v_pipeline_id,
      'to_stage_id',
      case when (g % 2) = 0 then v_stage_qual else v_stage_prop end
    ),
    now() - (g || ' days')::interval
  from generate_series(0, 13) g;

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    valor_num,
    payload_minimo,
    occurred_at
  )
  select
    v_workspace_id,
    'crm.lead.created',
    'lead',
    gen_random_uuid(),
    'user',
    v_user_id,
    'whatsapp',
    null,
    jsonb_build_object('status', 'novo'),
    now() - (g || ' days')::interval
  from generate_series(0, 13) g;

  insert into public.events (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_id,
    canal,
    valor_num,
    payload_minimo,
    occurred_at
  )
  select
    v_workspace_id,
    'crm.lead.converted',
    'lead',
    gen_random_uuid(),
    'user',
    v_user_id,
    'whatsapp',
    null,
    jsonb_build_object('contact_id', v_contact_2),
    now() - (g || ' days')::interval
  from generate_series(2, 13) g
  where (g % 2) = 0;

  perform public.refresh_report_views();
end $$;
