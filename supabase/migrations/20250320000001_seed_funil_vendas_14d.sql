-- Seed demo data aligned to "Funil de vendas" with 14 days of history
do $$
declare
  v_workspace_id uuid;
  v_user_id uuid;
  v_pipeline_id uuid;
  v_stage_count integer := 0;
  v_stage_novo uuid;
  v_stage_qual uuid;
  v_stage_prop uuid;
  v_stage_fech uuid;
  v_tag_quente uuid;
  v_tag_vip uuid;
  v_tag_follow uuid;
  v_total_contatos integer := 120;
  v_total_leads integer := 300;
  v_first_names text[] := ARRAY[
    'Ana', 'Bruno', 'Carla', 'Diego', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena',
    'Igor', 'Julia', 'Karla', 'Leandro', 'Marina', 'Nicolas', 'Otavio', 'Paula',
    'Rafael', 'Sabrina', 'Thiago', 'Vanessa', 'Wagner', 'Yasmin', 'Luana', 'Renato'
  ];
  v_last_names text[] := ARRAY[
    'Silva', 'Souza', 'Oliveira', 'Lima', 'Almeida', 'Gomes', 'Ribeiro', 'Carvalho',
    'Martins', 'Rocha', 'Pereira', 'Costa', 'Fernandes', 'Barbosa', 'Dias', 'Teixeira',
    'Moraes', 'Cardoso', 'Nascimento', 'Araujo', 'Freitas', 'Mendes', 'Lopes', 'Vieira'
  ];
  v_companies text[] := ARRAY[
    'Acme', 'Orion', 'NovaTech', 'Vitta', 'AlfaPay', 'BluePeak', 'NuvemSul', 'NorteLabs',
    'Solara', 'PrimeLog', 'Atlas', 'Vetor', 'Pulsar', 'Rhea', 'Sierra', 'Cobalt',
    'Pine', 'Zephyr', 'Aurora', 'Tria'
  ];
  v_domains text[] := ARRAY[
    'acme.com', 'orion.com.br', 'novatech.com.br', 'vitta.com', 'alfapay.com', 'bluepeak.io',
    'nuvemsul.com.br', 'nortelabs.ai', 'solara.com', 'primelog.com.br', 'atlas.com',
    'vetor.com.br', 'pulsar.ai', 'rhea.com', 'sierra.com.br', 'cobalt.io',
    'pine.com.br', 'zephyr.ai', 'aurora.com', 'tria.com.br'
  ];
  v_ddds text[] := ARRAY['11', '21', '31', '41', '51', '61', '71', '81'];
  v_in_messages text[] := ARRAY[
    'Oi, tudo bem? Vi o anuncio e queria saber os planos.',
    'Pode me enviar os valores e prazos?',
    'Qual o melhor horario para falar?',
    'Estou comparando fornecedores. Voces tem cases?',
    'Preciso de uma proposta para esta semana.',
    'Consegue ajustar o pacote para nosso time?'
  ];
  v_out_messages text[] := ARRAY[
    'Claro! Segue um resumo do plano e valores.',
    'Posso te enviar a proposta por email ainda hoje.',
    'Vamos agendar uma call rapida para entender o contexto?',
    'Temos cases no seu segmento, envio em seguida.',
    'Consigo ajustar o pacote conforme o volume.',
    'Obrigado! Assim que validar internamente, retorno.'
  ];
  v_internal_messages text[] := ARRAY[
    'Contato pediu desconto, avaliar com financeiro.',
    'Priorizar retorno ate sexta.',
    'Lead quente, preparar proposta completa.',
    'Agendar demo com time tecnico.'
  ];
begin
  select workspace_id, user_id
    into v_workspace_id, v_user_id
  from public.workspace_members
  order by created_at
  limit 1;

  if v_workspace_id is null or v_user_id is null then
    raise exception 'workspace_members vazio. Crie um workspace e um membro primeiro.';
  end if;

  insert into public.profiles (user_id, nome, email)
  values (v_user_id, 'Usuario Demo', 'demo@vpcrm.local')
  on conflict (user_id)
  do update set nome = excluded.nome, email = excluded.email;

  insert into public.pipelines (workspace_id, nome, descricao)
  values (v_workspace_id, 'Funil de vendas', 'Pipeline padrão')
  on conflict (workspace_id, nome)
  do update set descricao = excluded.descricao
  returning id into v_pipeline_id;

  select count(*)
    into v_stage_count
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id;

  if v_stage_count = 0 then
    insert into public.pipeline_stages (pipeline_id, nome, ordem, cor)
    values
      (v_pipeline_id, 'Novo Lead', 1, '#2563eb'),
      (v_pipeline_id, 'Qualificado', 2, '#0ea5e9'),
      (v_pipeline_id, 'Proposta', 3, '#16a34a'),
      (v_pipeline_id, 'Fechado', 4, '#8b5cf6');
  end if;

  select id into v_stage_novo
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id
  order by ordem
  limit 1;

  select id into v_stage_qual
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id
  order by ordem
  offset 1
  limit 1;

  select id into v_stage_prop
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id
  order by ordem
  offset 2
  limit 1;

  select id into v_stage_fech
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id
  order by ordem
  offset 3
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

  update public.contacts
  set pipeline_id = v_pipeline_id,
      pipeline_stage_id = coalesce(pipeline_stage_id, v_stage_novo)
  where workspace_id = v_workspace_id
    and email like '%+seed%@%';

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
  select
    v_workspace_id,
    dados.nome,
    contato.telefone,
    contato.email,
    dados.empresa,
    dados.status,
    v_user_id,
    v_pipeline_id,
    dados.stage_id,
    dados.criado_em,
    dados.atualizado_em
  from generate_series(1, v_total_contatos) g
  cross join lateral (
    select
      case
        when (g % 5) = 0 then
          v_first_names[(g % array_length(v_first_names, 1)) + 1] || ' ' ||
          v_last_names[((g + 3) % array_length(v_last_names, 1)) + 1] || ' ' ||
          v_last_names[((g + 7) % array_length(v_last_names, 1)) + 1]
        else
          v_first_names[(g % array_length(v_first_names, 1)) + 1] || ' ' ||
          v_last_names[((g + 3) % array_length(v_last_names, 1)) + 1]
      end as nome,
      v_companies[(g % array_length(v_companies, 1)) + 1] as empresa,
      v_domains[(g % array_length(v_domains, 1)) + 1] as dominio,
      v_ddds[(g % array_length(v_ddds, 1)) + 1] as ddd,
      case
        when (g % 4) = 0 then 'novo'
        when (g % 4) = 1 then 'qualificado'
        when (g % 4) = 2 then 'em-negociacao'
        else 'cliente'
      end::public.contact_status as status,
      case
        when (g % 4) = 0 then v_stage_novo
        when (g % 4) = 1 then v_stage_qual
        when (g % 4) = 2 then v_stage_prop
        else v_stage_fech
      end as stage_id,
      now() - ((g % 14) || ' days')::interval as criado_em,
      now() - ((g % 7) || ' days')::interval as atualizado_em
  ) dados
  cross join lateral (
    select
      lower(replace(dados.nome, ' ', '.')) || '+seed' || lpad(g::text, 3, '0') || '@' || dados.dominio as email,
      dados.ddd || '9' || lpad(((70000000 + g) % 100000000)::text, 8, '0') as telefone
  ) contato
  on conflict (workspace_id, email)
  do update set
    telefone = excluded.telefone,
    empresa = excluded.empresa,
    status = excluded.status,
    owner_id = excluded.owner_id,
    pipeline_id = excluded.pipeline_id,
    pipeline_stage_id = excluded.pipeline_stage_id,
    updated_at = excluded.updated_at;

  with demo_contacts as (
    select
      id,
      cast(nullif(regexp_replace(email, '[^0-9]', '', 'g'), '') as integer) as idx
    from public.contacts
    where workspace_id = v_workspace_id
      and email like '%+seed%@%'
  )
  insert into public.contact_tags (workspace_id, contact_id, tag_id)
  select
    v_workspace_id,
    dc.id,
    case
      when (dc.idx % 3) = 0 then v_tag_quente
      when (dc.idx % 3) = 1 then v_tag_vip
      else v_tag_follow
    end
  from demo_contacts dc
  on conflict do nothing;

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
    c.id,
    'whatsapp',
    case
      when (c_idx % 4) = 0 then 'aberta'
      when (c_idx % 4) = 1 then 'pendente'
      when (c_idx % 4) = 2 then 'resolvida'
      else 'aberta'
    end::public.conversation_status,
    v_user_id,
    v_out_messages[((c_idx) % array_length(v_out_messages, 1)) + 1],
    now() - ((c_idx % 7) || ' days')::interval,
    now() - ((c_idx % 14) || ' days')::interval,
    now() - ((c_idx % 7) || ' days')::interval
  from (
    select
      id,
      cast(nullif(regexp_replace(email, '[^0-9]', '', 'g'), '') as integer) as c_idx
    from public.contacts
    where workspace_id = v_workspace_id
      and email like '%+seed%@%'
  ) c
  where not exists (
    select 1
    from public.conversations conv
    where conv.workspace_id = v_workspace_id
      and conv.contact_id = c.id
      and conv.canal = 'whatsapp'
  );

  with convs as (
    select
      conv.id,
      cast(nullif(regexp_replace(ct.email, '[^0-9]', '', 'g'), '') as integer) as c_idx
    from public.conversations conv
    join public.contacts ct on ct.id = conv.contact_id
    where conv.workspace_id = v_workspace_id
      and ct.email like '%+seed%@%'
    limit 80
  )
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
  select
    v_workspace_id,
    convs.id,
    case when (m % 2) = 1 then 'contato' else 'equipe' end::public.message_author,
    'texto'::public.message_type,
    case
      when (m % 2) = 1 then
        v_in_messages[((convs.c_idx + m) % array_length(v_in_messages, 1)) + 1]
      else
        v_out_messages[((convs.c_idx + m) % array_length(v_out_messages, 1)) + 1]
    end,
    false,
    null,
    now() - ((convs.c_idx % 14) || ' days')::interval + ((m - 1) || ' hours')::interval
  from convs
  cross join generate_series(1, 3) m;

  with convs as (
    select
      conv.id,
      cast(nullif(regexp_replace(ct.email, '[^0-9]', '', 'g'), '') as integer) as c_idx
    from public.conversations conv
    join public.contacts ct on ct.id = conv.contact_id
    where conv.workspace_id = v_workspace_id
      and ct.email like '%+seed%@%'
    limit 20
  )
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
  select
    v_workspace_id,
    convs.id,
    'equipe'::public.message_author,
    'texto'::public.message_type,
    v_internal_messages[((convs.c_idx) % array_length(v_internal_messages, 1)) + 1],
    true,
    null,
    now() - ((convs.c_idx % 14) || ' days')::interval + interval '30 minutes'
  from convs;

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
  select
    v_workspace_id,
    v_first_names[(g % array_length(v_first_names, 1)) + 1] || ' ' ||
    v_last_names[((g + 9) % array_length(v_last_names, 1)) + 1],
    v_ddds[(g % array_length(v_ddds, 1)) + 1] ||
      '9' || lpad(((80000000 + g) % 100000000)::text, 8, '0'),
    lower(
      replace(
        v_first_names[(g % array_length(v_first_names, 1)) + 1] || '.' ||
        v_last_names[((g + 5) % array_length(v_last_names, 1)) + 1],
        ' ',
        '.'
      )
    ) || '+seed' || lpad(g::text, 3, '0') || '@' ||
    v_domains[(g % array_length(v_domains, 1)) + 1],
    '55' || v_ddds[(g % array_length(v_ddds, 1)) + 1] ||
      '9' || lpad(((80000000 + g) % 100000000)::text, 8, '0') || '@s.whatsapp.net',
    'whatsapp',
    'novo',
    v_user_id,
    now() - ((g % 14) || ' days')::interval,
    now() - ((g % 14) || ' days')::interval
  from generate_series(1, v_total_leads) g
  on conflict do nothing;


  with convs as (
    select conv.id
    from public.conversations conv
    join public.contacts ct on ct.id = conv.contact_id
    where conv.workspace_id = v_workspace_id
      and ct.email like '%+seed%@%'
    limit 40
  )
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
    'inbox.conversation.status_changed',
    'conversation',
    convs.id,
    'user',
    v_user_id,
    'whatsapp',
    null,
    jsonb_build_object(
      'to_status',
      case
        when (g % 4) = 0 then 'aberta'
        when (g % 4) = 1 then 'pendente'
        when (g % 4) = 2 then 'resolvida'
        else 'spam'
      end
    ),
    now() - (g || ' days')::interval
  from convs
  cross join generate_series(0, 13) g
  where (g % 5) = 0;

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
    c.id,
    'user',
    v_user_id,
    'whatsapp',
    null,
    jsonb_build_object(
      'pipeline_id',
      v_pipeline_id,
      'to_stage_id',
      case
        when (c_idx % 4) = 0 then v_stage_novo
        when (c_idx % 4) = 1 then v_stage_qual
        when (c_idx % 4) = 2 then v_stage_prop
        else v_stage_fech
      end
    ),
    now() - (g || ' days')::interval
  from (
    select
      id,
      cast(nullif(regexp_replace(email, '[^0-9]', '', 'g'), '') as integer) as c_idx
    from public.contacts
    where workspace_id = v_workspace_id
      and email like '%+seed%@%'
  ) c
  cross join generate_series(0, 13) g
  where (c_idx + g) % 4 = 0;

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
    jsonb_build_object('contact_id', c.id),
    now() - (g || ' days')::interval
  from (
    select id
    from public.contacts
    where workspace_id = v_workspace_id
      and email like '%+seed%@%'
    limit 20
  ) c
  cross join generate_series(0, 13) g
  where (g % 2) = 0;

  perform public.refresh_report_views();
end $$;
