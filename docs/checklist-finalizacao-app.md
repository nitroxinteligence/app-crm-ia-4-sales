# Checklist de finalizacao (backend + multi-tenant)

Este checklist cobre o que falta para deixar o app 100% pronto no escopo atual:
- Sem Stripe/Billing (apenas trial de 30 dias + escolha de plano).
- Agente IA somente WhatsApp (Instagram apenas inbox humano).
- Sem supermemory.

## 1) Autenticacao e email (Supabase + Resend)
- [x] Configurar SMTP Resend no Supabase (prod e dev).
- [x] Templates de email inseridos no Supabase.
- [ ] Definir `SITE_URL` e `REDIRECT_URLS` no Supabase.
- [x] Ajustar `signUp` para usar `emailRedirectTo` (dev/prod).
- [x] Ajustar reset de senha para usar URL correta (dev/prod).
- [ ] Confirmar fluxo completo: cadastro -> confirmacao -> login.

## 2) Convites e membros (multi-tenant)
- [x] Criar endpoint publico de validacao de convite (`/api/invites/validate`).
- [x] Criar endpoint de aceite (`/api/invites/accept`) com service role.
- [x] Criar endpoint de reenvio (`/api/invites/resend`) com nova expiração.
- [x] Ajustar `handle_new_user` para respeitar `invite_token` (nao criar workspace novo).
- [x] Pagina `/convite` com email pre-preenchido e senha.
- [x] Reenviar convite na UI (botao dedicado).
- [x] Garantir que convite expira e muda status para `aceito`.
- [x] Garantir que `workspace_members` e `profiles` sao criados no aceite.

## 3) Gate de plano/trial (backend)
- [x] Bloquear acesso no banco quando `plano_selected_at` for null.
- [x] Bloquear acesso no banco quando `trial_ends_at` expirar.
- [x] Criar funcao SQL `is_workspace_active(workspace_id)` para reutilizar no RLS.
- [x] Aplicar `is_workspace_active` nas policies principais (CRM, Inbox, Deals, Tasks, Events).
- [x] Criar funcao SQL `is_workspace_not_expired(workspace_id)` para permitir onboarding pre-plano.
- [x] Estender bloqueio para `workspaces`, `workspace_members`, settings/invites/credits,
      integracoes, calendario, agentes e storage.
- [x] Bloquear convites e ingestao do service de agentes quando trial expira.
- [x] Proteger views de relatorios com `is_workspace_active`.
- [x] Endpoint `/api/plans/status` para debug/monitoramento.
- [ ] (Opcional) Tornar buckets publicos privados + signed URLs para bloquear acesso fora do app.

## 4) Supabase schema e migracoes
- [x] Aplicar todas as migracoes em dev e prod.
- [x] Garantir colunas criticas: `contacts.empresa`, `contacts.avatar_url`,
      `workspace_settings.onboarding_*`, `workspaces.plano_*`.
- [x] Revisar indices para escala (workspace_id + filtros frequentes).
- [ ] Validar RLS em todas as tabelas novas.

## 5) Agentes IA (operacao)
- [ ] Service de agentes (FastAPI + Celery) rodando 24/7.
- [ ] `AGENTS_API_URL`, `AGENTS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Dependencias nativas instaladas (ffmpeg, tesseract, poppler).
- [ ] Validar fluxo: WhatsApp -> webhook -> Celery -> agente.
- [x] Service bloqueia ingestao/execucao quando trial expira.

## 6) Inbox e WhatsApp
- [ ] Webhooks ativos e verificados (WhatsApp).
- [ ] Templates sincronizados e aprovados.
- [ ] Anexos: download + persistencia no bucket correto.
- [ ] Realtime e status (aberta/pendente/resolvida/spam).

## 7) Observabilidade e operacao
- [ ] Logs e erros (Sentry/Logflare).
- [ ] Jobs de refresh para materialized views (relatorios).
- [ ] Backups e politicas de retencao.

## 8) QA final (aceite)
- [ ] Cadastro -> onboarding -> planos -> app liberado.
- [ ] Convite -> criar conta -> entrar no workspace correto.
- [ ] Usuario sem plano nao acessa `/app/*`.
- [ ] Trial expirado bloqueia tudo.
- [ ] Agente WhatsApp responde com IA e grava logs.

---

# Plano de execucao (etapas)

## Etapa 1 — Convites completos (prioridade)
1) API validate/accept/resend + pagina `/convite`.
2) Ajuste do trigger `handle_new_user` para `invite_token`.
3) UI de reenviar convite.

## Etapa 2 — Email e confirmacoes
1) Resend configurado no Supabase.
2) `emailRedirectTo` no cadastro e reset.
3) Validar email-confirm em prod/dev.

## Etapa 3 — Gate real no backend
1) Funcao `is_workspace_active`.
2) Funcao `is_workspace_not_expired` para onboarding pre-plano.
3) Aplicar em policies RLS (CRM/Inbox/Agents/Integracoes/Storage).
4) Endpoint de status (opcional).

## Etapa 4 — Operacao e QA
1) Revisao de migracoes e indices.
2) Verificacao agentes + inbox + relatorios.
3) Checklist final de aceite.
