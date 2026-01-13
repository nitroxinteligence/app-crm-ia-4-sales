# WhatsApp Ingestion

Fluxo (WhatsApp oficial):
1) `POST /api/webhooks/whatsapp` recebe payload e valida assinatura
2) Persiste em `webhook_events`
3) Chama `AGENTS_API_URL/webhooks/whatsapp/process`
4) O service de agentes enfileira via Celery e normaliza em `leads`,
   `conversations`, `messages`

Fluxo (WhatsApp nao-oficial / UAZAPI):
1) `POST /api/webhooks/whatsapp-nao-oficial` recebe payload (token opcional)
2) Persiste em `webhook_events` com `integration_id`
3) Chama `AGENTS_API_URL/webhooks/whatsapp-nao-oficial/process`
4) O service de agentes processa a ingestao

Requisitos:
- `AGENTS_API_URL` e, se configurado, `AGENTS_API_KEY`
- `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` (oficial)
- `UAZAPI_WEBHOOK_SECRET` (nao-oficial, opcional)
