2026-01-17T19:12:06.011Z	Initializing build environment...
2026-01-17T19:12:07.262Z	Success: Finished initializing build environment
2026-01-17T19:12:07.651Z	Cloning repository...
2026-01-17T19:12:09.063Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-01-17T19:12:09.064Z	Restoring from dependencies cache
2026-01-17T19:12:09.067Z	Restoring from build output cache
2026-01-17T19:12:09.224Z	Installing project dependencies: npm clean-install --progress=false
2026-01-17T19:12:15.381Z	npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
2026-01-17T19:13:04.899Z	
2026-01-17T19:13:04.900Z	added 1039 packages, and audited 1040 packages in 55s
2026-01-17T19:13:04.900Z	
2026-01-17T19:13:04.900Z	204 packages are looking for funding
2026-01-17T19:13:04.900Z	  run `npm fund` for details
2026-01-17T19:13:05.065Z	
2026-01-17T19:13:05.066Z	14 low severity vulnerabilities
2026-01-17T19:13:05.066Z	
2026-01-17T19:13:05.066Z	To address issues that do not require attention, run:
2026-01-17T19:13:05.066Z	  npm audit fix
2026-01-17T19:13:05.066Z	
2026-01-17T19:13:05.066Z	To address all issues (including breaking changes), run:
2026-01-17T19:13:05.066Z	  npm audit fix --force
2026-01-17T19:13:05.066Z	
2026-01-17T19:13:05.066Z	Run `npm audit` for details.
2026-01-17T19:13:05.273Z	Executing user build command: npm run pages:build
2026-01-17T19:13:16.546Z	
2026-01-17T19:13:16.547Z	> temp-crm@0.1.0 pages:build
2026-01-17T19:13:16.547Z	> next build && npx opennextjs-cloudflare build
2026-01-17T19:13:16.547Z	
2026-01-17T19:13:21.271Z	⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2026-01-17T19:13:21.276Z	Attention: Next.js now collects completely anonymous telemetry regarding usage.
2026-01-17T19:13:21.276Z	This information is used to shape Next.js' roadmap and prioritize features.
2026-01-17T19:13:21.276Z	You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2026-01-17T19:13:21.276Z	https://nextjs.org/telemetry
2026-01-17T19:13:21.276Z	
2026-01-17T19:13:21.296Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-17T19:13:21.296Z	
2026-01-17T19:13:21.407Z	  Creating an optimized production build ...
2026-01-17T19:13:44.285Z	✓ Compiled successfully in 22.3s
2026-01-17T19:13:44.306Z	  Running TypeScript ...
2026-01-17T19:14:04.092Z	  Collecting page data using 1 worker ...
2026-01-17T19:14:05.040Z	  Generating static pages using 1 worker (0/98) ...
2026-01-17T19:14:05.161Z	  Generating static pages using 1 worker (24/98) 
2026-01-17T19:14:05.171Z	  Generating static pages using 1 worker (48/98) 
2026-01-17T19:14:05.483Z	  Generating static pages using 1 worker (73/98) 
2026-01-17T19:14:05.828Z	✓ Generating static pages using 1 worker (98/98) in 787.0ms
2026-01-17T19:14:05.838Z	  Finalizing page optimization ...
2026-01-17T19:14:05.849Z	
2026-01-17T19:14:05.852Z	Route (app)
2026-01-17T19:14:05.852Z	┌ ○ /
2026-01-17T19:14:05.855Z	├ ○ /_not-found
2026-01-17T19:14:05.855Z	├ ƒ /api/agentes/conhecimento/processar
2026-01-17T19:14:05.859Z	├ ƒ /api/agentes/sandbox
2026-01-17T19:14:05.859Z	├ ƒ /api/auth/api-keys
2026-01-17T19:14:05.859Z	├ ƒ /api/auth/api-keys/[keyId]
2026-01-17T19:14:05.859Z	├ ƒ /api/calendar/events
2026-01-17T19:14:05.859Z	├ ƒ /api/calendar/events/[eventId]
2026-01-17T19:14:05.859Z	├ ƒ /api/calendar/sync
2026-01-17T19:14:05.859Z	├ ƒ /api/contacts
2026-01-17T19:14:05.859Z	├ ƒ /api/contacts/[contactId]
2026-01-17T19:14:05.860Z	├ ƒ /api/crm/leads/convert
2026-01-17T19:14:05.860Z	├ ƒ /api/deals
2026-01-17T19:14:05.861Z	├ ƒ /api/deals/[dealId]
2026-01-17T19:14:05.861Z	├ ƒ /api/healthz
2026-01-17T19:14:05.861Z	├ ƒ /api/inbox/block
2026-01-17T19:14:05.861Z	├ ƒ /api/inbox/conversations/[conversationId]
2026-01-17T19:14:05.861Z	├ ƒ /api/inbox/deals
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/notes
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/quick-replies
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/send
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/tags
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/whatsapp/send-template
2026-01-17T19:14:05.862Z	├ ƒ /api/inbox/whatsapp/templates
2026-01-17T19:14:05.862Z	├ ƒ /api/integrations/google/callback
2026-01-17T19:14:05.862Z	├ ƒ /api/integrations/google/connect
2026-01-17T19:14:05.862Z	├ ƒ /api/integrations/google/disconnect
2026-01-17T19:14:05.863Z	├ ƒ /api/integrations/google/status
2026-01-17T19:14:05.863Z	├ ƒ /api/integrations/instagram/connect
2026-01-17T19:14:05.863Z	├ ƒ /api/integrations/instagram/status
2026-01-17T19:14:05.863Z	├ ƒ /api/integrations/whatsapp-baileys/connect
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-baileys/disconnect
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-baileys/groups
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-baileys/status
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-nao-oficial/connect
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-nao-oficial/disconnect
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-nao-oficial/status
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp-nao-oficial/sync
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp/connect
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp/status
2026-01-17T19:14:05.864Z	├ ƒ /api/integrations/whatsapp/templates/sync
2026-01-17T19:14:05.864Z	├ ƒ /api/invites/accept
2026-01-17T19:14:05.864Z	├ ƒ /api/invites/resend
2026-01-17T19:14:05.864Z	├ ƒ /api/invites/validate
2026-01-17T19:14:05.864Z	├ ƒ /api/leads
2026-01-17T19:14:05.864Z	├ ƒ /api/leads/[leadId]
2026-01-17T19:14:05.864Z	├ ƒ /api/pipeline
2026-01-17T19:14:05.864Z	├ ƒ /api/pipeline/[pipelineId]
2026-01-17T19:14:05.864Z	├ ƒ /api/pipeline/stages
2026-01-17T19:14:05.864Z	├ ƒ /api/plans/select
2026-01-17T19:14:05.865Z	├ ƒ /api/plans/status
2026-01-17T19:14:05.865Z	├ ƒ /api/realtime/auth
2026-01-17T19:14:05.865Z	├ ƒ /api/reports/atendimentos
2026-01-17T19:14:05.865Z	├ ƒ /api/reports/export
2026-01-17T19:14:05.865Z	├ ƒ /api/reports/negocios
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/billing
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/fields
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/fields/[fieldId]
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/invites
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/privacy
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/profile
2026-01-17T19:14:05.865Z	├ ƒ /api/settings/team
2026-01-17T19:14:05.865Z	├ ƒ /api/storage/signed-url
2026-01-17T19:14:05.865Z	├ ƒ /api/tasks
2026-01-17T19:14:05.865Z	├ ƒ /api/tasks/[taskId]
2026-01-17T19:14:05.865Z	├ ƒ /api/webhooks/google-calendar
2026-01-17T19:14:05.865Z	├ ƒ /api/webhooks/instagram
2026-01-17T19:14:05.865Z	├ ƒ /api/webhooks/instagram/process
2026-01-17T19:14:05.866Z	├ ƒ /api/webhooks/whatsapp
2026-01-17T19:14:05.866Z	├ ƒ /api/webhooks/whatsapp-nao-oficial
2026-01-17T19:14:05.866Z	├ ƒ /api/webhooks/whatsapp/process
2026-01-17T19:14:05.866Z	├ ○ /app/agentes
2026-01-17T19:14:05.866Z	├ ƒ /app/agentes/[id]
2026-01-17T19:14:05.866Z	├ ○ /app/agentes/novo
2026-01-17T19:14:05.866Z	├ ○ /app/agentes/novo/configuracao
2026-01-17T19:14:05.866Z	├ ○ /app/calendario
2026-01-17T19:14:05.866Z	├ ○ /app/canais
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/campos
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/cobranca
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/conexoes
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/equipe
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/idioma
2026-01-17T19:14:05.866Z	├ ○ /app/configuracoes/integracoes
2026-01-17T19:14:05.867Z	├ ○ /app/configuracoes/perfil
2026-01-17T19:14:05.867Z	├ ○ /app/configuracoes/privacidade
2026-01-17T19:14:05.867Z	├ ○ /app/configuracoes/produtos
2026-01-17T19:14:05.867Z	├ ○ /app/configuracoes/tags
2026-01-17T19:14:05.867Z	├ ○ /app/contatos
2026-01-17T19:14:05.867Z	├ ○ /app/funil
2026-01-17T19:14:05.867Z	├ ○ /app/inbox
2026-01-17T19:14:05.867Z	├ ○ /app/integracoes
2026-01-17T19:14:05.867Z	├ ○ /app/leads
2026-01-17T19:14:05.867Z	├ ƒ /app/painel
2026-01-17T19:14:05.868Z	├ ○ /app/pipeline
2026-01-17T19:14:05.868Z	├ ○ /app/planos
2026-01-17T19:14:05.868Z	├ ○ /app/relatorios
2026-01-17T19:14:05.868Z	├ ○ /atualizar-senha
2026-01-17T19:14:05.868Z	├ ○ /cadastro
2026-01-17T19:14:05.868Z	├ ○ /convite
2026-01-17T19:14:05.868Z	├ ○ /entrar
2026-01-17T19:14:05.868Z	├ ○ /login-v2
2026-01-17T19:14:05.868Z	├ ○ /modal-deal
2026-01-17T19:14:05.868Z	├ ○ /onboarding
2026-01-17T19:14:05.868Z	├ ○ /planos
2026-01-17T19:14:05.868Z	└ ○ /recuperar-senha
2026-01-17T19:14:05.868Z	
2026-01-17T19:14:05.868Z	
2026-01-17T19:14:05.868Z	○  (Static)   prerendered as static content
2026-01-17T19:14:05.868Z	ƒ  (Dynamic)  server-rendered on demand
2026-01-17T19:14:05.868Z	
2026-01-17T19:14:07.980Z	
2026-01-17T19:14:07.980Z	┌─────────────────────────────┐
2026-01-17T19:14:07.980Z	│ OpenNext — Cloudflare build │
2026-01-17T19:14:07.980Z	└─────────────────────────────┘
2026-01-17T19:14:07.980Z	
2026-01-17T19:14:08.165Z	▲ [WARNING] Processing wrangler.toml configuration:
2026-01-17T19:14:08.165Z	
2026-01-17T19:14:08.165Z	    - Unexpected fields found in assets field: "minify"
2026-01-17T19:14:08.165Z	
2026-01-17T19:14:08.165Z	
2026-01-17T19:14:08.165Z	App directory: /opt/buildhome/repo
2026-01-17T19:14:08.165Z	Next.js version : 16.1.1
2026-01-17T19:14:08.165Z	WARN Next.js 16 is not fully supported yet! Some features may not work as expected.
2026-01-17T19:14:08.169Z	@opennextjs/cloudflare version: 1.14.9
2026-01-17T19:14:08.169Z	@opennextjs/aws version: 3.9.8
2026-01-17T19:14:08.171Z	
2026-01-17T19:14:08.171Z	┌─────────────────────────────────┐
2026-01-17T19:14:08.171Z	│ OpenNext — Building Next.js app │
2026-01-17T19:14:08.171Z	└─────────────────────────────────┘
2026-01-17T19:14:08.171Z	
2026-01-17T19:14:08.364Z	
2026-01-17T19:14:08.364Z	> temp-crm@0.1.0 build
2026-01-17T19:14:08.364Z	> next build
2026-01-17T19:14:08.364Z	
2026-01-17T19:14:09.383Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-17T19:14:09.383Z	
2026-01-17T19:14:09.483Z	  Creating an optimized production build ...
2026-01-17T19:14:38.015Z	✓ Compiled successfully in 27.9s
2026-01-17T19:14:38.051Z	  Running TypeScript ...
2026-01-17T19:14:57.601Z	  Collecting page data using 1 worker ...
2026-01-17T19:14:58.641Z	  Generating static pages using 1 worker (0/98) ...
2026-01-17T19:14:58.772Z	  Generating static pages using 1 worker (24/98) 
2026-01-17T19:14:58.784Z	  Generating static pages using 1 worker (48/98) 
2026-01-17T19:14:59.199Z	  Generating static pages using 1 worker (73/98) 
2026-01-17T19:14:59.580Z	✓ Generating static pages using 1 worker (98/98) in 938.8ms
2026-01-17T19:14:59.595Z	  Finalizing page optimization ...
2026-01-17T19:15:01.504Z	
2026-01-17T19:15:01.509Z	Route (app)
2026-01-17T19:15:01.509Z	┌ ○ /
2026-01-17T19:15:01.509Z	├ ○ /_not-found
2026-01-17T19:15:01.509Z	├ ƒ /api/agentes/conhecimento/processar
2026-01-17T19:15:01.509Z	├ ƒ /api/agentes/sandbox
2026-01-17T19:15:01.509Z	├ ƒ /api/auth/api-keys
2026-01-17T19:15:01.509Z	├ ƒ /api/auth/api-keys/[keyId]
2026-01-17T19:15:01.510Z	├ ƒ /api/calendar/events
2026-01-17T19:15:01.512Z	├ ƒ /api/calendar/events/[eventId]
2026-01-17T19:15:01.512Z	├ ƒ /api/calendar/sync
2026-01-17T19:15:01.512Z	├ ƒ /api/contacts
2026-01-17T19:15:01.514Z	├ ƒ /api/contacts/[contactId]
2026-01-17T19:15:01.514Z	├ ƒ /api/crm/leads/convert
2026-01-17T19:15:01.514Z	├ ƒ /api/deals
2026-01-17T19:15:01.514Z	├ ƒ /api/deals/[dealId]
2026-01-17T19:15:01.514Z	├ ƒ /api/healthz
2026-01-17T19:15:01.514Z	├ ƒ /api/inbox/block
2026-01-17T19:15:01.516Z	├ ƒ /api/inbox/conversations/[conversationId]
2026-01-17T19:15:01.517Z	├ ƒ /api/inbox/deals
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/notes
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/quick-replies
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/send
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/tags
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/whatsapp/send-template
2026-01-17T19:15:01.518Z	├ ƒ /api/inbox/whatsapp/templates
2026-01-17T19:15:01.518Z	├ ƒ /api/integrations/google/callback
2026-01-17T19:15:01.518Z	├ ƒ /api/integrations/google/connect
2026-01-17T19:15:01.518Z	├ ƒ /api/integrations/google/disconnect
2026-01-17T19:15:01.518Z	├ ƒ /api/integrations/google/status
2026-01-17T19:15:01.519Z	├ ƒ /api/integrations/instagram/connect
2026-01-17T19:15:01.519Z	├ ƒ /api/integrations/instagram/status
2026-01-17T19:15:01.519Z	├ ƒ /api/integrations/whatsapp-baileys/connect
2026-01-17T19:15:01.519Z	├ ƒ /api/integrations/whatsapp-baileys/disconnect
2026-01-17T19:15:01.519Z	├ ƒ /api/integrations/whatsapp-baileys/groups
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp-baileys/status
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp-nao-oficial/connect
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp-nao-oficial/disconnect
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp-nao-oficial/status
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp-nao-oficial/sync
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp/connect
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp/status
2026-01-17T19:15:01.520Z	├ ƒ /api/integrations/whatsapp/templates/sync
2026-01-17T19:15:01.520Z	├ ƒ /api/invites/accept
2026-01-17T19:15:01.520Z	├ ƒ /api/invites/resend
2026-01-17T19:15:01.520Z	├ ƒ /api/invites/validate
2026-01-17T19:15:01.520Z	├ ƒ /api/leads
2026-01-17T19:15:01.520Z	├ ƒ /api/leads/[leadId]
2026-01-17T19:15:01.521Z	├ ƒ /api/pipeline
2026-01-17T19:15:01.521Z	├ ƒ /api/pipeline/[pipelineId]
2026-01-17T19:15:01.521Z	├ ƒ /api/pipeline/stages
2026-01-17T19:15:01.521Z	├ ƒ /api/plans/select
2026-01-17T19:15:01.521Z	├ ƒ /api/plans/status
2026-01-17T19:15:01.521Z	├ ƒ /api/realtime/auth
2026-01-17T19:15:01.521Z	├ ƒ /api/reports/atendimentos
2026-01-17T19:15:01.521Z	├ ƒ /api/reports/export
2026-01-17T19:15:01.521Z	├ ƒ /api/reports/negocios
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/billing
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/fields
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/fields/[fieldId]
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/invites
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/privacy
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/profile
2026-01-17T19:15:01.521Z	├ ƒ /api/settings/team
2026-01-17T19:15:01.521Z	├ ƒ /api/storage/signed-url
2026-01-17T19:15:01.521Z	├ ƒ /api/tasks
2026-01-17T19:15:01.521Z	├ ƒ /api/tasks/[taskId]
2026-01-17T19:15:01.521Z	├ ƒ /api/webhooks/google-calendar
2026-01-17T19:15:01.521Z	├ ƒ /api/webhooks/instagram
2026-01-17T19:15:01.522Z	├ ƒ /api/webhooks/instagram/process
2026-01-17T19:15:01.522Z	├ ƒ /api/webhooks/whatsapp
2026-01-17T19:15:01.522Z	├ ƒ /api/webhooks/whatsapp-nao-oficial
2026-01-17T19:15:01.522Z	├ ƒ /api/webhooks/whatsapp/process
2026-01-17T19:15:01.522Z	├ ○ /app/agentes
2026-01-17T19:15:01.522Z	├ ƒ /app/agentes/[id]
2026-01-17T19:15:01.522Z	├ ○ /app/agentes/novo
2026-01-17T19:15:01.522Z	├ ○ /app/agentes/novo/configuracao
2026-01-17T19:15:01.522Z	├ ○ /app/calendario
2026-01-17T19:15:01.522Z	├ ○ /app/canais
2026-01-17T19:15:01.522Z	├ ○ /app/configuracoes
2026-01-17T19:15:01.522Z	├ ○ /app/configuracoes/campos
2026-01-17T19:15:01.522Z	├ ○ /app/configuracoes/cobranca
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/conexoes
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/equipe
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/idioma
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/integracoes
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/perfil
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/privacidade
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/produtos
2026-01-17T19:15:01.524Z	├ ○ /app/configuracoes/tags
2026-01-17T19:15:01.524Z	├ ○ /app/contatos
2026-01-17T19:15:01.525Z	├ ○ /app/funil
2026-01-17T19:15:01.525Z	├ ○ /app/inbox
2026-01-17T19:15:01.525Z	├ ○ /app/integracoes
2026-01-17T19:15:01.525Z	├ ○ /app/leads
2026-01-17T19:15:01.525Z	├ ƒ /app/painel
2026-01-17T19:15:01.525Z	├ ○ /app/pipeline
2026-01-17T19:15:01.525Z	├ ○ /app/planos
2026-01-17T19:15:01.525Z	├ ○ /app/relatorios
2026-01-17T19:15:01.525Z	├ ○ /atualizar-senha
2026-01-17T19:15:01.525Z	├ ○ /cadastro
2026-01-17T19:15:01.526Z	├ ○ /convite
2026-01-17T19:15:01.526Z	├ ○ /entrar
2026-01-17T19:15:01.526Z	├ ○ /login-v2
2026-01-17T19:15:01.526Z	├ ○ /modal-deal
2026-01-17T19:15:01.527Z	├ ○ /onboarding
2026-01-17T19:15:01.527Z	├ ○ /planos
2026-01-17T19:15:01.527Z	└ ○ /recuperar-senha
2026-01-17T19:15:01.527Z	
2026-01-17T19:15:01.527Z	
2026-01-17T19:15:01.527Z	○  (Static)   prerendered as static content
2026-01-17T19:15:01.527Z	ƒ  (Dynamic)  server-rendered on demand
2026-01-17T19:15:01.527Z	
2026-01-17T19:15:01.595Z	
2026-01-17T19:15:01.596Z	┌──────────────────────────────┐
2026-01-17T19:15:01.596Z	│ OpenNext — Generating bundle │
2026-01-17T19:15:01.596Z	└──────────────────────────────┘
2026-01-17T19:15:01.596Z	
2026-01-17T19:15:01.675Z	Bundling middleware function...
2026-01-17T19:15:01.781Z	Bundling static assets...
2026-01-17T19:15:01.850Z	Bundling cache assets...
2026-01-17T19:15:01.968Z	Building server function: default...
2026-01-17T19:15:06.223Z	Applying code patches: 2.807s
2026-01-17T19:15:06.666Z	# copyPackageTemplateFiles
2026-01-17T19:15:06.678Z	⚙️ Bundling the OpenNext server...
2026-01-17T19:15:06.678Z	
2026-01-17T19:15:08.200Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-17T19:15:08.200Z	
2026-01-17T19:15:08.201Z	    .open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__bad23644._.js:1:36490:
2026-01-17T19:15:08.201Z	      1 │ ....unsigned){if(t<0)t+=m;else if(-0===t)return 0}return t}}e.expor...
2026-01-17T19:15:08.201Z	        ╵                                   ~~
2026-01-17T19:15:08.201Z	
2026-01-17T19:15:08.201Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-17T19:15:08.201Z	
2026-01-17T19:15:08.903Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-17T19:15:08.903Z	
2026-01-17T19:15:08.903Z	    .open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1a61e49c._.js:1:36355:
2026-01-17T19:15:08.903Z	      1 │ ....unsigned){if(t<0)t+=m;else if(-0===t)return 0}return t}}e.expor...
2026-01-17T19:15:08.903Z	        ╵                                   ~~
2026-01-17T19:15:08.903Z	
2026-01-17T19:15:08.903Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-17T19:15:08.903Z	
2026-01-17T19:15:10.205Z	Worker saved in `.open-next/worker.js` 🚀
2026-01-17T19:15:10.205Z	
2026-01-17T19:15:10.205Z	OpenNext build complete.
2026-01-17T19:15:10.358Z	Success: Build command completed
2026-01-17T19:15:10.479Z	Executing user deploy command: npx wrangler deploy
2026-01-17T19:15:12.120Z	
2026-01-17T19:15:12.120Z	 ⛅️ wrangler 4.59.2
2026-01-17T19:15:12.120Z	───────────────────
2026-01-17T19:15:12.184Z	▲ [WARNING] Processing wrangler.toml configuration:
2026-01-17T19:15:12.184Z	
2026-01-17T19:15:12.184Z	    - Unexpected fields found in assets field: "minify"
2026-01-17T19:15:12.185Z	
2026-01-17T19:15:12.185Z	
2026-01-17T19:15:12.218Z	▲ [WARNING] Failed to match Worker name. Your config file is using the Worker name "app-crm-ia-4-sales", but the CI system expected "app-crm-ia-four-sales". Overriding using the CI provided Worker name. Workers Builds connected builds will attempt to open a pull request to resolve this config name mismatch.
2026-01-17T19:15:12.220Z	
2026-01-17T19:15:12.220Z	
2026-01-17T19:15:13.673Z	▲ [WARNING] The local configuration being used (generated from your local configuration file) differs from the remote configuration of your Worker set via the Cloudflare Dashboard:
2026-01-17T19:15:13.673Z	
2026-01-17T19:15:13.674Z	   {
2026-01-17T19:15:13.674Z	  +  assets: {
2026-01-17T19:15:13.674Z	  +    binding: "ASSETS"
2026-01-17T19:15:13.674Z	  +  }
2026-01-17T19:15:13.674Z	  -  compatibility_date: "2026-01-16"
2026-01-17T19:15:13.674Z	  +  compatibility_date: "2024-09-23"
2026-01-17T19:15:13.674Z	  -  name: "app-crm-ia-four-sales"
2026-01-17T19:15:13.674Z	  +  name: "app-crm-ia-4-sales"
2026-01-17T19:15:13.674Z	     routes: [
2026-01-17T19:15:13.674Z	  -    {
2026-01-17T19:15:13.674Z	  -      pattern: "crm.iafoursales.com"
2026-01-17T19:15:13.674Z	  -      zone_name: "iafoursales.com"
2026-01-17T19:15:13.674Z	  -      custom_domain: true
2026-01-17T19:15:13.674Z	  -    }
2026-01-17T19:15:13.674Z	     ]
2026-01-17T19:15:13.674Z	  -  workers_dev: false
2026-01-17T19:15:13.674Z	  +  workers_dev: true
2026-01-17T19:15:13.674Z	  -  preview_urls: false
2026-01-17T19:15:13.674Z	  +  preview_urls: true
2026-01-17T19:15:13.674Z	     vars: {
2026-01-17T19:15:13.674Z	  -    AGENTS_API_URL: "http://crm.iafoursales.com:8001"
2026-01-17T19:15:13.674Z	  -    BAILEYS_API_URL: "http://crm.iafoursales.com:7001"
2026-01-17T19:15:13.675Z	  -    GOOGLE_REDIRECT_URL: "http://crm.iafoursales.com/api/integrations/google/callback"
2026-01-17T19:15:13.675Z	  -    GOOGLE_WEBHOOK_URL: "https://crm.iafoursales.com/api/webhooks/google-calendar"
2026-01-17T19:15:13.676Z	  -    NEXT_PUBLIC_R2_BUCKET_NAME: "ia-four-sales-crm"
2026-01-17T19:15:13.676Z	  -    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "https://{bucket}.{accountId}.r2.dev"
2026-01-17T19:15:13.676Z	  -    QSTASH_URL: "https://qstash.upstash.io"
2026-01-17T19:15:13.676Z	  -    R2_BUCKET_AGENT_KNOWLEDGE: "ia-four-sales-crm"
2026-01-17T19:15:13.676Z	  -    R2_BUCKET_CONTACT_AVATARS: "ia-four-sales-crm"
2026-01-17T19:15:13.676Z	  -    R2_BUCKET_CONTACT_FILES: "ia-four-sales-crm"
2026-01-17T19:15:13.677Z	  -    R2_BUCKET_INBOX_ATTACHMENTS: "ia-four-sales-crm"
2026-01-17T19:15:13.677Z	  -    R2_BUCKET_NAME: "ia-four-sales-crm"
2026-01-17T19:15:13.677Z	  -    R2_BUCKET_USER_AVATARS: "ia-four-sales-crm"
2026-01-17T19:15:13.677Z	     }
2026-01-17T19:15:13.677Z	   }
2026-01-17T19:15:13.677Z	  
2026-01-17T19:15:13.677Z	  
2026-01-17T19:15:13.677Z	  Deploying the Worker will override the remote configuration with your local one.
2026-01-17T19:15:13.678Z	
2026-01-17T19:15:13.683Z	
2026-01-17T19:15:13.684Z	? Would you like to continue?
2026-01-17T19:15:13.684Z	🤖 Using fallback value in non-interactive context: yes
2026-01-17T19:15:16.194Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-17T19:15:16.194Z	
2026-01-17T19:15:16.194Z	    .open-next/server-functions/default/handler.mjs:267:234054:
2026-01-17T19:15:16.194Z	      267 │ ...ned){if(t<0)t+=m3;else if(t===-0)return 0}return t}}e.exports=...
2026-01-17T19:15:16.194Z	          ╵                                  ~~
2026-01-17T19:15:16.194Z	
2026-01-17T19:15:16.195Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	    .open-next/server-functions/default/handler.mjs:306:7171:
2026-01-17T19:15:16.195Z	      306 │ ...s3=String(i4);if(i4===0||i4===-0)return i4;if(s3.search(/[eE]/...
2026-01-17T19:15:16.195Z	          ╵                                  ~~
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	▲ [WARNING] Comparison with -0 using the "===" operator will also match 0 [equals-negative-zero]
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	    .open-next/server-functions/default/handler.mjs:356:337749:
2026-01-17T19:15:16.195Z	      356 │ ...ned){if(t<0)t+=m3;else if(t===-0)return 0}return t}}e.exports=...
2026-01-17T19:15:16.195Z	          ╵                                  ~~
2026-01-17T19:15:16.195Z	
2026-01-17T19:15:16.195Z	  Floating-point equality is defined such that 0 and -0 are equal, so "x === -0" returns true for both 0 and -0. You need to use "Object.is(x, -0)" instead to test for -0.
2026-01-17T19:15:16.198Z	
2026-01-17T19:15:16.198Z	
2026-01-17T19:15:16.198Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.198Z	
2026-01-17T19:15:16.198Z	    .open-next/server-functions/default/handler.mjs:361:80840:
2026-01-17T19:15:16.198Z	      361 │ ...data:{...i4,placement:f3}}},options:[f2,void 0]},S3&&{name:"sh...
2026-01-17T19:15:16.198Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.198Z	
2026-01-17T19:15:16.198Z	  The original key "options" is here:
2026-01-17T19:15:16.198Z	
2026-01-17T19:15:16.198Z	    .open-next/server-functions/default/handler.mjs:361:80552:
2026-01-17T19:15:16.198Z	      361 │ ...,middleware:[{name:"offset",options:h3=f2={mainAxis:O2+aj2,ali...
2026-01-17T19:15:16.199Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.199Z	
2026-01-17T19:15:16.199Z	
2026-01-17T19:15:16.200Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.200Z	
2026-01-17T19:15:16.200Z	    .open-next/server-functions/default/handler.mjs:361:82318:
2026-01-17T19:15:16.200Z	      361 │ ...nabled:{[s2]:g4,[r2]:h4}}}},options:[j2,void 0]},S3&&{name:"fl...
2026-01-17T19:15:16.200Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.200Z	
2026-01-17T19:15:16.200Z	  The original key "options" is here:
2026-01-17T19:15:16.200Z	
2026-01-17T19:15:16.200Z	    .open-next/server-functions/default/handler.mjs:361:80879:
2026-01-17T19:15:16.201Z	      361 │ ...,void 0]},S3&&{name:"shift",options:p2=j2={mainAxis:!0,crossAx...
2026-01-17T19:15:16.201Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.201Z	
2026-01-17T19:15:16.201Z	
2026-01-17T19:15:16.201Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.201Z	
2026-01-17T19:15:16.201Z	    .open-next/server-functions/default/handler.mjs:361:84270:
2026-01-17T19:15:16.201Z	      361 │ ...t:{placement:c5}}}return{}},options:[x4,void 0]},{name:"size",...
2026-01-17T19:15:16.201Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.201Z	
2026-01-17T19:15:16.201Z	  The original key "options" is here:
2026-01-17T19:15:16.201Z	
2026-01-17T19:15:16.201Z	    .open-next/server-functions/default/handler.mjs:361:82356:
2026-01-17T19:15:16.202Z	      361 │ ...2,void 0]},S3&&{name:"flip",options:y2=x4={...ax2},async fn(a3...
2026-01-17T19:15:16.202Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	    .open-next/server-functions/default/handler.mjs:361:85643:
2026-01-17T19:15:16.202Z	      361 │ ...ight?{reset:{rects:!0}}:{}},options:[z2,void 0]},af3&&{name:"a...
2026-01-17T19:15:16.202Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	  The original key "options" is here:
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	    .open-next/server-functions/default/handler.mjs:361:84304:
2026-01-17T19:15:16.202Z	      361 │ ...s:[x4,void 0]},{name:"size",options:G2=z2={...ax2,apply:({elem...
2026-01-17T19:15:16.202Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	    .open-next/server-functions/default/handler.mjs:361:85941:
2026-01-17T19:15:16.202Z	      361 │ ...:b2,padding:c4}).fn(a3):{}},options:[H2,void 0]},aW({arrowWidt...
2026-01-17T19:15:16.202Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.202Z	
2026-01-17T19:15:16.202Z	  The original key "options" is here:
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	    .open-next/server-functions/default/handler.mjs:361:85683:
2026-01-17T19:15:16.203Z	      361 │ ...void 0]},af3&&{name:"arrow",options:J2=H2={element:af3,padding...
2026-01-17T19:15:16.203Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	▲ [WARNING] Duplicate key "options" in object literal [duplicate-object-key]
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	    .open-next/server-functions/default/handler.mjs:361:86448:
2026-01-17T19:15:16.203Z	      361 │ ...:D(c5)}}}default:return{}}},options:[K3,void 0]}]}),[aH2,aI2]=...
2026-01-17T19:15:16.203Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	  The original key "options" is here:
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.203Z	    .open-next/server-functions/default/handler.mjs:361:86016:
2026-01-17T19:15:16.203Z	      361 │ ...ight:aj2}),W2&&{name:"hide",options:L2=K3={strategy:"reference...
2026-01-17T19:15:16.203Z	          ╵                                ~~~~~~~
2026-01-17T19:15:16.203Z	
2026-01-17T19:15:16.204Z	
2026-01-17T19:15:16.251Z	🌀 Building list of assets...
2026-01-17T19:15:16.254Z	✨ Read 93 files from the assets directory /opt/buildhome/repo/.open-next/assets
2026-01-17T19:15:16.297Z	🌀 Starting asset upload...
2026-01-17T19:15:18.156Z	🌀 Found 1 new or modified static asset to upload. Proceeding with upload...
2026-01-17T19:15:18.157Z	+ /BUILD_ID
2026-01-17T19:15:19.070Z	Uploaded 1 of 1 asset
2026-01-17T19:15:19.071Z	✨ Success! Uploaded 1 file (86 already uploaded) (0.91 sec)
2026-01-17T19:15:19.071Z	
2026-01-17T19:15:19.467Z	Total Upload: 17424.03 KiB / gzip: 3695.21 KiB
2026-01-17T19:15:23.195Z	Your Worker has access to the following bindings:
2026-01-17T19:15:23.195Z	Binding            Resource      
2026-01-17T19:15:23.195Z	env.ASSETS         Assets        
2026-01-17T19:15:23.195Z	
2026-01-17T19:15:23.196Z	✘ [ERROR] Your Worker failed validation because it exceeded size limits.
2026-01-17T19:15:23.196Z	
2026-01-17T19:15:23.197Z	  
2026-01-17T19:15:23.197Z	  A request to the Cloudflare API (/accounts/99d398c859290492bdddb84cbd338b51/workers/scripts/app-crm-ia-four-sales/versions) failed.
2026-01-17T19:15:23.197Z	   - Your Worker exceeded the size limit of 3 MiB. Please upgrade to a paid plan to deploy Workers up to 10 MiB. https://dash.cloudflare.com/99d398c859290492bdddb84cbd338b51/workers/plans [code: 10027]
2026-01-17T19:15:23.197Z	  To learn more about this error, visit: https://developers.cloudflare.com/workers/platform/limits/#worker-size
2026-01-17T19:15:23.197Z	  Here are the 5 largest dependencies included in your script:
2026-01-17T19:15:23.197Z	  
2026-01-17T19:15:23.197Z	  - .open-next/server-functions/default/handler.mjs - 15675.87 KiB
2026-01-17T19:15:23.197Z	  - node_modules/next/dist/compiled/@vercel/og/resvg.wasm - 1346.05 KiB
2026-01-17T19:15:23.198Z	  - .open-next/middleware/handler.mjs - 138.13 KiB
2026-01-17T19:15:23.198Z	  - node_modules/next/dist/compiled/@vercel/og/yoga.wasm - 86.58 KiB
2026-01-17T19:15:23.198Z	  - .open-next/cloudflare/images.js - 17.80 KiB
2026-01-17T19:15:23.198Z	  
2026-01-17T19:15:23.198Z	  If these are unnecessary, consider removing them
2026-01-17T19:15:23.198Z	  
2026-01-17T19:15:23.198Z	
2026-01-17T19:15:23.198Z	
2026-01-17T19:15:23.207Z	
2026-01-17T19:15:23.209Z	✘ [ERROR] A request to the Cloudflare API (/accounts/99d398c859290492bdddb84cbd338b51/workers/scripts/app-crm-ia-four-sales/versions) failed.
2026-01-17T19:15:23.209Z	
2026-01-17T19:15:23.209Z	  Your Worker exceeded the size limit of 3 MiB. Please upgrade to a paid plan to deploy Workers up to 10 MiB. https://dash.cloudflare.com/99d398c859290492bdddb84cbd338b51/workers/plans [code: 10027]
2026-01-17T19:15:23.210Z	  To learn more about this error, visit: https://developers.cloudflare.com/workers/platform/limits/#worker-size
2026-01-17T19:15:23.210Z	
2026-01-17T19:15:23.210Z	  
2026-01-17T19:15:23.210Z	  If you think this is a bug, please open an issue at: https://github.com/cloudflare/workers-sdk/issues/new/choose
2026-01-17T19:15:23.210Z	
2026-01-17T19:15:23.210Z	
2026-01-17T19:15:23.210Z	
2026-01-17T19:15:23.210Z	Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
2026-01-17T19:15:23.233Z	🪵  Logs were written to "/opt/buildhome/.config/.wrangler/logs/wrangler-2026-01-17_19-15-11_577.log"
2026-01-17T19:15:23.371Z	Failed: error occurred while running deploy command