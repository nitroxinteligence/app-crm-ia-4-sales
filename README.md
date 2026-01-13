# VP CRM

CRM da Vertical Partners em Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
Este repositório inclui o frontend, rotas de API do Next e o serviço de agentes em `apps/agents`.

## Rodar localmente

1) Instale deps:

```bash
npm install
```

2) Configure o `.env`:

```bash
cp .env.example .env
```

3) Inicie o frontend:

```bash
npm run dev
```

Acesse: http://localhost:3000

## Serviços e integrações

- Supabase (auth, dados e storage) via `src/lib/supabase`.
- Serviço de agentes (FastAPI + LangGraph + Celery) em `apps/agents`.
- WhatsApp oficial (Meta Graph API) e WhatsApp não-oficial (UAZAPI).
- Instagram (Graph API).
- Google Calendar (OAuth + webhooks).

## Dependencias nativas (agents service)

Para processamento de midia/ocr no service de agentes (`apps/agents`), instale:
- `ffmpeg` (audio/video)
- `tesseract` (OCR de imagens)
- `poppler` (extracao de texto de PDF)

## Variaveis de ambiente

Defina no `.env` da raiz (veja `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENTS_API_URL`, `AGENTS_API_KEY`
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_GRAPH_VERSION`
- `NEXT_PUBLIC_WHATSAPP_APP_ID`, `NEXT_PUBLIC_WHATSAPP_CONFIG_ID`
- `REDIS_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_WEBHOOK_URL`

Para o serviço de agentes, siga o `apps/agents/README.md` e use `apps/agents/.env.example`.

## Rotas principais

Auth e onboarding:
- `/entrar`, `/cadastro`, `/recuperar-senha`, `/atualizar-senha`
- `/onboarding`, `/convite`, `/planos`

App:
- `/app/painel`, `/app/inbox`, `/app/funil`, `/app/pipeline`
- `/app/leads`, `/app/contatos`, `/app/calendario`
- `/app/agentes`, `/app/agentes/novo`, `/app/agentes/[id]`
- `/app/relatorios`, `/app/integracoes`, `/app/canais`, `/app/planos`
- `/app/configuracoes` e subrotas:
  - `/app/configuracoes/perfil`
  - `/app/configuracoes/equipe`
  - `/app/configuracoes/campos`
  - `/app/configuracoes/cobranca`
  - `/app/configuracoes/idioma`
  - `/app/configuracoes/privacidade`
  - `/app/configuracoes/integracoes`

Estados do painel (via query param):
- `/app/painel?estado=loading`
- `/app/painel?estado=empty`
- `/app/painel?estado=error`
- `/app/painel?estado=denied`

## API routes (Next.js)

As rotas ficam em `src/app/api` e incluem:
- `calendar`: eventos, sync e webhooks Google Calendar
- `crm`: conversao de leads
- `inbox`: conversas, tags, notas, deals, bloqueio, envio e templates WhatsApp
- `integrations`: WhatsApp, WhatsApp nao-oficial (UAZAPI), Instagram e Google
- `reports`: atendimentos, negocios e exportacao
- `settings`: perfil, equipe, campos, cobranca, privacidade, convites
- `tasks`: listagem e detalhe por id
- `plans`: status e selecao
- `agentes`: sandbox e processamento de conhecimento
- `webhooks`: WhatsApp/Instagram (processamento via agents)

## Scripts uteis

- `npm run dev`: inicia o app
- `npm run build`: build de producao
- `npm run start`: server do build
- `npm run lint`: lint com eslint-config-next
- `npm run reports:backfill`: recalcula eventos de relatorios
- `npm run reports:refresh`: atualiza views de relatorios

## Estrutura do projeto

- `src/app/`: rotas e layouts (Next.js App Router)
- `src/components/`: componentes e UI (shadcn/ui em `src/components/ui`)
- `src/lib/`: tipos, mocks, formatadores, integracoes e navegacao
- `public/`: assets estaticos
- `docs/`: escopo, planejamento e integracoes
- `supabase/migrations/`: migracoes de banco
- `apps/agents/`: servico FastAPI + Celery (ver README local)
- `temp-crm/`: area legada/rascunho (nao editar)
