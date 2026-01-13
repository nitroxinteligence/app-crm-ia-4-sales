# Relatorio - Agentes IA (estado atual, diagnostico e plano)

## Status geral
- UI de agentes (lista, wizard, editor, sandbox) esta funcional e grava no Supabase.
- Backend de agentes (FastAPI + Celery + LangGraph) executa fluxos com logs e consumo de creditos.
- Fluxo WhatsApp -> agente, midias, templates e consentimento ja estao integrados.
- Instagram esta integrado para inbox (sem agente, apenas espelhamento e envio humano).

## Escopo e fontes analisadas
- Frontend: `src/app/app/agentes/page.tsx`, `src/app/app/agentes/novo/page.tsx`, `src/app/app/agentes/[id]/page.tsx`, `src/components/agentes/visao-agentes.tsx`, `src/components/agentes/editor-agente.tsx`.
- API Next.js: `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/webhooks/whatsapp/process/route.ts`, `src/app/api/agentes/sandbox/route.ts`, `src/app/api/agentes/conhecimento/processar/route.ts`, `src/app/api/integrations/whatsapp/*`.
- Supabase schema: `supabase/migrations/20250309000400_agents.sql`, `supabase/migrations/20250310000100_agent_conversation_chunks.sql`, `supabase/migrations/20250308000200_inbox_whatsapp.sql`, `supabase/migrations/20250308000300_whatsapp_accounts.sql`, `supabase/migrations/20250309000300_user_avatars_credits.sql`, `supabase/migrations/20250308001300_google_calendar.sql`.
- Agents service: `apps/agents/app/main.py`, `apps/agents/app/services/*`, `apps/agents/app/tools/*`, `apps/agents/app/workers/*`, `apps/agents/app/clients/*`.
- Docs: `docs/escopo-do-crm.md`, `docs/prompt-inicial.md`, `docs/planejamento-backend.md`, `docs/planos-e-creditos.md`, `docs/respondendo-perguntas-4.md`, `docs/respondendo-perguntas-5.md`.

Nota: `temp-crm/` e area legado nao foram alterados (somente referencia quando necessario).

## Como esta funcionando hoje

### /app/agentes (lista)
- Lista agentes do workspace e exibe uso calculado por `agent_credit_events` vs `workspace_credits`.
- Acesso restrito a ADMIN via `useAutenticacao()`.
- Botao "Criar agente" bloqueia quando atinge limite do plano.

### /app/agentes/novo e /app/agentes/[id] (wizard/editor)
- Wizard salva configuracoes, permissoes, follow-ups e consentimento no Supabase.
- Carrega contas WhatsApp/Instagram conectadas (tabelas `integration_accounts` e `integrations`).
- Usa `whatsapp_templates` aprovados para follow-ups.
- Upload de conhecimento salva no bucket `agent-knowledge` e registra em `agent_knowledge_files`.
- Aba "Testar" chama `/api/agentes/sandbox`.

### Backend agents service
- FastAPI exposto em `apps/agents/app/main.py` com endpoints `run`, `sandbox` e `knowledge/process`.
- Celery + Redis executa tasks de conhecimento, run do agente e follow-ups.
- RAG com embeddings (OpenAI + Gemini), logs em `agent_logs`, runs em `agent_runs`.
- Tools ativas: CRM, Inbox (WhatsApp), Calendar.

## Diagnostico do que falta para 100% funcional

### P0 - resolvidos
- WhatsApp -> agente dispara via service + Celery.
- `AGENTS_API_KEY` enviado nas chamadas criticas.
- Midia/anexos com bucket `inbox-attachments` provisionado.
- Templates WhatsApp sincronizados via Graph API.
- Consentimento validado antes do run.
- Permissoes respeitadas no envio final do agente.

### P1 - lacunas importantes (funciona, mas incompleto)
- Sem lacunas criticas pendentes no fluxo core.

### P2 - alinhamento com docs / escopo
- `docs/prompt-inicial.md` e `docs/escopo-do-crm.md` indicam limite V1 de 2 agentes; a UI usa `plano.limites.agentes`.
- `docs/respondendo-perguntas-2.md` sugere painel lateral, mas hoje o editor e rota dedicada.
- `docs/respondendo-perguntas-4.md` menciona uso de supermemory para contexto; nao ha integracao.

## Plano para 100% funcional (priorizado)

### Fase 0 - decisao de filas (unificacao)
- Remover BullMQ e centralizar filas no Celery + Redis (Upstash).
- Manter Next.js apenas como gateway de webhook e persistencia inicial.

### Fase 1 - fluxo core WhatsApp -> agente (concluida)
1) Criar endpoint no service de agentes para enfileirar eventos (ex: `POST /webhooks/whatsapp/process`).
2) Portar a logica de ingestion do WhatsApp para o service Python.
3) Atualizar webhook Next.js para chamar o endpoint do service (com `X-Agents-Key`).
4) Disparar agente apos persistir mensagens/conversations.

### Fase 2 - midias, templates e consentimento (concluida)
1) Criar bucket `inbox-attachments` + policy no Supabase.
2) Baixar midias via Graph API e salvar `attachments`.
3) Ingerir texto de midias no `agent_conversation_chunks`.
4) Job de sincronizacao de templates WhatsApp.
5) Validar consentimento no `run_agent` antes de executar.

### Fase 3 - governanca e UX (parcial)
1) Respeitar `agent_permissions` no envio final (`enviar_mensagem`).
2) UI para pausar/ativar agente (concluido).
3) Garantir `workspace_credits` ao criar workspace (concluido).
4) Fluxo de "creditos zerados" com CTA de cobranca (concluido).
5) Preencher `agent_metrics_daily` via cron/worker ou eventos (concluido via eventos).

### Fase 4 - extensoes (quando o core estiver estavel)
- Instagram end-to-end para inbox (webhooks, ingestao e envio humano) concluido.
- Integracao opcional com supermemory (se mantida no escopo).
- Relatorios de performance do agente com KPIs.

## Plano de unificacao de filas (BullMQ -> Celery + Redis Upstash)

### Objetivo
- Usar apenas Celery + Redis para filas de ingestion, run do agente, follow-up e conhecimento.
- Remover o worker Node e dependencias BullMQ.

### Fluxo final esperado
1) `POST /api/webhooks/whatsapp` valida assinatura e grava `webhook_events`.
2) Next.js chama o service de agentes para enfileirar o evento.
3) Celery processa e normaliza (leads, conversations, messages, attachments).
4) Celery dispara o agente quando necessario.

### Passos tecnicos
1) Criar rota FastAPI `POST /webhooks/whatsapp/process`.
2) Implementar task `process_whatsapp_event_task` no Celery.
3) Portar `src/lib/whatsapp/processar-evento.ts` para Python.
4) Atualizar `src/app/api/webhooks/whatsapp/route.ts` para chamar o service.
5) Remover `scripts/worker-whatsapp.js`, `src/lib/queues/*` e dependencia `bullmq`.

### Impacto esperado
- Menos processos para operar e monitorar.
- Fila unica padronizada com Redis + Celery.

## Consideracoes sobre QStash, BullMQ, Celery e Redis
- **QStash** e push-based e chama endpoints HTTP (bom para serverless); nao substitui o worker quando o job precisa de processamento pesado ou acesso interno.
- **BullMQ** e Redis-based e exige worker ativo; em Upstash pode gerar custo alto por polling frequente.
- **Celery + Redis** ja esta no service Python e e adequado para jobs pesados e orquestracao.
- **Redis sozinho** nao substitui uma fila/worker; ele e o broker/armazenamento, mas nao executa jobs.

## Dependencias e variaveis necessarias
- Next.js: `AGENTS_API_URL`, `AGENTS_API_KEY`, `REDIS_URL`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`.
- Agents service: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AGENTS_API_KEY`.
- WhatsApp: `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION`.
- Instagram: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN`, `INSTAGRAM_GRAPH_VERSION` (fallback para vars do WhatsApp se nao definidos).
- Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Dependencias nativas: `ffmpeg`, `tesseract`, `poppler`.

## Checklist de validacao (manual)
- Criar agente e salvar (wizard completo, consentimento gravado).
- Enviar mensagem WhatsApp real e confirmar disparo do agente.
- Enviar audio/imagem e confirmar ingestao + OCR/transcricao.
- Verificar follow-up com template aprovado.
- Validar pause por tag/etapa e modo atendimento humano.
- Verificar bloqueio de envio quando creditos == 0.

## Referencias externas
- https://upstash.com/docs/qstash/overall/compare
- https://upstash.com/docs/redis/integrations/bullmq
- https://upstash.com/docs/redis/integrations/celery
- https://docs.bullmq.io/
