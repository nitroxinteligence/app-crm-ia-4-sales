# Agents Service

Servico FastAPI + LangGraph usado pelo VP CRM para automacoes e processamento de webhooks.

## Local setup

1) Configure o `.env`:

```
cp .env.example .env
```

O service carrega variaveis do `.env` da raiz e de `apps/agents/.env`.

2) Instale deps:

```
pip install -r requirements.txt
```

3) Suba a API:

```
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

4) Suba o worker:

```
celery -A app.workers.celery_app worker --loglevel=info
```

## Variaveis de ambiente

- `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (ou `UPSTASH_REDIS_URL`)
- `OPENAI_API_KEY` e/ou `GEMINI_API_KEY`
- `AGENTS_API_KEY` (opcional, valida `X-Agents-Key`)
- `WHATSAPP_GRAPH_URL`, `WHATSAPP_API_VERSION`
- `UAZAPI_BASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Notas

- Redis e obrigatorio para Celery e cache.
- As credenciais de WhatsApp/Google sao carregadas do Supabase.
