# Plano detalhado: autenticacao, convites, planos e gate de acesso (billing futuro)

Este documento consolida requisitos confirmados e o plano tecnico para:
- Autenticacao e cadastro (Supabase Auth + Resend).
- Fluxo de convites com aceite.
- Gate de acesso com onboarding + escolha de plano + trial de 30 dias.
- Billing adiado (planejado para fase futura, possivel Stripe).
- Implicacoes operacionais do service de agentes (WhatsApp only).

## 1) Decisoes confirmadas (escopo fechado)

- Agente IA funciona apenas no WhatsApp (Instagram sem agente).
- Supermemory fora do escopo (futuro).
- Nao exibir aviso de "multimodal indisponivel".
- Pagamento adiado (sem integracao agora; possivel Stripe no futuro).
- Convites: convidado cria conta normalmente, com email pre-preenchido e confirmado.
- Pagina inicial vira cadastro quando nao autenticado. Se autenticado, ir para `/app/painel`.
- Fluxo principal: cadastro -> onboarding -> planos -> trial 30 dias -> app liberado.
- Obrigatorio escolher um plano para continuar (sem plano, sem acesso).
- Ao expirar trial: bloqueio total com modal informativo (sem checkout agora).
- Detalhes de planos, descontos e creditos em `docs/planos-e-creditos.md`.
- Email de remetente: `noreply@verticalsales.com.br`.

## 2) Estado atual relevante (codebase)

- Auth (login/cadastro/reset) ja existe via Supabase:
  - `src/components/auth/form-cadastro.tsx`
  - `src/components/auth/form-login.tsx`
  - `src/components/auth/form-recuperar-senha.tsx`
  - `src/components/auth/form-atualizar-senha.tsx`
- Workspace e profile sao criados por trigger `handle_new_user`:
  - `supabase/migrations/20250309000100_settings_core.sql`
- Convites existem em `workspace_invites`, mas nao ha aceite:
  - `src/app/api/settings/invites/route.ts`
- Billing atual e somente visual (sem fluxo real):
  - `src/components/configuracoes/visao-cobranca.tsx`
  - `src/app/api/settings/billing/route.ts`
- Home atual e landing simples:
  - `src/app/page.tsx`

## 3) Fluxo de acesso e gate principal

### 3.1 Regras de acesso (estado do workspace)
Estados minimos para controlar acesso:
- `plan_unselected`: sem plano escolhido (bloqueio total).
- `trialing`: plano escolhido, trial ativo (acesso liberado).
- `trial_expired`: trial expirado (bloqueio total).
Estados futuros (quando houver billing):
- `active`, `past_due`, `canceled`.

### 3.2 Fluxo principal
1) Usuario acessa `/`:
   - Se nao autenticado: mostrar formulario de cadastro.
   - Se autenticado: redirecionar para `/app/painel`.
2) Cadastro concluido:
   - Vai para onboarding (wizard).
3) Conclui onboarding:
   - Vai para tela de planos obrigatoria.
4) Escolhe plano:
   - Inicia trial de 30 dias.
   - Acesso ao app liberado.
5) Trial expira:
   - Bloqueio total do app.
   - Modal informativo (checkout sera implementado depois).

### 3.3 Gate tecnico (front + server)
- Middleware/layout deve bloquear navegacao para qualquer rota `/app/*`
  quando `plan_unselected` ou `trial_expired`.
- Gate unico no AppShell (ex: `src/components/estrutura/billing-gate.tsx`)
  renderiza modal informativo quando status for bloqueio.
- API `/api/billing/status` deve retornar o estado atual do workspace.

## 4) Autenticacao + Resend (Supabase)

### 4.1 Cadastro padrao
- `auth.signUp` continua sendo usado no client.
- `raw_user_meta_data` deve incluir:
  - `full_name`
  - `workspace_name`
  - `invite_token` (opcional, para convites)
- Confirmacao de email deve ficar ativa para cadastros normais.

### 4.2 Reset de senha
- Ja existe em `FormRecuperarSenha`.
- Ajustar `redirectTo` para URL correta de prod/dev.
- Configurar templates de email do Supabase via SMTP Resend.

### 4.3 Confirmacao de email
- Configurar SMTP no Supabase usando Resend.
- Ajustar `SITE_URL` e redirects no Supabase.

### 4.4 Resend
Variaveis sugeridas:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=noreply@verticalsales.com.br`
- `NEXT_PUBLIC_SITE_URL` (usado em links)

## 5) Convites (Supabase Auth + Resend)

### 5.1 Regras
- Convidado cria conta normalmente.
- Email pre-preenchido e confirmado (sem exigir confirmacao manual).
- Se convidado ja foi chamado, permitir "reenviar convite".

### 5.2 Fluxo proposto
1) Admin cria convite (API server-side):
   - `POST /api/invites/create`
   - Insere em `workspace_invites` com `token`, `status=pendente`.
   - Envia email via Resend com link: `/convite?token=...`.
2) Convidado acessa link:
   - Pagina `/convite` valida token e preenche email.
   - Usuario define nome + senha.
3) Aceite server-side (service role):
   - `POST /api/invites/accept`
   - Cria usuario via Admin API (`email_confirm=true`).
   - Cria profile e adiciona `workspace_members`.
   - Marca convite como `aceito`.
4) Reenvio:
   - `POST /api/invites/resend` reutiliza token ativo ou cria novo.

### 5.3 Ajuste de trigger `handle_new_user`
Para convites, evitar criar workspace novo:
- Se `raw_user_meta_data.invite_token` existir:
  - Buscar convite valido.
  - Criar apenas `profiles`.
  - Inserir em `workspace_members` do workspace do convite.
  - Atualizar status do convite.
- Caso contrario, fluxo atual permanece (cria workspace).

Arquivo alvo:
- `supabase/migrations/20250309000100_settings_core.sql`

## 6) Planos e trial (30 dias)

### 6.1 Campos sugeridos (DB)
Adicionar em `workspaces`:
- `plano_periodo` (mensal | semestral | anual)
- `plano_selected_at`
- `trial_started_at`
- `trial_ends_at` (definir 30 dias)
- `billing_status` (enum ou text)

Adicionar tabelas:
- `billing_customers`
- `billing_subscriptions`
- `billing_invoices`
- `billing_events`
- `billing_payment_methods` (se necessario)

### 6.2 Regras de negocio
- Usuario nao entra no app sem `plano_selected_at`.
- Trial inicia no momento da escolha do plano.
- Trial expira em 30 dias.
- Se `trial_ends_at` expirou, status vira `trial_expired`.

### 6.3 UI/UX
- Tela de planos obrigatoria apos onboarding.
- Ao expirar trial: modal bloqueante informativo em todo o app.

### 6.4 Precificacao e descontos (fonte oficial)
Fonte: `docs/planos-e-creditos.md`.

Planos mensais:
- Essential: R$ 97/mes (sem IA).
- Pro: R$ 597/mes (com IA).
- Premium: R$ 897/mes.

Descontos:
- Semestral: 10% off (6 meses a vista).
- Anual: 20% off (12 meses a vista).

Valores a vista (conforme doc):
- Essential: semestral R$ 523,80 | anual R$ 931,20.
- Pro: semestral R$ 3.223,80 | anual R$ 5.731,20.
- Premium: semestral R$ 4.843,80 | anual R$ 8.611,20.

Add-ons (quando billing existir):
- Usuario/membro extra: R$ 59/mes.
- Canal extra: R$ 79/mes.
- Pacotes de creditos: 10k / 30k / 100k.
## 7) Billing futuro (Stripe)

Sem implementacao agora. Manter apenas o planejamento para uma fase futura:
- Checkout/assinaturas via Stripe.
- Webhook para atualizar `billing_status`.
- Portal do cliente (upgrade/downgrade/cancelamento).

## 8) Implicacoes do service de agentes

- Service de agentes e separado (FastAPI + Celery + Redis).
- Sem service rodando, webhooks/sandbox/knowledge falham.
- Recomendado: healthcheck + alerta operacional.
- WhatsApp only: nenhum processamento de agente no Instagram.

## 9) Multimodal (audio/imagem/pdf)

- Nao exibir aviso na UI.
- Infra precisa garantir dependencias no service:
  - `ffmpeg`, `tesseract`, `poppler`
  - `OPENAI_API_KEY` e/ou `GEMINI_API_KEY`
- Sem isso, o agente perde contexto de midia.

## 10) Mudancas de codigo (mapa rapido)

Frontend:
- `/` virar cadastro (ex: usar `FormCadastro`).
- Gate global no AppShell para bloquear acesso (modal).
- Tela de planos obrigatoria apos onboarding.

Backend:
- Rotas de convites: create/resend/accept.
- Endpoint de status de plano/trial (ex: `/api/billing/status` ou `/api/plans/status`).
- Ajustar `handle_new_user` (Supabase).

DB:
- Novos campos de plano/trial.
- Ajustar `trial_ends_at` para 30 dias (quando plano escolhido).
- Estruturas de billing ficam para fase futura.

## 11) Pendencias para fechar 100%

- Validar copy final do modal de bloqueio do trial.
- Definir se/como billing sera implementado (Stripe futuro).

## 12) Checklist de aceite

- Cadastro e login funcionando com email confirmado via Resend.
- Convite cria usuario e adiciona ao workspace correto.
- Usuario sem plano nao acessa `/app/*`.
- Trial inicia na escolha do plano e expira em 30 dias.
- Modal informativo bloqueia acesso apos expirar trial (checkout futuro).
- Agente WhatsApp funciona com service ativo.
