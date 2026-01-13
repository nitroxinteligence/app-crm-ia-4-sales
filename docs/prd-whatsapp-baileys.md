# PRD - Integracao WhatsApp Baileys (Provider novo)

## Visao
Integrar WhatsApp via Baileys (WhatsApp Web) para o inbox `/app/inbox`, com leitura de QR Code, ingestao de conversas (ultimos 14 dias) e envio de mensagens (texto, audio e documentos). Manter integracao oficial em paralelo.

## Objetivos
- Conectar o WhatsApp do usuario via QR Code.
- Importar historico dos ultimos 14 dias e alimentar o inbox.
- Receber mensagens em tempo real (mensagens novas e updates).
- Permitir envio de texto, audio e documentos (pdf, csv, xlsx, txt, imagens).
- Armazenar midias no Supabase Storage e metadados em `messages` + `attachments`.
- Arquitetura modular com servico dedicado e compatibilidade com o pipeline atual.

## Fora de escopo (por agora)
- Substituir a API oficial (Cloud API).
- Envio de sticker, lista, botoes interativos, catalogo.
- Multi-contas por workspace (suportar apenas 1 por enquanto).
- Busca full-text e recursos avancados de roteamento.

## Requisitos funcionais
- Provider novo: `whatsapp_baileys`.
- QR Code exposto no frontend para leitura.
- Status de conexao (conectado, desconectado, conectando).
- Sync inicial de historico (ultimos 14 dias) ao conectar.
- Ingestao de mensagens em tempo real.
- Suporte a mensagens de grupo com `sender_*` preenchidos.
- Envio de mensagens e anexos a partir do chat do inbox.
- Registro em Supabase em `leads`, `conversations`, `messages`, `attachments`.

## Requisitos nao funcionais
- Servico Baileys deve ser processo sempre ligado.
- Estado de sessao persistido no Supabase.
- Escalavel para multiplas contas no futuro.
- Observabilidade minima (logs estruturados + erros salvos).

## Decisoes de arquitetura
### Melhor abordagem para integrar Baileys
- Criar um **servico Node dedicado** (ex: `apps/baileys`), pois Baileys exige conexao WebSocket persistente.
- O servico Baileys escreve diretamente no Supabase (service role), reduzindo hops e complexidade.
- Next.js continua como orquestrador (UI + endpoints) e apenas chama o servico Baileys para connect/status/send.

### Justificativa
- Next.js (App Router) nao e adequado para manter conexoes WS long-lived.
- Baileys em Node tem melhor compatibilidade e isolamento.
- Supabase centraliza dados e garante que o Inbox continue funcional.

## Fluxos

### 1) Conectar (QR Code)
1. Usuario abre modal Baileys.
2. `POST /api/integrations/whatsapp-baileys/connect` (Next) cria/ativa integration_account e chama `BAILEYS_API_URL/sessions`.
3. Servico Baileys inicia sessao e retorna `qr`.
4. Next retorna `qr` para UI.
5. UI exibe QR e faz polling de status.

### 2) Status
1. UI chama `GET /api/integrations/whatsapp-baileys/status`.
2. Next consulta Supabase + `BAILEYS_API_URL/sessions/:id`.
3. Retorna `connected`, `status`, `numero`, `last_seen`.

### 3) Sync historico (14 dias)
1. Ao conectar, Baileys recebe `messaging-history.set`.
2. Servico filtra mensagens com `timestamp >= now - 14 dias`.
3. Upsert em `leads`, `conversations`, `messages`, `attachments`.
4. Atualiza `integration_accounts.sync_status = done`.

### 4) Mensagens novas
1. `messages.upsert` recebido no Baileys.
2. Normaliza payload e grava no Supabase.
3. Atualiza `conversations.ultima_mensagem` e `ultima_mensagem_em`.

### 5) Envio de mensagens
1. UI chama `/api/inbox/send` (ja existe).
2. Nova logica: quando provider = `whatsapp_baileys`, chamar `BAILEYS_API_URL/messages/send`.
3. Servico envia via Baileys e retorna messageId.
4. Next salva mensagem e anexos no Supabase.

## Dados e schema

### Tabelas existentes (reuso)
- `integration_accounts` (provider, status, numero, instance_id)
- `integration_tokens` (usar para tokens internos se necessario)
- `leads`, `conversations`, `messages`, `attachments`

### Novas tabelas sugeridas
1) `whatsapp_baileys_sessions`
- `id` (uuid)
- `integration_account_id` (uuid)
- `auth_state` (jsonb) - credenciais + chaves
- `status` (text)
- `last_qr` (text)
- `last_seen_at` (timestamptz)
- `updated_at` (timestamptz)

2) (Opcional) `whatsapp_baileys_events`
- para log de erros/diagnosticos de ingestao

### Observacao
- Baileys usa `auth` com chaves criptograficas. Guardar em JSONB no Supabase e considerar criptografia (AES via env key).

## APIs (Next)

- `POST /api/integrations/whatsapp-baileys/connect`
  - body: { workspaceId }
  - cria `integration_accounts` com provider `whatsapp_baileys`
  - chama Baileys para iniciar sessao
  - retorna `{ integrationAccountId, qr, status }`

- `GET /api/integrations/whatsapp-baileys/status?workspaceId=...`
  - retorna status + qr atual

- `POST /api/integrations/whatsapp-baileys/disconnect`
  - encerra sessao e atualiza status

## APIs (Baileys Service)

- `POST /sessions`
  - body: { integrationAccountId, workspaceId }
  - inicia sessao, gera QR

- `GET /sessions/:id`
  - retorna status, qr, numero, last_seen

- `POST /sessions/:id/disconnect`
  - encerra sessao

- `POST /messages/send`
  - body: { integrationAccountId, to, type, text?, mediaUrl?, mimeType?, fileName? }
  - envia mensagem

## Mapeamento de mensagens (Baileys -> Supabase)

- `remoteJid` -> `lead.whatsapp_wa_id`
- `pushName` -> `lead.nome`
- `message.key.id` -> `messages.whatsapp_message_id`
- `message.message.conversation` -> texto
- midia -> baixar com `downloadMediaMessage` e salvar no Storage
- grupos -> `sender_id`, `sender_nome`, `sender_avatar_url`

## UI/UX
- Novo card de integracao: "WhatsApp (Baileys)".
- Modal de QR Code similar ao atual de "Nao Oficial".
- Exibir status de sincronizacao (running/done/erro).
- Aviso legal: integracao nao oficial (termo de uso do WhatsApp).

## Seguranca
- Rotas Next e Baileys protegidas via `X-API-KEY` interno.
- Service role apenas no Baileys service.
- Criptografia do auth_state no banco (AES com chave em env).

## Riscos e mitigacoes
- WhatsApp Web nao garante historico completo -> limitar a 14 dias e explicar ao usuario.
- Queda de sessao -> reconectar automaticamente e regenerar QR.
- Bloqueio de conta -> monitorar status e exibir aviso.

## Checklist completo

### Infra e servico Baileys
- [ ] Criar `apps/baileys` (Node service)
- [ ] Adicionar `@whiskeysockets/baileys` + dependencias
- [ ] Implementar sessao persistente (Supabase JSONB)
- [ ] Implementar eventos: `connection.update`, `messages.upsert`, `messaging-history.set`
- [ ] Implementar envio: texto, audio, imagem, documentos
- [ ] Implementar download e upload de midia para Supabase
- [ ] Logs estruturados e erros salvos

### Supabase
- [ ] Criar tabela `whatsapp_baileys_sessions`
- [ ] (Opcional) tabela de logs `whatsapp_baileys_events`
- [ ] Atualizar `integration_accounts.provider` para aceitar `whatsapp_baileys`

### Next.js API
- [ ] `connect` (criar conta e iniciar sessao)
- [ ] `status` (polling e QR)
- [ ] `disconnect`
- [ ] Atualizar `/api/inbox/send` para provider `whatsapp_baileys`

### UI
- [ ] Adicionar integracao em `src/lib/integracoes.ts`
- [ ] Criar modal Baileys (copy do nao-oficial com ajustes)
- [ ] Atualizar `visao-integracoes.tsx` para novo card
- [ ] Exibir status de sync no inbox

### Validacao
- [ ] Conectar conta e gerar QR
- [ ] Sync 14 dias com conversas e midias
- [ ] Enviar texto/arquivo/audio pelo inbox
- [ ] Receber mensagem nova em tempo real

## Plano de acao (ordem recomendada)
1. Criar servico Baileys e endpoints basicos (connect/status/disconnect).
2. Persistencia da sessao no Supabase (auth_state).
3. Ingestao de mensagens (history + upsert) e grava em Supabase.
4. Envio de mensagens e anexos.
5. API Next para integrar UI.
6. UI de integracao e ajustes no Inbox.
7. Observabilidade e tratamento de erros.

## Variaveis de ambiente
- `BAILEYS_API_URL`
- `BAILEYS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BAILEYS_AUTH_SECRET` (chave AES)
