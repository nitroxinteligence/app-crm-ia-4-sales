# Planejamento detalhado - proximas etapas (atualizado)

## Relatorio atual (resumo)
- Planos do app seguem `docs/planos-e-creditos.md` (Essential, Pro, Premium).
- Admin usa plano Premium por regra no contexto de auth.
- Auth e onboarding com wizard (skip permitido) ja estao ativos.
- WhatsApp e Instagram integrados no backend de webhooks/ingestao.
- Creditos, metricas e modal de creditos zerados ja estao alinhados.

## Planejamento detalhado (ordem solicitada)

### Etapa 1 - Inbox: envio manual real (WhatsApp + Instagram)
1) Backend Next.js: criar rota `/api/inbox/send` com:
   - Auth via token do Supabase.
   - Resolucao de workspace + conversa + canal.
   - Validacao de permissao (role + agente pausado, se aplicavel).
2) Integracao Instagram:
   - Usar `integration_tokens` para token da conta IG.
   - Chamar Graph API `/me/messages` para envio de texto.
   - Persistir `messages` e atualizar `conversations` (ultima mensagem/horario).
3) UX de erro/sucesso:
   - Retornar status detalhado (erro de token, janela expirada, rate limit).
   - Exibir erro no composer sem apagar texto.
4) Frontend:
   - Implementar `handleEnviar` no `chat-conversa` com chamada ao endpoint.
   - Otimista: inserir mensagem local, substituir por resposta do backend.
5) WhatsApp:
   - Reusar a mesma rota para envio por canal.

### Etapa 2 - Inbox: acoes auxiliares e quick replies
1) Persistir acoes dos dialogs:
   - Tag, transferir owner, nota interna, spam, bloqueio.
2) Criar endpoints REST dedicados (ex: `/api/inbox/conversations/:id`).
3) Implementar quick replies:
   - Tabela `quick_replies` por workspace.
   - CRUD no settings + seletor no composer.
4) Templates:
   - Exibir templates aprovados do WhatsApp (quando canal for WA).
   - Manter "em breve" para outros canais.

### Etapa 3 - Integracoes placeholders (Messenger/Email/LinkedIn)
1) Decidir: remover cards ou manter com estado "em breve".
2) Se remover:
   - Ocultar cards e menus relacionados.
   - Atualizar docs para refletir o escopo real.
3) Se implementar:
   - Definir estrategia por canal (OAuth, webhooks, envio).
   - Criar rotas de connect/status e normalizacao em `apps/agents`.

### Etapa 4 - Onboarding expandido (opcional, sem bloquear)
1) Adicionar etapas opcionais:
   - Pipeline modelo (criar e salvar etapas).
   - Importacao CSV de contatos.
   - Convite de equipe (roles).
2) Persistir progresso em `workspace_settings.onboarding_etapas`.
3) Manter skip para todas as etapas e banner de lembrete.

### Etapa 5 - Billing/checkout
1) Integrar Stripe:
   - Criar checkout por plano e add-ons.
   - Webhook para atualizar `workspaces.plano`.
2) Sincronizar `workspace_credits` por periodo:
   - Reset mensal por plano.
   - Compra de pacotes extras.
3) Atualizar UI de cobranca com status real (trial, ativo, cancelado).

### Etapa 6 - Docs e QA final
1) Atualizar `docs/escopo-do-crm.md` e `docs/planejamento-backend.md`.
2) Documentar env vars de Instagram e onboarding.
3) Checklist manual:
   - Envio/recebimento IG no inbox.
   - Criacao de agentes e follow-ups.
   - Relatorios e exportacao.
