2026-01-19T01:25:23.296Z	Initializing build environment...
2026-01-19T01:25:24.865Z	Success: Finished initializing build environment
2026-01-19T01:25:25.133Z	Cloning repository...
2026-01-19T01:25:26.435Z	Restoring from dependencies cache
2026-01-19T01:25:26.437Z	Restoring from build output cache
2026-01-19T01:25:26.439Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-01-19T01:25:26.575Z	Installing project dependencies: npm clean-install --progress=false
2026-01-19T01:25:32.662Z	npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
2026-01-19T01:26:06.858Z	
2026-01-19T01:26:06.858Z	added 1040 packages, and audited 1041 packages in 40s
2026-01-19T01:26:06.859Z	
2026-01-19T01:26:06.859Z	204 packages are looking for funding
2026-01-19T01:26:06.859Z	  run `npm fund` for details
2026-01-19T01:26:07.343Z	
2026-01-19T01:26:07.344Z	14 low severity vulnerabilities
2026-01-19T01:26:07.344Z	
2026-01-19T01:26:07.344Z	To address issues that do not require attention, run:
2026-01-19T01:26:07.344Z	  npm audit fix
2026-01-19T01:26:07.344Z	
2026-01-19T01:26:07.345Z	To address all issues (including breaking changes), run:
2026-01-19T01:26:07.345Z	  npm audit fix --force
2026-01-19T01:26:07.345Z	
2026-01-19T01:26:07.345Z	Run `npm audit` for details.
2026-01-19T01:26:07.546Z	Executing user build command: npm run pages:build
2026-01-19T01:26:07.848Z	
2026-01-19T01:26:07.848Z	> temp-crm@0.1.0 pages:build
2026-01-19T01:26:07.848Z	> next build && npx opennextjs-cloudflare build
2026-01-19T01:26:07.848Z	
2026-01-19T01:26:08.730Z	⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2026-01-19T01:26:08.734Z	Attention: Next.js now collects completely anonymous telemetry regarding usage.
2026-01-19T01:26:08.734Z	This information is used to shape Next.js' roadmap and prioritize features.
2026-01-19T01:26:08.734Z	You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2026-01-19T01:26:08.734Z	https://nextjs.org/telemetry
2026-01-19T01:26:08.734Z	
2026-01-19T01:26:08.744Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-19T01:26:08.744Z	
2026-01-19T01:26:08.835Z	  Creating an optimized production build ...
2026-01-19T01:26:29.192Z	✓ Compiled successfully in 19.9s
2026-01-19T01:26:29.234Z	  Running TypeScript ...
2026-01-19T01:26:48.125Z	  Collecting page data using 1 worker ...
2026-01-19T01:26:49.072Z	  Generating static pages using 1 worker (0/98) ...
2026-01-19T01:26:49.183Z	  Generating static pages using 1 worker (24/98) 
2026-01-19T01:26:49.197Z	  Generating static pages using 1 worker (48/98) 
2026-01-19T01:26:49.480Z	  Generating static pages using 1 worker (73/98) 
2026-01-19T01:26:49.789Z	✓ Generating static pages using 1 worker (98/98) in 716.8ms
2026-01-19T01:26:49.801Z	  Finalizing page optimization ...
2026-01-19T01:26:49.815Z	
2026-01-19T01:26:49.817Z	Route (app)
2026-01-19T01:26:49.817Z	┌ ○ /
2026-01-19T01:26:49.817Z	├ ○ /_not-found
2026-01-19T01:26:49.817Z	├ ƒ /api/agentes/conhecimento/processar
2026-01-19T01:26:49.817Z	├ ƒ /api/agentes/sandbox
2026-01-19T01:26:49.817Z	├ ƒ /api/auth/api-keys
2026-01-19T01:26:49.817Z	├ ƒ /api/auth/api-keys/[keyId]
2026-01-19T01:26:49.817Z	├ ƒ /api/calendar/events
2026-01-19T01:26:49.817Z	├ ƒ /api/calendar/events/[eventId]
2026-01-19T01:26:49.817Z	├ ƒ /api/calendar/sync
2026-01-19T01:26:49.817Z	├ ƒ /api/contacts
2026-01-19T01:26:49.817Z	├ ƒ /api/contacts/[contactId]
2026-01-19T01:26:49.817Z	├ ƒ /api/crm/leads/convert
2026-01-19T01:26:49.817Z	├ ƒ /api/deals
2026-01-19T01:26:49.817Z	├ ƒ /api/deals/[dealId]
2026-01-19T01:26:49.818Z	├ ƒ /api/healthz
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/block
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/conversations/[conversationId]
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/deals
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/notes
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/quick-replies
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/send
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/tags
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/whatsapp/send-template
2026-01-19T01:26:49.818Z	├ ƒ /api/inbox/whatsapp/templates
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/google/callback
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/google/connect
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/google/disconnect
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/google/status
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/instagram/connect
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/instagram/status
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/whatsapp-baileys/connect
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/whatsapp-baileys/disconnect
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/whatsapp-baileys/groups
2026-01-19T01:26:49.818Z	├ ƒ /api/integrations/whatsapp-baileys/status
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp-nao-oficial/connect
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp-nao-oficial/disconnect
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp-nao-oficial/status
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp-nao-oficial/sync
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp/connect
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp/status
2026-01-19T01:26:49.819Z	├ ƒ /api/integrations/whatsapp/templates/sync
2026-01-19T01:26:49.819Z	├ ƒ /api/invites/accept
2026-01-19T01:26:49.819Z	├ ƒ /api/invites/resend
2026-01-19T01:26:49.819Z	├ ƒ /api/invites/validate
2026-01-19T01:26:49.819Z	├ ƒ /api/leads
2026-01-19T01:26:49.819Z	├ ƒ /api/leads/[leadId]
2026-01-19T01:26:49.819Z	├ ƒ /api/pipeline
2026-01-19T01:26:49.819Z	├ ƒ /api/pipeline/[pipelineId]
2026-01-19T01:26:49.819Z	├ ƒ /api/pipeline/stages
2026-01-19T01:26:49.819Z	├ ƒ /api/plans/select
2026-01-19T01:26:49.819Z	├ ƒ /api/plans/status
2026-01-19T01:26:49.820Z	├ ƒ /api/realtime/auth
2026-01-19T01:26:49.820Z	├ ƒ /api/reports/atendimentos
2026-01-19T01:26:49.824Z	├ ƒ /api/reports/export
2026-01-19T01:26:49.824Z	├ ƒ /api/reports/negocios
2026-01-19T01:26:49.824Z	├ ƒ /api/settings/billing
2026-01-19T01:26:49.824Z	├ ƒ /api/settings/fields
2026-01-19T01:26:49.824Z	├ ƒ /api/settings/fields/[fieldId]
2026-01-19T01:26:49.824Z	├ ƒ /api/settings/invites
2026-01-19T01:26:49.825Z	├ ƒ /api/settings/privacy
2026-01-19T01:26:49.826Z	├ ƒ /api/settings/profile
2026-01-19T01:26:49.826Z	├ ƒ /api/settings/team
2026-01-19T01:26:49.826Z	├ ƒ /api/storage/signed-url
2026-01-19T01:26:49.826Z	├ ƒ /api/tasks
2026-01-19T01:26:49.826Z	├ ƒ /api/tasks/[taskId]
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/google-calendar
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/instagram
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/instagram/process
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/whatsapp
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/whatsapp-nao-oficial
2026-01-19T01:26:49.827Z	├ ƒ /api/webhooks/whatsapp/process
2026-01-19T01:26:49.827Z	├ ○ /app/agentes
2026-01-19T01:26:49.827Z	├ ƒ /app/agentes/[id]
2026-01-19T01:26:49.827Z	├ ○ /app/agentes/novo
2026-01-19T01:26:49.827Z	├ ○ /app/agentes/novo/configuracao
2026-01-19T01:26:49.827Z	├ ○ /app/calendario
2026-01-19T01:26:49.827Z	├ ○ /app/canais
2026-01-19T01:26:49.827Z	├ ○ /app/configuracoes
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/campos
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/cobranca
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/conexoes
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/equipe
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/idioma
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/integracoes
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/perfil
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/privacidade
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/produtos
2026-01-19T01:26:49.828Z	├ ○ /app/configuracoes/tags
2026-01-19T01:26:49.828Z	├ ○ /app/contatos
2026-01-19T01:26:49.828Z	├ ○ /app/funil
2026-01-19T01:26:49.828Z	├ ○ /app/inbox
2026-01-19T01:26:49.828Z	├ ○ /app/integracoes
2026-01-19T01:26:49.829Z	├ ○ /app/leads
2026-01-19T01:26:49.829Z	├ ƒ /app/painel
2026-01-19T01:26:49.829Z	├ ○ /app/pipeline
2026-01-19T01:26:49.829Z	├ ○ /app/planos
2026-01-19T01:26:49.829Z	├ ○ /app/relatorios
2026-01-19T01:26:49.829Z	├ ○ /atualizar-senha
2026-01-19T01:26:49.829Z	├ ○ /cadastro
2026-01-19T01:26:49.829Z	├ ○ /convite
2026-01-19T01:26:49.829Z	├ ○ /entrar
2026-01-19T01:26:49.829Z	├ ○ /login-v2
2026-01-19T01:26:49.829Z	├ ○ /modal-deal
2026-01-19T01:26:49.829Z	├ ○ /onboarding
2026-01-19T01:26:49.829Z	├ ○ /planos
2026-01-19T01:26:49.830Z	└ ○ /recuperar-senha
2026-01-19T01:26:49.830Z	
2026-01-19T01:26:49.830Z	
2026-01-19T01:26:49.830Z	○  (Static)   prerendered as static content
2026-01-19T01:26:49.830Z	ƒ  (Dynamic)  server-rendered on demand
2026-01-19T01:26:49.830Z	
2026-01-19T01:26:51.660Z	
2026-01-19T01:26:51.660Z	┌─────────────────────────────┐
2026-01-19T01:26:51.660Z	│ OpenNext — Cloudflare build │
2026-01-19T01:26:51.660Z	└─────────────────────────────┘
2026-01-19T01:26:51.660Z	
2026-01-19T01:26:51.833Z	▲ [WARNING] Processing wrangler.toml configuration:
2026-01-19T01:26:51.835Z	
2026-01-19T01:26:51.835Z	    - Unexpected fields found in assets field: "minify"
2026-01-19T01:26:51.835Z	
2026-01-19T01:26:51.835Z	
2026-01-19T01:26:51.835Z	WARN Next.js 16 is not fully supported yet! Some features may not work as expected.
2026-01-19T01:26:51.835Z	App directory: /opt/buildhome/repo
2026-01-19T01:26:51.835Z	Next.js version : 16.1.1
2026-01-19T01:26:51.838Z	@opennextjs/cloudflare version: 1.14.9
2026-01-19T01:26:51.838Z	@opennextjs/aws version: 3.9.8
2026-01-19T01:26:51.840Z	
2026-01-19T01:26:51.840Z	┌─────────────────────────────────┐
2026-01-19T01:26:51.840Z	│ OpenNext — Building Next.js app │
2026-01-19T01:26:51.840Z	└─────────────────────────────────┘
2026-01-19T01:26:51.840Z	
2026-01-19T01:26:51.989Z	
2026-01-19T01:26:51.990Z	> temp-crm@0.1.0 build
2026-01-19T01:26:51.990Z	> next build
2026-01-19T01:26:51.990Z	
2026-01-19T01:26:52.821Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-19T01:26:52.821Z	
2026-01-19T01:26:52.906Z	  Creating an optimized production build ...
2026-01-19T01:27:16.795Z	✓ Compiled successfully in 23.3s
2026-01-19T01:27:16.829Z	  Running TypeScript ...
2026-01-19T01:27:34.924Z	  Collecting page data using 1 worker ...
2026-01-19T01:27:35.966Z	  Generating static pages using 1 worker (0/98) ...
2026-01-19T01:27:36.067Z	  Generating static pages using 1 worker (24/98) 
2026-01-19T01:27:36.077Z	  Generating static pages using 1 worker (48/98) 
2026-01-19T01:27:36.413Z	  Generating static pages using 1 worker (73/98) 
2026-01-19T01:27:36.707Z	✓ Generating static pages using 1 worker (98/98) in 740.9ms
2026-01-19T01:27:36.717Z	  Finalizing page optimization ...
2026-01-19T01:27:38.635Z	
2026-01-19T01:27:38.638Z	Route (app)
2026-01-19T01:27:38.638Z	┌ ○ /
2026-01-19T01:27:38.638Z	├ ○ /_not-found
2026-01-19T01:27:38.638Z	├ ƒ /api/agentes/conhecimento/processar
2026-01-19T01:27:38.638Z	├ ƒ /api/agentes/sandbox
2026-01-19T01:27:38.638Z	├ ƒ /api/auth/api-keys
2026-01-19T01:27:38.638Z	├ ƒ /api/auth/api-keys/[keyId]
2026-01-19T01:27:38.638Z	├ ƒ /api/calendar/events
2026-01-19T01:27:38.639Z	├ ƒ /api/calendar/events/[eventId]
2026-01-19T01:27:38.639Z	├ ƒ /api/calendar/sync
2026-01-19T01:27:38.639Z	├ ƒ /api/contacts
2026-01-19T01:27:38.640Z	├ ƒ /api/contacts/[contactId]
2026-01-19T01:27:38.640Z	├ ƒ /api/crm/leads/convert
2026-01-19T01:27:38.640Z	├ ƒ /api/deals
2026-01-19T01:27:38.640Z	├ ƒ /api/deals/[dealId]
2026-01-19T01:27:38.643Z	├ ƒ /api/healthz
2026-01-19T01:27:38.644Z	├ ƒ /api/inbox/block
2026-01-19T01:27:38.644Z	├ ƒ /api/inbox/conversations/[conversationId]
2026-01-19T01:27:38.644Z	├ ƒ /api/inbox/deals
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/notes
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/quick-replies
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/send
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/tags
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/whatsapp/send-template
2026-01-19T01:27:38.645Z	├ ƒ /api/inbox/whatsapp/templates
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/google/callback
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/google/connect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/google/disconnect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/google/status
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/instagram/connect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/instagram/status
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-baileys/connect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-baileys/disconnect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-baileys/groups
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-baileys/status
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-nao-oficial/connect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-nao-oficial/disconnect
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-nao-oficial/status
2026-01-19T01:27:38.645Z	├ ƒ /api/integrations/whatsapp-nao-oficial/sync
2026-01-19T01:27:38.646Z	├ ƒ /api/integrations/whatsapp/connect
2026-01-19T01:27:38.646Z	├ ƒ /api/integrations/whatsapp/status
2026-01-19T01:27:38.646Z	├ ƒ /api/integrations/whatsapp/templates/sync
2026-01-19T01:27:38.646Z	├ ƒ /api/invites/accept
2026-01-19T01:27:38.646Z	├ ƒ /api/invites/resend
2026-01-19T01:27:38.646Z	├ ƒ /api/invites/validate
2026-01-19T01:27:38.646Z	├ ƒ /api/leads
2026-01-19T01:27:38.646Z	├ ƒ /api/leads/[leadId]
2026-01-19T01:27:38.646Z	├ ƒ /api/pipeline
2026-01-19T01:27:38.646Z	├ ƒ /api/pipeline/[pipelineId]
2026-01-19T01:27:38.646Z	├ ƒ /api/pipeline/stages
2026-01-19T01:27:38.646Z	├ ƒ /api/plans/select
2026-01-19T01:27:38.646Z	├ ƒ /api/plans/status
2026-01-19T01:27:38.646Z	├ ƒ /api/realtime/auth
2026-01-19T01:27:38.646Z	├ ƒ /api/reports/atendimentos
2026-01-19T01:27:38.646Z	├ ƒ /api/reports/export
2026-01-19T01:27:38.646Z	├ ƒ /api/reports/negocios
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/billing
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/fields
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/fields/[fieldId]
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/invites
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/privacy
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/profile
2026-01-19T01:27:38.648Z	├ ƒ /api/settings/team
2026-01-19T01:27:38.649Z	├ ƒ /api/storage/signed-url
2026-01-19T01:27:38.651Z	├ ƒ /api/tasks
2026-01-19T01:27:38.651Z	├ ƒ /api/tasks/[taskId]
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/google-calendar
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/instagram
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/instagram/process
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/whatsapp
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/whatsapp-nao-oficial
2026-01-19T01:27:38.651Z	├ ƒ /api/webhooks/whatsapp/process
2026-01-19T01:27:38.652Z	├ ○ /app/agentes
2026-01-19T01:27:38.652Z	├ ƒ /app/agentes/[id]
2026-01-19T01:27:38.652Z	├ ○ /app/agentes/novo
2026-01-19T01:27:38.652Z	├ ○ /app/agentes/novo/configuracao
2026-01-19T01:27:38.652Z	├ ○ /app/calendario
2026-01-19T01:27:38.652Z	├ ○ /app/canais
2026-01-19T01:27:38.652Z	├ ○ /app/configuracoes
2026-01-19T01:27:38.652Z	├ ○ /app/configuracoes/campos
2026-01-19T01:27:38.652Z	├ ○ /app/configuracoes/cobranca
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/conexoes
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/equipe
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/idioma
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/integracoes
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/perfil
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/privacidade
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/produtos
2026-01-19T01:27:38.653Z	├ ○ /app/configuracoes/tags
2026-01-19T01:27:38.653Z	├ ○ /app/contatos
2026-01-19T01:27:38.653Z	├ ○ /app/funil
2026-01-19T01:27:38.653Z	├ ○ /app/inbox
2026-01-19T01:27:38.653Z	├ ○ /app/integracoes
2026-01-19T01:27:38.653Z	├ ○ /app/leads
2026-01-19T01:27:38.655Z	├ ƒ /app/painel
2026-01-19T01:27:38.655Z	├ ○ /app/pipeline
2026-01-19T01:27:38.655Z	├ ○ /app/planos
2026-01-19T01:27:38.655Z	├ ○ /app/relatorios
2026-01-19T01:27:38.655Z	├ ○ /atualizar-senha
2026-01-19T01:27:38.655Z	├ ○ /cadastro
2026-01-19T01:27:38.655Z	├ ○ /convite
2026-01-19T01:27:38.655Z	├ ○ /entrar
2026-01-19T01:27:38.655Z	├ ○ /login-v2
2026-01-19T01:27:38.656Z	├ ○ /modal-deal
2026-01-19T01:27:38.656Z	├ ○ /onboarding
2026-01-19T01:27:38.656Z	├ ○ /planos
2026-01-19T01:27:38.656Z	└ ○ /recuperar-senha
2026-01-19T01:27:38.656Z	
2026-01-19T01:27:38.656Z	
2026-01-19T01:27:38.656Z	○  (Static)   prerendered as static content
2026-01-19T01:27:38.656Z	ƒ  (Dynamic)  server-rendered on demand
2026-01-19T01:27:38.656Z	
2026-01-19T01:27:38.695Z	
2026-01-19T01:27:38.695Z	┌──────────────────────────────┐
2026-01-19T01:27:38.695Z	│ OpenNext — Generating bundle │
2026-01-19T01:27:38.695Z	└──────────────────────────────┘
2026-01-19T01:27:38.695Z	
2026-01-19T01:27:38.786Z	Bundling middleware function...
2026-01-19T01:27:38.855Z	Bundling static assets...
2026-01-19T01:27:38.919Z	Bundling cache assets...
2026-01-19T01:27:39.023Z	Building server function: default...
2026-01-19T01:27:42.694Z	Applying code patches: 2.303s
2026-01-19T01:27:43.031Z	# copyPackageTemplateFiles
2026-01-19T01:27:43.038Z	⚙️ Bundling the OpenNext server...
2026-01-19T01:27:43.038Z	
2026-01-19T01:27:44.161Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-19T01:27:44.162Z	
2026-01-19T01:27:44.167Z	    .open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1a61e49c._.js:1:36355:
2026-01-19T01:27:44.167Z	      1 │ ....unsigned){if(t<0)t+=m;else if(-0===t)return 0}return t}}e.expor...
2026-01-19T01:27:44.167Z	        ╵                                   ~~
2026-01-19T01:27:44.167Z	
2026-01-19T01:27:44.168Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-19T01:27:44.168Z	
2026-01-19T01:27:45.126Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-19T01:27:45.126Z	
2026-01-19T01:27:45.127Z	    .open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__bad23644._.js:1:36490:
2026-01-19T01:27:45.127Z	      1 │ ....unsigned){if(t<0)t+=m;else if(-0===t)return 0}return t}}e.expor...
2026-01-19T01:27:45.128Z	        ╵                                   ~~
2026-01-19T01:27:45.129Z	
2026-01-19T01:27:45.129Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-19T01:27:45.129Z	
2026-01-19T01:27:46.208Z	Worker saved in `.open-next/worker.js` 🚀
2026-01-19T01:27:46.210Z	
2026-01-19T01:27:46.210Z	OpenNext build complete.
2026-01-19T01:27:46.309Z	Success: Build command completed
2026-01-19T01:27:46.635Z	Executing user deploy command: npx wrangler deploy
2026-01-19T01:27:48.056Z	
2026-01-19T01:27:48.056Z	 ⛅️ wrangler 4.59.2
2026-01-19T01:27:48.056Z	───────────────────
2026-01-19T01:27:48.146Z	▲ [WARNING] Processing wrangler.toml configuration:
2026-01-19T01:27:48.146Z	
2026-01-19T01:27:48.147Z	    - Unexpected fields found in assets field: "minify"
2026-01-19T01:27:48.147Z	
2026-01-19T01:27:48.147Z	
2026-01-19T01:27:48.179Z	▲ [WARNING] Failed to match Worker name. Your config file is using the Worker name "app-crm-ia-4-sales", but the CI system expected "app-crm-ia-four-sales". Overriding using the CI provided Worker name. Workers Builds connected builds will attempt to open a pull request to resolve this config name mismatch.
2026-01-19T01:27:48.179Z	
2026-01-19T01:27:48.179Z	
2026-01-19T01:27:49.198Z	▲ [WARNING] The local configuration being used (generated from your local configuration file) differs from the remote configuration of your Worker set via the Cloudflare Dashboard:
2026-01-19T01:27:49.198Z	
2026-01-19T01:27:49.198Z	   {
2026-01-19T01:27:49.198Z	  +  assets: {
2026-01-19T01:27:49.198Z	  +    binding: "ASSETS"
2026-01-19T01:27:49.198Z	  +  }
2026-01-19T01:27:49.198Z	  -  compatibility_date: "2026-01-16"
2026-01-19T01:27:49.198Z	  +  compatibility_date: "2024-09-23"
2026-01-19T01:27:49.198Z	  -  name: "app-crm-ia-four-sales"
2026-01-19T01:27:49.198Z	  +  name: "app-crm-ia-4-sales"
2026-01-19T01:27:49.198Z	     routes: [
2026-01-19T01:27:49.198Z	  -    {
2026-01-19T01:27:49.198Z	  -      pattern: "crm.iafoursales.com"
2026-01-19T01:27:49.198Z	  -      zone_name: "iafoursales.com"
2026-01-19T01:27:49.198Z	  -      custom_domain: true
2026-01-19T01:27:49.198Z	  -    }
2026-01-19T01:27:49.199Z	     ]
2026-01-19T01:27:49.199Z	  -  workers_dev: false
2026-01-19T01:27:49.199Z	  +  workers_dev: true
2026-01-19T01:27:49.199Z	  -  preview_urls: false
2026-01-19T01:27:49.199Z	  +  preview_urls: true
2026-01-19T01:27:49.199Z	     vars: {
2026-01-19T01:27:49.199Z	  -    AGENTS_API_URL: "http://crm.iafoursales.com:8001"
2026-01-19T01:27:49.199Z	  -    BAILEYS_API_URL: "http://crm.iafoursales.com:7001"
2026-01-19T01:27:49.199Z	  -    GOOGLE_REDIRECT_URL: "http://crm.iafoursales.com/api/integrations/google/callback"
2026-01-19T01:27:49.199Z	  -    GOOGLE_WEBHOOK_URL: "https://crm.iafoursales.com/api/webhooks/google-calendar"
2026-01-19T01:27:49.199Z	  -    NEXT_PUBLIC_R2_BUCKET_NAME: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "https://{bucket}.{accountId}.r2.dev"
2026-01-19T01:27:49.199Z	  -    QSTASH_URL: "https://qstash.upstash.io"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_AGENT_KNOWLEDGE: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_CONTACT_AVATARS: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_CONTACT_FILES: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_INBOX_ATTACHMENTS: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_NAME: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	  -    R2_BUCKET_USER_AVATARS: "ia-four-sales-crm"
2026-01-19T01:27:49.199Z	     }
2026-01-19T01:27:49.199Z	   }
2026-01-19T01:27:49.199Z	  
2026-01-19T01:27:49.199Z	  
2026-01-19T01:27:49.199Z	  Deploying the Worker will override the remote configuration with your local one.
2026-01-19T01:27:49.199Z	
2026-01-19T01:27:49.199Z	
2026-01-19T01:27:49.202Z	? Would you like to continue?
2026-01-19T01:27:49.202Z	🤖 Using fallback value in non-interactive context: yes
2026-01-19T01:27:51.931Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-19T01:27:51.931Z	
2026-01-19T01:27:51.931Z	    .open-next/server-functions/default/handler.mjs:267:234054:
2026-01-19T01:27:51.931Z	      267 │ ...ned){if(t<0)t+=m3;else if(t===-0)return 0}return t}}e.exports=...
2026-01-19T01:27:51.931Z	          ╵                                  ~~
2026-01-19T01:27:51.931Z	
2026-01-19T01:27:51.931Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	    .open-next/server-functions/default/handler.mjs:306:7171:
2026-01-19T01:27:51.932Z	      306 │ ...s3=String(i4);if(i4===0||i4===-0)return i4;if(s3.search(/[eE]/...
2026-01-19T01:27:51.932Z	          ╵                                  ~~
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	    .open-next/server-functions/default/handler.mjs:356:337749:
2026-01-19T01:27:51.932Z	      356 │ ...ned){if(t<0)t+=m3;else if(t===-0)return 0}return t}}e.exports=...
2026-01-19T01:27:51.932Z	          ╵                                  ~~
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	    .open-next/server-functions/default/handler.mjs:361:79674:
2026-01-19T01:27:51.932Z	      361 │ ...data:{...i4,placement:f3}}},options:[f2,void 0]},S3&&{name:"sh...
2026-01-19T01:27:51.932Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	  The original key "options" is here:
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	    .open-next/server-functions/default/handler.mjs:361:79386:
2026-01-19T01:27:51.932Z	      361 │ ...,middleware:[{name:"offset",options:h3=f2={mainAxis:O2+aj2,ali...
2026-01-19T01:27:51.932Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.932Z	
2026-01-19T01:27:51.933Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.933Z	
2026-01-19T01:27:51.933Z	    .open-next/server-functions/default/handler.mjs:361:81152:
2026-01-19T01:27:51.933Z	      361 │ ...nabled:{[s2]:g4,[r2]:h4}}}},options:[j2,void 0]},S3&&{name:"fl...
2026-01-19T01:27:51.933Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.933Z	
2026-01-19T01:27:51.933Z	  The original key "options" is here:
2026-01-19T01:27:51.939Z	
2026-01-19T01:27:51.940Z	    .open-next/server-functions/default/handler.mjs:361:79713:
2026-01-19T01:27:51.940Z	      361 │ ...,void 0]},S3&&{name:"shift",options:p2=j2={mainAxis:!0,crossAx...
2026-01-19T01:27:51.940Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.940Z	
2026-01-19T01:27:51.940Z	
2026-01-19T01:27:51.940Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.940Z	
2026-01-19T01:27:51.940Z	    .open-next/server-functions/default/handler.mjs:361:83104:
2026-01-19T01:27:51.940Z	      361 │ ...t:{placement:c5}}}return{}},options:[x4,void 0]},{name:"size",...
2026-01-19T01:27:51.941Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.941Z	
2026-01-19T01:27:51.941Z	  The original key "options" is here:
2026-01-19T01:27:51.941Z	
2026-01-19T01:27:51.941Z	    .open-next/server-functions/default/handler.mjs:361:81190:
2026-01-19T01:27:51.941Z	      361 │ ...2,void 0]},S3&&{name:"flip",options:y2=x4={...ax2},async fn(a3...
2026-01-19T01:27:51.941Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.947Z	
2026-01-19T01:27:51.947Z	
2026-01-19T01:27:51.947Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.947Z	
2026-01-19T01:27:51.947Z	    .open-next/server-functions/default/handler.mjs:361:84477:
2026-01-19T01:27:51.947Z	      361 │ ...ight?{reset:{rects:!0}}:{}},options:[z2,void 0]},af3&&{name:"a...
2026-01-19T01:27:51.947Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.947Z	
2026-01-19T01:27:51.947Z	  The original key "options" is here:
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	    .open-next/server-functions/default/handler.mjs:361:83138:
2026-01-19T01:27:51.948Z	      361 │ ...s:[x4,void 0]},{name:"size",options:G2=z2={...ax2,apply:({elem...
2026-01-19T01:27:51.948Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	    .open-next/server-functions/default/handler.mjs:361:84775:
2026-01-19T01:27:51.948Z	      361 │ ...:b2,padding:c4}).fn(a3):{}},options:[H2,void 0]},aW({arrowWidt...
2026-01-19T01:27:51.948Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	  The original key "options" is here:
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	    .open-next/server-functions/default/handler.mjs:361:84517:
2026-01-19T01:27:51.948Z	      361 │ ...void 0]},af3&&{name:"arrow",options:J2=H2={element:af3,padding...
2026-01-19T01:27:51.948Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	    .open-next/server-functions/default/handler.mjs:361:85282:
2026-01-19T01:27:51.948Z	      361 │ ...:D(c5)}}}default:return{}}},options:[K3,void 0]}]}),[aH2,aI2]=...
2026-01-19T01:27:51.948Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.948Z	  The original key "options" is here:
2026-01-19T01:27:51.948Z	
2026-01-19T01:27:51.949Z	    .open-next/server-functions/default/handler.mjs:361:84850:
2026-01-19T01:27:51.949Z	      361 │ ...ight:aj2}),W2&&{name:"hide",options:L2=K3={strategy:"reference...
2026-01-19T01:27:51.949Z	          ╵                                ~~~~~~~
2026-01-19T01:27:51.949Z	
2026-01-19T01:27:51.949Z	
2026-01-19T01:27:52.008Z	🌀 Building list of assets...
2026-01-19T01:27:52.010Z	✨ Read 94 files from the assets directory /opt/buildhome/repo/.open-next/assets
2026-01-19T01:27:52.036Z	🌀 Starting asset upload...
2026-01-19T01:27:53.736Z	🌀 Found 29 new or modified static assets to upload. Proceeding with upload...
2026-01-19T01:27:53.736Z	+ /BUILD_ID
2026-01-19T01:27:53.736Z	+ /_next/static/chunks/22f164362bfb7a64.js
2026-01-19T01:27:53.736Z	+ /_next/static/chunks/ce7eb89b378c777f.js
2026-01-19T01:27:53.736Z	+ /_next/static/chunks/243856a95894e0f7.js
2026-01-19T01:27:53.736Z	+ /_next/static/chunks/611e5ee906f26418.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/7c55ee3d729610b7.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/c22bc69f3d565d55.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/0f53d111f86cee55.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/5b1ff9ad819033a0.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/f2a8cb07a0226b38.css
2026-01-19T01:27:53.737Z	+ /pattern-bg.svg
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/f235717ff0722799.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/bd98cd6cfaa732bd.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/e0061179d6fa7d44.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/10488f4e707f3ff7.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/4d9ddadba683bc1c.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/ab507d75592da049.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/f0ceda64de9de7a9.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/1b906a445b388fcc.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/a407cf8949d7098b.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/043a0e6a6bcf4244.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/9568f467a2f29e24.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/f9e7b3e7356126c5.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/0928121c36f3d923.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/4f2cb4280c1cc959.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/0f8b8298cc8a73a7.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/f04c7145295b5c7c.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/32bacfc3a050b0ee.js
2026-01-19T01:27:53.737Z	+ /_next/static/chunks/c559ec25cd39f62f.js
2026-01-19T01:27:55.105Z	Uploaded 10 of 29 assets
2026-01-19T01:27:55.337Z	Uploaded 19 of 29 assets
2026-01-19T01:27:55.409Z	Uploaded 29 of 29 assets
2026-01-19T01:27:55.409Z	✨ Success! Uploaded 29 files (59 already uploaded) (1.67 sec)
2026-01-19T01:27:55.409Z	
2026-01-19T01:27:55.832Z	Total Upload: 17471.14 KiB / gzip: 3699.34 KiB
2026-01-19T01:27:58.631Z	Your Worker has access to the following bindings:
2026-01-19T01:27:58.631Z	Binding            Resource      
2026-01-19T01:27:58.631Z	env.ASSETS         Assets        
2026-01-19T01:27:58.633Z	
2026-01-19T01:27:58.633Z	✘ [ERROR] Your Worker failed validation because it exceeded size limits.
2026-01-19T01:27:58.633Z	
2026-01-19T01:27:58.634Z	  
2026-01-19T01:27:58.634Z	  A request to the Cloudflare API (/accounts/99d398c859290492bdddb84cbd338b51/workers/scripts/app-crm-ia-four-sales/versions) failed.
2026-01-19T01:27:58.634Z	   - Your Worker exceeded the size limit of 3 MiB. Please upgrade to a paid plan to deploy Workers up to 10 MiB. https://dash.cloudflare.com/99d398c859290492bdddb84cbd338b51/workers/plans [code: 10027]
2026-01-19T01:27:58.634Z	  To learn more about this error, visit: https://developers.cloudflare.com/workers/platform/limits/#worker-size
2026-01-19T01:27:58.634Z	  Here are the 5 largest dependencies included in your script:
2026-01-19T01:27:58.634Z	  
2026-01-19T01:27:58.634Z	  - .open-next/server-functions/default/handler.mjs - 15722.98 KiB
2026-01-19T01:27:58.634Z	  - node_modules/next/dist/compiled/@vercel/og/resvg.wasm - 1346.05 KiB
2026-01-19T01:27:58.634Z	  - .open-next/middleware/handler.mjs - 138.13 KiB
2026-01-19T01:27:58.634Z	  - node_modules/next/dist/compiled/@vercel/og/yoga.wasm - 86.58 KiB
2026-01-19T01:27:58.634Z	  - .open-next/cloudflare/images.js - 17.80 KiB
2026-01-19T01:27:58.634Z	  
2026-01-19T01:27:58.634Z	  If these are unnecessary, consider removing them
2026-01-19T01:27:58.634Z	  
2026-01-19T01:27:58.634Z	
2026-01-19T01:27:58.635Z	
2026-01-19T01:27:58.642Z	
2026-01-19T01:27:58.643Z	✘ [ERROR] A request to the Cloudflare API (/accounts/99d398c859290492bdddb84cbd338b51/workers/scripts/app-crm-ia-four-sales/versions) failed.
2026-01-19T01:27:58.643Z	
2026-01-19T01:27:58.643Z	  Your Worker exceeded the size limit of 3 MiB. Please upgrade to a paid plan to deploy Workers up to 10 MiB. https://dash.cloudflare.com/99d398c859290492bdddb84cbd338b51/workers/plans [code: 10027]
2026-01-19T01:27:58.644Z	  To learn more about this error, visit: https://developers.cloudflare.com/workers/platform/limits/#worker-size
2026-01-19T01:27:58.644Z	
2026-01-19T01:27:58.644Z	  
2026-01-19T01:27:58.644Z	  If you think this is a bug, please open an issue at: https://github.com/cloudflare/workers-sdk/issues/new/choose
2026-01-19T01:27:58.644Z	
2026-01-19T01:27:58.644Z	
2026-01-19T01:27:58.644Z	
2026-01-19T01:27:58.644Z	Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
2026-01-19T01:27:58.674Z	🪵  Logs were written to "/opt/buildhome/.config/.wrangler/logs/wrangler-2026-01-19_01-27-47_514.log"
2026-01-19T01:27:58.826Z	Failed: error occurred while running deploy command