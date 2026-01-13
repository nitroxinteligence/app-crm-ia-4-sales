# Relatorio de planejamento detalhado (etapas para concluir 100% do app)

## Premissas obrigatorias
- Sem dados mockados em qualquer camada (UI, API ou workers).
- Canais ativos no app: WhatsApp + Instagram.
- Agente atende apenas no WhatsApp (Instagram e inbox humano).
- “Empresa” e apenas campo texto em contatos e negocios (nao existe modulo Empresas).
- Tickets nao existem (remover do schema, UI e docs).
- Onboarding com wizard deve permitir pular etapas (nao bloqueia o app).
- Conta ADMIN opera sempre no plano Premium (limites maximos).
- Janela de contexto do agente: 150 mensagens.

## Etapa 0 — Auditoria e alinhamento (base atual)
- Inventariar modulos atuais (CRM, inbox, agentes, integracoes, relatorios, tasks, calendario).
- Confirmar quais fluxos ja usam Supabase diretamente vs API routes.
- Atualizar `docs/relatorio-analise-app.md` com gaps reais do backend.
- Revisar `docs/relatorio-agentes.md` e validar se o fluxo WhatsApp esta 100%.
- Mapear dependencias externas (Graph API, Redis, Celery, Supabase storage).

## Etapa 1 — Remover Empresas/Tickets do escopo (backend + schema)
### 1.1 Schema e migracoes
- Criar campo texto `empresa` em `contacts` e `deals` (ou reaproveitar campo existente, se ja houver).
- Migrar dados atuais de `companies.nome` para `contacts.empresa` e `deals.empresa`.
- Remover referencias `company_id` em `contacts`/`deals` e limpar `companies` (se nao for mais usada).
- Remover `ticket` do enum `task_relation_type`.

### 1.2 API/Services
- Atualizar `src/app/api/crm/leads/convert` para salvar `empresa` como texto (sem criar company).
- Atualizar `src/app/api/inbox/deals` para usar `empresa` do contato/deal.
- Ajustar consultas que fazem join `companies:company_id`.

### 1.3 Frontend (CRM/Inbox)
- Atualizar formularios de contato e negocio para editar `empresa` diretamente.
- Ajustar listagens (contatos, funil, inbox) para exibir `empresa` como texto.
- Remover qualquer UI de empresa/ticket que ainda exista.

### 1.4 Docs
- Atualizar `docs/escopo-do-crm.md` e `docs/prompt-inicial.md` removendo Empresas e Tickets.
- Atualizar `docs/respondendo-perguntas-*.md` com o novo escopo.

## Etapa 2 — Inbox omnichannel completo (WhatsApp + Instagram)
### 2.1 Upload e storage de anexos
- Criar endpoint `/api/inbox/attachments` para upload direto ao Supabase Storage.
- Validar tamanho/formatos (imagem, pdf, audio, video).
- Criar registro em `attachments` com metadata (tipo, mime, tamanho, url).

### 2.2 Envio de anexos
- Implementar upload de midia na Graph API (WhatsApp) e envio da mensagem com media_id.
- Implementar envio de anexos no Instagram Direct (se suportado) com fallback para link.
- Persistir `provider_message_id` e status no banco.

### 2.3 Templates WhatsApp
- Normalizar status (APPROVED/aprovado) para evitar lista vazia.
- Suporte a parametros dinamicos (placeholders) no envio de templates.
- UI para preencher parametros e validar tipos (text, currency, date).

### 2.4 Quick replies
- CRUD completo (listar, criar, editar, excluir).
- Inserir quick reply no composer com formataçao final.

### 2.5 Copiloto IA
- Adiado (fora do escopo atual).

### 2.6 Status e governanca
- Garantir sincronizacao de status (pendente, resolvida, spam, bloqueado).
- Logs de acoes (transferencias, tags, bloqueios) para auditoria.

## Etapa 3 — Onboarding (wizard) + autenticacao
- Validar fluxo auth (login, signup, reset) com Supabase.
- Wizard em etapas: workspace -> canais -> agente -> final.
- Permitir pular qualquer etapa; nao bloquear o app.
- Dar prioridade ao Instagram no wizard; WhatsApp opcional (usuario pode conectar depois).
- Atualizar CTA de progresso no painel (aviso onboarding).

## Etapa 4 — Agentes (WhatsApp-only)
- Confirmar contexto com 150 mensagens no backend.
- Validar ingestao de midias e consentimento antes do run.
- Garantir bloqueios por tags/etapas e modo humano.
- Confirmar follow-ups com templates aprovados.
- Monitorar consumo de creditos e logs por run.

## Etapa 5 — CRM (contatos, funil, negocios)
- CRUD completo de contatos e negocios sem dependencia de companies.
- Conversao de lead -> contato preservando empresa como texto.
- Pipeline/stages consistentes com filtros e owners.
- Importacao CSV validada com schema real (sem mock).

## Etapa 6 — Tarefas + Calendario
- Ajustar tipos de relacionamento (sem ticket).
- Garantir que tarefas estejam ligadas a lead/deal/conversa corretamente.
- Confirmar calendario com integracao Google (eventos, lembretes).

## Etapa 7 — Relatorios e dados
- Validar queries de relatorios e materialized views.
- Criar cron para refresh diario/horario.
- Auditoria de KPIs (atendimentos, conversoes, performance).

## Etapa 8 — Billing e planos
- Integrar Stripe: checkout, portal, upgrade/downgrade, cancelamento.
- Aplicar limites de plano (agentes, usuarios, canais, pipelines).
- Criar compra de pacotes de creditos e registro em `credit_events`.

## Etapa 9 — QA final e operacao
- Checklist manual por modulo (Inbox, CRM, Agentes, Integracoes).
- Validar webhooks reais (WhatsApp/Instagram) com conversas de teste.
- Validar rotas protegidas e RLS no Supabase.
- Revisar logs, erros e alertas.

## Checklist final de aceite
- Inbox envia/recebe mensagens reais (WA/IG) com anexos e templates.
- CRM funciona sem modulo Empresas/Tickets.
- Agente opera somente no WhatsApp e respeita contexto 150.
- Onboarding funciona com skip e nao bloqueia o app.
- Billing/planos com limites ativos.
- Relatorios atualizados por cron.
