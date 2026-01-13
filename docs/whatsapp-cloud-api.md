# WhatsApp Cloud API - Notas de Integracao

Este documento descreve a estrategia de integracao com a WhatsApp Cloud API (Meta), com foco em Embedded Signup, webhooks e processamento de mensagens.

## 1) Embedded Signup (Meta)

Fluxo recomendado para conectar o WhatsApp oficial do cliente:

1. Criar App no Meta Developers
2. Ativar produto "WhatsApp"
3. Configurar Embedded Signup
4. Receber `code` e trocar por `access_token`
5. Armazenar `access_token` e `phone_number_id` no banco
6. Configurar webhook

Campos que precisamos salvar:
- `phone_number_id`
- `waba_id`
- `business_account_id`
- `access_token` (curto e longo prazo)
- `expires_at`

## 2) Webhooks

- Endpoint: `/api/webhooks/whatsapp`
- Verificacao via `hub.challenge`
- Validacao de assinatura `x-hub-signature-256`
- Payload bruto armazenado em `webhook_events`

## 3) Normalizacao

Entrada `messages[]`:
- Criar/atualizar `lead`
- Criar/atualizar `conversation`
- Inserir `message`

Saida:
- Realtime atualiza `/app/inbox`

## 4) Midias

- Download via endpoint de midia do WhatsApp
- Validar limite 5 MB
- Armazenar em Supabase Storage
- Criar registro em `attachments`

## 5) Templates

- Sincronizar templates aprovados
- Armazenar em `whatsapp_templates`
- Expor para UI de quick replies/templates

## 6) Rate limits e retry

- Fila BullMQ para processar webhooks e envio
- Backoff exponencial para falhas
