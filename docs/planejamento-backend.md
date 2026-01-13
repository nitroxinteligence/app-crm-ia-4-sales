# Planejamento Backend - VP CRM

Este documento descreve a estrategia de backend para o VP CRM, baseada no frontend atual. Ele cobre stack, arquitetura modular, dados, integracoes, seguranca e roadmap por etapas.

> Nota sobre credenciais: as chaves do Supabase estao em `docs/apikeys-supabase.md`. Nao replicar aqui. Vamos mover os valores para `.env` quando iniciarmos a implementacao.

## 1) Baseline do frontend (estado atual)

### Rotas implementadas (App Router)
- `/app/painel`
- `/app/inbox`
- `/app/funil`
- `/app/leads`
- `/app/calendario`
- `/app/agentes`
- `/app/agentes/[id]`
- `/app/agentes/novo`
- `/app/relatorios`
- `/app/integracoes`
- `/app/canais` (placeholder)

### Entidades ja tipadas (src/lib/types.ts)
- Auth/Conta: `Workspace`, `Usuario`, `Role`, `Plano`, `EstadoAutenticacao`
- Inbox: `ConversaInbox`, `MensagemInbox`, `ContatoInbox`, `CanalId`
- CRM: `ContatoCRM`, `DealFunil`, `EtapaFunil`
- Agenda: `TarefaCalendario`
- Agentes: `AgenteIA`, `ArquivoConhecimento`, `LogAgente`
- Relatorios: `KPIRelatorio`, `KPINegocio`, `RelatorioAgente`, `RelatorioVenda`, `RelatorioInbox`

### Dados e comportamento atual
- Sem dados mockados no app (dados reais via Supabase).
- Contexto de autenticacao usa Supabase Auth + workspace.
- Permissoes respeitam roles definidos no contexto.
- UI assume multi-tenant (workspace), roles e limites de plano.

Implica: o backend deve cobrir auth, multi-tenant, CRM core, inbox omnichannel, pipeline, tarefas, agentes, relatorios e integracoes.

## 2) Decisoes confirmadas (respondendo-perguntas-3)

- Prioridade inicial: Inbox + integracao oficial WhatsApp (Meta Cloud API)
- Multi-workspace: por enquanto 1 usuario = 1 workspace (manter estrutura multi-tenant)
- Auth: email e senha
- Roles: Admin/Manager/Member/Viewer (mantem)
- Leads x Contatos: lead nasce do WhatsApp; vira contato quando cadastrado no app
- Tags: globais por workspace
- Pipelines: multiplas por workspace
- Owner: pode ser usuario ou agente (simplificado na V1)
- Status inbox: aberta, pendente, resolvida, spam
- Nota interna: mensagem com flag interno
- Webhooks: armazenar payload bruto para auditoria e retry
- Quick replies: armazenar em banco (usuario cria)
- WhatsApp templates: suportar templates aprovados e categorias
- Anexos: Supabase Storage, limite 5 MB por arquivo
- WhatsApp: integracao direta Meta, WABA criado do zero
- Instagram/Messenger: implementar depois do WhatsApp estar 100% (IG primeiro)
- Email e LinkedIn: adiar (apenas documentar recomendacao)
- IA: OpenAI, mas agentes nao entram agora
- Notificacoes: in-app
- Relatorios: historicos reais (dados do Supabase)
- Billing: depois
- LGPD/retencao: 12 meses (webhooks/anexos)
- Auditoria: logar todos eventos recomendados
- Infra: deploy em DigitalOcean
- Alta demanda: arquitetura modular e eficiente
- Criptografia: dados sensiveis (CPF/CNPJ/endereco) sim, com busca por CPF/CNPJ
- Times/filas: por usuario
- Canais ativos: refletir integracoes reais
- Roadmap: mantem a ordem proposta (com ajuste de prioridade)

## 3) Stack e principios

### Stack recomendada (primeira versao)
- **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Next.js (App Router)** como BFF para orquestrar chamadas e esconder segredos
- **Fila/Jobs**: Redis + BullMQ (confirmado)
- **Observabilidade**: Sentry (erros), Logflare (logs), PostHog (produto)
- **IA**: OpenAI (fase futura)
- **Infra**: DigitalOcean (Droplet + DB/Redis gerenciados)

### Principios
- **Arquitetura modular** por dominio
- **Multi-tenant primeiro** (mesmo com 1 workspace por usuario)
- **RLS forte** por workspace e role
- **Event-driven** para inbox e integracoes
- **Observabilidade** desde o inicio

## 4) Arquitetura modular (visao de dominios)

### 4.1 Auth + Workspaces
- Login, onboarding, membros e roles
- Entidades: `workspaces`, `workspace_members`, `profiles`

### 4.2 Inbox
- Normaliza mensagens de canais (WhatsApp, IG, Messenger)
- Entidades: `conversations`, `messages`, `attachments`, `conversation_tags`, `conversation_assignments`
- Realtime para novas mensagens e status
- Quick replies e templates do WhatsApp

### 4.3 CRM (Leads/Contatos/Empresas)
- Leads sao inbound de WhatsApp; Contatos sao cadastrados pelo usuario
- Entidades: `leads`, `contacts`, `companies`, `tags`, `lead_tags`, `contact_tags`
- Conversao lead -> contato (manual)

### 4.4 Pipeline (Deals + Etapas)
- Entidades: `pipelines`, `pipeline_stages`, `deals`, `deal_activities`
- Drag & drop atualiza `deals.stage_id`

### 4.5 Tarefas/Calendario
- Entidades: `tasks`, `task_relations`
- Integracao Google/Outlook em etapa futura

### 4.6 Agentes de IA (futuro)
- Entidades: `agents`, `agent_permissions`, `agent_knowledge_files`, `agent_logs`

### 4.7 Relatorios e BI
- Event log + views/materialized views
- KPIs historicos reais

### 4.8 Integracoes
- Entidades: `integrations`, `integration_accounts`, `integration_tokens`, `webhook_events`
- Conecta canais e gerencia tokens

## 5) Modelo de dados inicial (alto nivel)

> Todas as tabelas terao `id`, `workspace_id`, `created_at`, `updated_at`.

### Auth/Org
- `profiles`: user_id (auth.users), nome, email, avatar_url
- `workspaces`: nome, segmento, tamanho_time, status
- `workspace_members`: workspace_id, user_id, role

### Leads/CRM
- `leads`: nome, telefone, email, canal_origem, status, owner_id, contato_id (nullable)
- `contacts`: nome, telefone, email, empresa_id, status, owner_id
- `companies`: nome, site, setor
- `tags`: nome, cor
- `lead_tags`: lead_id, tag_id
- `contact_tags`: contact_id, tag_id
- `custom_fields_lead`: nome, tipo, opcoes, obrigatorio
- `custom_fields_deal`: nome, tipo, opcoes, obrigatorio
- `custom_field_values_lead`: lead_id, field_id, valor
- `custom_field_values_deal`: deal_id, field_id, valor

### Inbox
- `conversations`: lead_id ou contact_id, canal, status, owner_id, modo_atendimento_humano
- `messages`: conversation_id, autor (contato/equipe/agente), tipo, conteudo, horario, interno
- `attachments`: message_id, storage_path, tipo, tamanho_bytes
- `quick_replies`: workspace_id, titulo, atalho, conteudo
- `whatsapp_templates`: workspace_id, nome, categoria, idioma, status
- `webhook_events`: integracao_id, payload, status, processado_em

### Pipeline
- `pipelines`: nome, descricao
- `pipeline_stages`: pipeline_id, nome, ordem, cor
- `deals`: contato_id, empresa_id, valor, moeda, owner_id, status, stage_id, canal

### Tarefas
- `tasks`: titulo, tipo, data, hora, responsavel_id, status
- `task_relations`: task_id, relacionamento_tipo, relacionamento_id

### Agentes (futuro)
- `agents`: nome, tipo, status, modo, idioma, tom, horario
- `agent_permissions`: agent_id, permissao, habilitado
- `agent_knowledge_files`: agent_id, storage_path, status
- `agent_logs`: agent_id, data, canal, acao, alvo, resultado

### Relatorios
- `events`: tipo, referencia_id, payload_minimo (para historico)
- Views/materialized views (ex: `mv_kpis_inbox`, `mv_kpis_funil`)

### Integracoes
- `integrations`: canal, status, workspace_id
- `integration_accounts`: integracao_id, nome, identificador, responsavel
- `integration_tokens`: integracao_id, access_token, refresh_token, expira_em

## 6) RLS, seguranca e compliance

- Todas as tabelas com RLS e condicao `workspace_id`
- Policies baseadas em `workspace_members` e `auth.uid()`
- Viewer: mascaramento no app (e opcional views SQL)
- Auditoria: logs de alteracoes (deals, contatos, mensagens)
- Dados sensiveis (CPF/CNPJ/endereco): criptografia por coluna (pgcrypto/pgp_sym_encrypt) e chave em vault
- Retencao: 12 meses para webhooks/anexos (ajustavel por plano)

## 7) Integracoes (canais)

### WhatsApp (Meta Cloud API - prioridade)
- Fluxo: Embedded Signup (Meta), criar WABA, registrar numero, configurar webhooks
- Webhook para mensagens recebidas, status e template events
- Envio de mensagens (texto, midia, templates)
- Fila/Jobs para retry e rate limit
- Normalizacao de payload -> `messages`/`conversations`
- Numero por workspace: 1 no inicio (pode variar por plano)

### Instagram + Messenger (etapa posterior)
- Instagram primeiro
- OAuth, Webhooks e sincronizacao de conversas
- Normalizacao para `messages`

### Email (futuro)
- Provider recomendado: SES ou Postmark (definir depois)
- Suporte a envio e inbound (fase futura)

### LinkedIn (futuro)
- Avaliar restricoes de API antes de iniciar

## 8) Realtime e notificacoes

- Supabase Realtime para novas mensagens e mudancas de status
- Notificacoes in-app por usuario/workspace

## 9) Observabilidade e auditoria

- Sentry para erros
- Logflare para logs de API e webhooks
- PostHog para analytics de produto
- Logs de auditoria para todas acoes criticas

## 10) Roadmap por etapas (reordenado)

### Etapa 0 - Fundacao minima
- Criar projeto Supabase
- Configurar Auth + `profiles`
- Criar `workspaces` e `workspace_members`
- Migracoes e types

### Etapa 1 - Inbox + WhatsApp (prioridade)
- Tabelas: `leads`, `conversations`, `messages`, `attachments`, `quick_replies`, `whatsapp_templates`
- Webhook receiver e normalizacao
- Envio de mensagens e templates
- Storage + limite 5 MB
- Realtime no inbox

### Etapa 2 - CRM base
- `contacts`, `companies`, `tags`, `lead_tags`, `contact_tags`
- Fluxo de conversao lead -> contato (manual)
- CRUD basico

### Etapa 3 - Pipeline
- `pipelines`, `pipeline_stages`, `deals`
- Drag & drop persistido

### Etapa 4 - Relatorios historicos
- Tabela `events` + views/materialized views
- KPIs reais e exportacao CSV

### Etapa 5 - Integracoes adicionais
- Instagram
- Messenger

### Etapa 6 - Tarefas/Calendario
- CRUD tarefas
- Relacionamentos

### Etapa 7 - Agentes (futuro)
- Estrutura base (sem IA ativa)

### Etapa 8 - Email + Billing + LinkedIn (futuro)
- Email provider
- Stripe
- Avaliar LinkedIn

## 11) Recomendacoes pendentes (precisa confirmacao)

- API: modelo hibrido (CRUD direto no Supabase + BFF para integracoes) confirmado
- CSV import: async com jobs confirmado
- Observabilidade confirmada
- Campos customizados: tabelas separadas lead/deal confirmadas
- Filas/Jobs: BullMQ confirmado
- LGPD: politica de retencao definida (12 meses)
- Embedded Signup Meta confirmado
- WhatsApp scope: texto + midia + templates confirmado
- Integracao Instagram primeiro confirmada
- Deploy: Droplet + DB/Redis gerenciados confirmado
- Conversao lead -> contato manual confirmada
- Numero por workspace: 1 no inicio (ajustavel por plano)
- Auditoria: armazenar logs no banco agora, UI de auditoria entra em etapa futura

## 12) Proximos passos (apos aprovacao)

1) Criar schema inicial no Supabase
2) Integrar auth no frontend
3) Entregar Etapa 1 (Inbox + WhatsApp)
