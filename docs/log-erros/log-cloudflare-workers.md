# Log Cloudflare Workers - Build 2026-01-17

## Log original (deduplicado)
2026-01-17T16:28:08.860Z	Initializing build environment...
2026-01-17T16:28:10.135Z	Success: Finished initializing build environment
2026-01-17T16:28:10.504Z	Cloning repository...
2026-01-17T16:28:11.759Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-01-17T16:28:11.760Z	Restoring from dependencies cache
2026-01-17T16:28:11.762Z	Restoring from build output cache
2026-01-17T16:28:11.924Z	Installing project dependencies: npm clean-install --progress=false
2026-01-17T16:28:33.098Z	
2026-01-17T16:28:33.098Z	added 655 packages, and audited 656 packages in 21s
2026-01-17T16:28:33.103Z	
2026-01-17T16:28:33.103Z	154 packages are looking for funding
2026-01-17T16:28:33.103Z	  run `npm fund` for details
2026-01-17T16:28:33.103Z	
2026-01-17T16:28:33.103Z	found 0 vulnerabilities
2026-01-17T16:28:33.324Z	Executing user build command: npm run build
2026-01-17T16:28:33.573Z	
2026-01-17T16:28:33.575Z	> temp-crm@0.1.0 build
2026-01-17T16:28:33.575Z	> next build
2026-01-17T16:28:33.575Z	
2026-01-17T16:28:34.403Z	⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2026-01-17T16:28:34.408Z	Attention: Next.js now collects completely anonymous telemetry regarding usage.
2026-01-17T16:28:34.408Z	This information is used to shape Next.js' roadmap and prioritize features.
2026-01-17T16:28:34.409Z	You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2026-01-17T16:28:34.409Z	https://nextjs.org/telemetry
2026-01-17T16:28:34.411Z	
2026-01-17T16:28:34.429Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-17T16:28:34.430Z	
2026-01-17T16:28:34.539Z	  Creating an optimized production build ...
2026-01-17T16:28:58.111Z	✓ Compiled successfully in 23.0s
2026-01-17T16:28:58.117Z	  Running TypeScript ...
2026-01-17T16:29:13.827Z	Failed to compile.
2026-01-17T16:29:13.828Z	
2026-01-17T16:29:13.828Z	Type error: Type 'typeof import("/opt/buildhome/repo/src/app/api/deals/[dealId]/route")' does not satisfy the constraint 'RouteHandlerConfig<"/api/deals/[dealId]">'.
2026-01-17T16:29:13.828Z	  Types of property 'GET' are incompatible.
2026-01-17T16:29:13.828Z	    Type '(request: NextRequest, { params }: { params: { dealId: string; }; }) => Promise<Response>' is not assignable to type '(request: NextRequest, context: { params: Promise<{ dealId: string; }>; }) => void | Response | Promise<void | Response>'.
2026-01-17T16:29:13.828Z	      Types of parameters '__1' and 'context' are incompatible.
2026-01-17T16:29:13.828Z	        Type '{ params: Promise<{ dealId: string; }>; }' is not assignable to type '{ params: { dealId: string; }; }'.
2026-01-17T16:29:13.828Z	          Types of property 'params' are incompatible.
2026-01-17T16:29:13.828Z	            Property 'dealId' is missing in type 'Promise<{ dealId: string; }>' but required in type '{ dealId: string; }'.
2026-01-17T16:29:13.828Z	
2026-01-17T16:29:13.915Z	Next.js build worker exited with code: 1 and signal: null
2026-01-17T16:29:13.964Z	Failed: error occurred while running build command

## Diagnostico
- Falha de build causada por assinatura do handler GET com `params` sincrono em `/api/deals/[dealId]`.

## Correcao aplicada
- Atualizado `src/app/api/deals/[dealId]/route.ts` para receber `params` como `Promise` e aguardar `dealId`.

## Status
- Corrigido no codebase. Reexecutar o build no Cloudflare.
