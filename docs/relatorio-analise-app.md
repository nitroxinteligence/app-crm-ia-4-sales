# Relatorio de analise do app (base atual)

## Escopo avaliado
- Frontend Next.js + shadcn/ui em `src/app` e `src/components`.
- API routes em `src/app/api`.
- Service de agentes em `apps/agents`.
- Migracoes Supabase em `supabase/migrations`.
- Documentacao em `docs/`.

## Estado atual (resumo)
- Auth e onboarding com wizard implementados, com skip permitido (nao bloqueia o app).
- WhatsApp e Instagram integrados (connect, webhooks, ingestao e inbox humano).
- Inbox envia mensagens reais para WhatsApp e Instagram via `/api/inbox/send`.
- Inbox agora persiste tags, transferencias, notas internas, negocios, tarefas, spam e bloqueio.
- Inbox envia anexos (WhatsApp via media; Instagram via link assinado) e mostra downloads no chat.
- Quick replies e templates WhatsApp foram conectados ao inbox (com variaveis no body).
- Agente esta restrito ao WhatsApp (Instagram nao dispara agente).
- CRM (contatos, leads, funil) e configuracoes principais ja usam Supabase.
- Empresas viraram campo texto (empresa) em contatos/leads/deals; modulo removido.
- Tickets removidos do schema e do escopo.
- Dados mockados removidos do app (somente dados reais).
- Relatorios usam views/materialized views no Supabase.
- Admin usa plano maximo via regra no contexto de auth.

## Verificacao do `docs/relatorio-agentes.md`
### Core do fluxo de agentes
- Fluxo WhatsApp -> webhook -> Celery -> agente esta funcional.
- Instagram esta integrado para inbox (ingestao + envio humano).
- Midias de inbox sao baixadas e persistidas no bucket `inbox-attachments`.
- Consentimento, permissoes e creditos sao validados no backend.
- Contexto do agente usa 150 mensagens.
### Pontos ainda fora do escopo do relatorio
- Integracao supermemory citada em docs nao foi implementada.
- Parte do texto ainda referencia a unificacao de filas (BullMQ), mas o app ja usa Celery.

## Gaps criticos para 100% do app
- Integracoes: Messenger/Email/LinkedIn removidos (fora de escopo por enquanto).
- Billing/checkout: nao ha fluxo real de assinatura (Stripe) nem upgrade/downgrade automatico.

## Gaps importantes (qualidade/operacao)
- `workspace_settings` tem retencao configuravel, mas nao ha enforcement real.
- Relatorios dependem de refresh das materialized views (cron precisa estar ativo).
- Onboarding difere do escopo original (docs pedem pipeline, importacao CSV e convite).
- Templates WhatsApp: apenas variaveis de BODY (text) suportadas por enquanto.
- Instagram: anexos enviados como link assinado (nao via attachment nativo).
- Copiloto IA adiado (fora do escopo atual).

## Inconsistencias de docs
- `docs/planejamento-backend.md` menciona BullMQ e canais placeholders antigos.
- `src/lib/whatsapp/README.md` ainda referencia BullMQ (atual esta em Celery).

## Diretrizes novas (dadas agora)
- Empresas e Tickets nao existem como modulos; "empresa" permanece apenas como campo em contatos/deals.
- Planos do app devem seguir `docs/planos-e-creditos.md`.
- Conta ADMIN opera no plano mais alto (Premium).
- Agente opera apenas no WhatsApp; Inbox deve permitir respostas humanas em WhatsApp e Instagram.
