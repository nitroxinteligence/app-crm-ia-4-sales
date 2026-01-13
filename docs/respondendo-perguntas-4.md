  Objetivo e sucesso

  - O que “mais aperfeiçoado possível” significa pra você (qualidade de resposta, autonomia, custo,
    velocidade, segurança)?
Qualidade nas interações com os leads na conversa, humanizado, realmente se expressando como um humano, conversando como um humano, etc... Custo benefício (utilizar o gpt-4.1-mini como padrao e gemini 2.5-flash como fallback). Ter um bom contexto a conversa (Aqui vamos utilizar a API do supermemory para armazenar e recuperar o contexto da conversa e RAG semantico TAMBÉM com com supabase + redis) Follow-up com templates de mensagens aprovados pela META (iremos usar API OFICIAL DO WHATSAPP) No caso quando o usuário integrar um canal do whatsapp, já irá servir como um numero de telefone para o Agente, na página do Agente o usuário poderá selecionar qual numero de telefone irá querer de acordo com a conta que ele integrou do whatsapp api oficial, integrado com o google calendar do usuário que está na pagina /calendario e também utilizar BEM o CRM na pagina /pipeline, movimentar cards dos leads, atribuir tags, atribuir campos adicionais, atribuir informaçoes do deal/negócio, e etc... E também TODOS os agentes precisam interpretar: áudios, imagens, videos e documentos de forma extremamente humanizada.
  - Quais KPIs definem sucesso? (ex: FRT, taxa de resolução, conversão de lead, CSAT, custo por conversa)
Taxa de resoluçao, conversao do lead, CSAT, etc...
  - Quais casos de uso são MUST-have na primeira versão de agentes?
Acredito que fazer um bom follow-up + ter uma conversa bem fluida com o usuário é essencial para o sucesso do agente e mais humanizado possivel seguindo a risca todo o prompt, executando todas as tools necessárias, etc.

Escopo funcional dos agentes

  - Quais habilidades entram no MVP: responder mensagens, resumir conversas, extrair dados, classificar, intenção, criar tarefas/deals, mover etapas?
Todas, mas nao precisa criar tarefas, isso é para o usuário fazer.
  - O agente deve operar só no Inbox ou também em Pipeline/Leads/Relatórios?
Pipeline/Leads/Relatórios/Inbox
  - O Copiloto global (topbar) entra já com o backend real?
Qual é este copiloto global? Eu nao estou vendo isso
  - O “Testar agente” no editor deve usar o backend real desde o início?
Sim!

  Canais e gatilhos

  - Quais canais entram na primeira entrega do agente: 1) só WhatsApp 2) WhatsApp + IG 3) WhatsApp + IG + Messenger?
Apenas whatsApp por enquanto.
  - O gatilho principal é nova mensagem recebida? Existem outros gatilhos (status, tags, horário,
    manual)?
Nova mensagem recebida que ativa o Agente.
  - O agente pode enviar mensagens fora da janela de 24h do WhatsApp usando templates?
Sim, porém tem que avisar ao usuário que a mensagem que será enviada terá custos que a propria META cobra e deve ter um icone de "?" com uma explicaçao breve e com o link para a documentaçao da META explicando sobre os custos. Isso se encaixa no follow-up que o usuário vai definir e terá um custo associado a cada mensagem/template enviado, o usuário precisa ter noçao para estar por sua conta e risco e que cada mensagem enviada fora da janela de 24h do whatsapp será cobrado diretamente da sua conta da META.
  - Quer detecção automática de idioma por conversa?
Sim!

  Modos e aprovação

  - Como define exatamente Autônomo vs Assistido vs Rascunho?
Nao precisamos ter isso, todo os Agentes serao autonomos.
  - Em modo Assistido, quem aprova e em qual UI? Existe timeout e fallback?
  - Quais regras de escalonamento para humano? (ex: palavras-chave, emoções, tempo sem resposta, pedido explícito)
O usuário que deve definir isso, por exemplo, se o Agente nao souber responder alguma pergunta, ele ativa a tool que manda o card do lead para "atendimento humano" no CRM, etc... Isso deve estar bem detalhado em todas as configuraçoes que o usuário irá fazer nas configuraçoes do AGENTE para ele poder selecionar tudo. Pipeline que o Agente vai atuar, cards que o Agente vai mover, campos, tags, etc... Tudo que o Agente for fazer precisa estar bem detalhado na pagina de configuraçoes para que o usuario configure corretamente.

  Ações e ferramentas permitidas

  - Quais ações o agente pode executar no MVP? (criar/editar lead/contato, criar deal, mover etapa,
    aplicar tag, criar tarefa, enviar mensagem, resolver conversa)
Criar lead, editar lead, criar contato, editar contato, criar deal, mover etapa, aplicar tag, criar tarefa, enviar mensagem, resolver conversa, follow-up e outros.
  - Ações destrutivas (excluir/bloquear) ficam proibidas 100% ou permitidas com aprovação?
Açoes destrutivas apenas com o usuário, o Agente nao poderá ter o poder de excluir um lead/contato/deal e nem bloquear, apenas o usuario que fará isso.
  - Permissões por role (Admin/Manager/Member/Viewer) devem restringir também o agente?
Apenas o ADMIN poderá ter acesso a todas as configuraçoes do Agente, ninguém além dele terá acesso a qualquer configuração do Agente.

  Conhecimento e RAG

  - Fontes de conhecimento inicial: arquivos do agente, FAQ interno, dados do CRM, histórico das
    conversas?
Sim!
  - Quer indexação por workspace ou por agente?
Por agente. O AGENTE FUNCIONARÁ EM TODO O WORKSPACE E NAO APENAS NO USUÁRIO ESPECIFICO.
  - Preferência de vetor store: Supabase pgvector, Redis, FAISS local, outro?
Veja o que é melhor para o nosso caso de alto desempenho e custo benefício.
  - Embeddings via OpenAI ou outro provedor?
OpenAI e fallback para o gemini
  - Frequência de reindexação dos arquivos? (imediata, batch, agendada)
Faça o que for recomendado para alta performance e custo-beneficio.

  Dados e schema

  - Confirmar criação de tabelas agents, agent_permissions, agent_knowledge_files, agent_logs agora?
Sim!
  - Precisamos guardar prompt base, políticas, limites, budgets e histórico de tool calls?
Sim!
  - Logs devem armazenar mensagens completas, somente resumos, ou ambos?
Sim! Apenas resumos.

  Arquitetura e integração

  - O backend Python ficará dentro deste repo (ex: apps/agents) ou separado?
Dentro do repositório.
  - Integração com Next.js: REST, WebSocket/streaming, fila/worker, ou tudo via Supabase?
Faça o que for mais recomendado para alto desempenho e melhor custo benefício.
  - Quer usar LangGraph (workflow stateful) ou agente simples LangChain?
LangGraph.
  - Necessita streaming de tokens para UI do Inbox?
Nao sei o que é isso.

  Infra e deploy

  - Deploy na DigitalOcean: 1 droplet, docker compose, ou serviços separados?
Eu acho que vou implementar tudo na HOSTINGER via Docker. Qual sua recomendação? A Hostinger oferece um plano bom para o nosso caso de alto desempenho e custo benefício de VPS.
  - Job queue: manter BullMQ (Node) ou usar Celery/RQ no Python?
Faça o que for mais recomendado para alto desempenho e melhor custo benefício.
  - Precisamos de worker dedicado para ingestão/embedding de documentos?
Sim!
  - Teremos ambientes dev/staging/prod separados?
Faça o que for recomendado.

  Modelos e custo

  - Modelos OpenAI preferidos (ex: gpt-4o, gpt-4o-mini, gpt-4.1)?
Modeloos padroes, o usuario nao irá escolher, iremos utilizar modelos já definidos padrao para TODOS os usuários. GPT-4.1-MINI como principal e GEMINI 2.5-FLASH como fallback caso o openAI falhe.
  - Limites de custo por conversa/por workspace?
Os limites, planos, custos e etc está no arquivo: docs/planos-e-creditos.md
  - Fallback para modelo mais barato quando ultrapassar budget?
Acredito que nao iremos ter este problema, mas pode ser que isso aconteça, entao pode definir um modelo mais barato como gpt.4o-mini como fallback.

Segurança e compliance

  - Dados sensíveis (CPF/CNPJ/endereço) podem ser enviados ao LLM? Se não, exige redaction?
Pode sim, sem problema.
  - Política de retenção para logs de prompts e respostas?
O que isso significa?
  - Precisa de consentimento explícito do cliente final para IA?
É ideal quando o usuario terminar de configurar o seu Agente de IA ter um consentimento para que ele marque um checkbox e confirme o consentimento de uso da IA com dados, etc... e esta confirmaçao vá para o supabase.

  Observabilidade e auditoria

  - Stack preferida: Sentry/Logflare/PostHog?
Acredito que o sentry resolve.
  - Quais métricas obrigatórias por agente? (tempo de resposta, custo, taxa de escalonamento, conversão)
Todas!
  - Auditoria deve registrar todas as tool calls e decisões do agente?
Sim!

Performance e escala

  - SLA de resposta esperado por mensagem?
O usuário que irá definir o tempo de resposta que ele quer para o Agente em suas configuraçoes, porém o tempo recomendado e padrao definido é 30segundos, mas o usuário deve ter o poder de alterar.
  - Volume estimado de mensagens/dia e conversas ativas?
Nao sei, isso depende de cada usuário.
  - Limites de concorrência por workspace?
Nao sei o que isso significa.

  UX e workflow

  - Onde drafts e aprovações aparecem no Inbox?
Nao sei, se nao tiver voce precisa criar.
  - Mensagens do agente devem ser marcadas como “agente” e destacadas na timeline?
Sim!
  - O agente deve obedecer modoAtendimentoHumano já existente no Inbox?
O usuário pode definir isso nas configuraçoes do Agente, mas o padrao é que quando o card do lead/deal estiver com a tag "atendimento humano" e/ou o card do lead/deal estiver no estágio atendimento humano, o Agente nao poderá mais interagir com o lead. Mas o usuário deve poder configurar tudo isso, podendo ser outras tags, outros estágios, etc...

  Rollout e risco

  - Quer feature flag por workspace?
Nao sei o que isso significa.
  - Lançamento em beta com clientes específicos?
Por enquanto nao.
  - Precisa de avaliação humana (QA) antes de liberar autonomia?
Sim, eu mesmo irei fazer isso.

  Outros

  - Idiomas suportados no MVP: PT-BR apenas ou PT-BR + EN?
PT-BR + EN.
  - Timezone: por workspace ou por usuário?
O que isso significa? O usuário pode definir o timezone que ele deseja que o Agente use para responder as mensagens.
  - Limites por plano (número de agentes, uso, tokens) já devem ser aplicados no backend?
Sim, está tudo no arquivo docs/planos-e-creditos.md

  Se preferir, posso receber respostas por bloco (ex: “Escopo”, depois “Arquitetura”, etc.).