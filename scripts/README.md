# Scripts

Scripts utilitarios para manter relatorios e eventos sincronizados via Supabase.

## Requisitos

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Comandos

Recalcular eventos usados nos relatorios:

```
npm run reports:backfill
```

Atualizar as views de relatorios:

```
npm run reports:refresh
```

## Nota

O processamento de eventos de WhatsApp ocorre no service de agentes via Celery.
Suba o worker em `apps/agents` para consumir a fila.
