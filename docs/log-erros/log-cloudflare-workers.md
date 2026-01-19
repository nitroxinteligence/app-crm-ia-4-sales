2026-01-19T15:55:32.049Z	Initializing build environment...
2026-01-19T15:55:33.645Z	Success: Finished initializing build environment
2026-01-19T15:55:34.098Z	Cloning repository...
2026-01-19T15:55:35.385Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-01-19T15:55:35.387Z	Restoring from dependencies cache
2026-01-19T15:55:35.389Z	Restoring from build output cache
2026-01-19T15:55:35.693Z	Success: Build output restored from build cache.
2026-01-19T15:55:39.311Z	Success: Dependencies restored from build cache.
2026-01-19T15:55:39.312Z	Installing project dependencies: npm clean-install --progress=false
2026-01-19T15:55:48.924Z	npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
2026-01-19T15:56:00.078Z	
2026-01-19T15:56:00.079Z	added 1040 packages, and audited 1041 packages in 20s
2026-01-19T15:56:00.079Z	
2026-01-19T15:56:00.079Z	204 packages are looking for funding
2026-01-19T15:56:00.079Z	  run `npm fund` for details
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	14 low severity vulnerabilities
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	To address issues that do not require attention, run:
2026-01-19T15:56:00.152Z	  npm audit fix
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	To address all issues (including breaking changes), run:
2026-01-19T15:56:00.152Z	  npm audit fix --force
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	Run `npm audit` for details.
2026-01-19T15:56:00.520Z	Executing user build command: npm run pages:build
2026-01-19T15:56:00.776Z	
2026-01-19T15:56:00.776Z	> temp-crm@0.1.0 pages:build
2026-01-19T15:56:00.776Z	> next build && npx opennextjs-cloudflare build
2026-01-19T15:56:00.776Z	
2026-01-19T15:56:01.551Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-19T15:56:01.552Z	
2026-01-19T15:56:01.627Z	  Creating an optimized production build ...
2026-01-19T15:56:25.666Z	✓ Compiled successfully in 23.5s
2026-01-19T15:56:25.674Z	  Running TypeScript ...
2026-01-19T15:56:42.288Z	Failed to compile.
2026-01-19T15:56:42.289Z	
2026-01-19T15:56:42.289Z	./src/components/inbox/visao-inbox.tsx:943:9
2026-01-19T15:56:42.289Z	Type error: Argument of type '(conversa: ConversaInbox) => ConversaInbox | { mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; ... 11 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean | undefined; }' is not assignable to parameter of type '(conversa: ConversaInbox) => ConversaInbox'.
2026-01-19T15:56:42.289Z	  Type 'ConversaInbox | { mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; ... 9 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean | undefined; }' is not assignable to type 'ConversaInbox'.
2026-01-19T15:56:42.289Z	    Type '{ mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; ... 7 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean; }' is not assignable to type 'ConversaInbox'.
2026-01-19T15:56:42.289Z	      Types of property 'mensagens' are incompatible.
2026-01-19T15:56:42.289Z	        Type '(MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; ... 6 more ...; resposta: { ...; } | undefined; })[]' is not assignable to type 'MensagemInbox[]'.
2026-01-19T15:56:42.289Z	          Type 'MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; ... 6 more ...; resposta: { ...; } | undefined; }' is not assignable to type 'MensagemInbox'.
2026-01-19T15:56:42.289Z	            Type '{ id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; clientMessageId: string | undefined; ... 5 more ...; resposta: { ...; } | undefined; }' is not assignable to type 'MensagemInbox'.
2026-01-19T15:56:42.289Z	              Types of property 'envioStatus' are incompatible.
2026-01-19T15:56:42.289Z	                Type 'string' is not assignable to type '"sending" | "sent" | "failed" | undefined'.
2026-01-19T15:56:42.289Z	
2026-01-19T15:56:42.289Z	  941 |       atualizarConversa(
2026-01-19T15:56:42.289Z	  942 |         payload.conversation_id,
2026-01-19T15:56:42.289Z	> 943 |         (conversa) => {
2026-01-19T15:56:42.289Z	      |         ^
2026-01-19T15:56:42.289Z	  944 |           if (conversa.mensagens.some((mensagem) => mensagem.id === payload.message.id)) {
2026-01-19T15:56:42.289Z	  945 |             return conversa;
2026-01-19T15:56:42.289Z	  946 |           }
2026-01-19T15:56:42.416Z	Next.js build worker exited with code: 1 and signal: null
2026-01-19T15:56:55.350Z	Failed: error occurred while running build command
2026-01-19T15:55:32.049Z	Initializing build environment...
2026-01-19T15:55:33.645Z	Success: Finished initializing build environment
2026-01-19T15:55:34.098Z	Cloning repository...
2026-01-19T15:55:35.385Z	Detected the following tools from environment: npm@10.9.2, nodejs@22.16.0
2026-01-19T15:55:35.387Z	Restoring from dependencies cache
2026-01-19T15:55:35.389Z	Restoring from build output cache
2026-01-19T15:55:35.693Z	Success: Build output restored from build cache.
2026-01-19T15:55:39.311Z	Success: Dependencies restored from build cache.
2026-01-19T15:55:39.312Z	Installing project dependencies: npm clean-install --progress=false
2026-01-19T15:55:48.924Z	npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
2026-01-19T15:56:00.078Z	
2026-01-19T15:56:00.079Z	added 1040 packages, and audited 1041 packages in 20s
2026-01-19T15:56:00.079Z	
2026-01-19T15:56:00.079Z	204 packages are looking for funding
2026-01-19T15:56:00.079Z	  run `npm fund` for details
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	14 low severity vulnerabilities
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	To address issues that do not require attention, run:
2026-01-19T15:56:00.152Z	  npm audit fix
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	To address all issues (including breaking changes), run:
2026-01-19T15:56:00.152Z	  npm audit fix --force
2026-01-19T15:56:00.152Z	
2026-01-19T15:56:00.152Z	Run `npm audit` for details.
2026-01-19T15:56:00.520Z	Executing user build command: npm run pages:build
2026-01-19T15:56:00.776Z	
2026-01-19T15:56:00.776Z	> temp-crm@0.1.0 pages:build
2026-01-19T15:56:00.776Z	> next build && npx opennextjs-cloudflare build
2026-01-19T15:56:00.776Z	
2026-01-19T15:56:01.551Z	▲ Next.js 16.1.1 (Turbopack)
2026-01-19T15:56:01.552Z	
2026-01-19T15:56:01.627Z	  Creating an optimized production build ...
2026-01-19T15:56:25.666Z	✓ Compiled successfully in 23.5s
2026-01-19T15:56:25.674Z	  Running TypeScript ...
2026-01-19T15:56:42.288Z	Failed to compile.
2026-01-19T15:56:42.289Z	
2026-01-19T15:56:42.289Z	./src/components/inbox/visao-inbox.tsx:943:9
2026-01-19T15:56:42.289Z	Type error: Argument of type '(conversa: ConversaInbox) => ConversaInbox | { mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; ... 11 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean | undefined; }' is not assignable to parameter of type '(conversa: ConversaInbox) => ConversaInbox'.
2026-01-19T15:56:42.289Z	  Type 'ConversaInbox | { mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; ... 9 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean | undefined; }' is not assignable to type 'ConversaInbox'.
2026-01-19T15:56:42.289Z	    Type '{ mensagens: (MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; ... 7 more ...; resposta: { ...; } | undefined; })[]; ... 21 more ...; mensagensCarregando?: boolean; }' is not assignable to type 'ConversaInbox'.
2026-01-19T15:56:42.289Z	      Types of property 'mensagens' are incompatible.
2026-01-19T15:56:42.289Z	        Type '(MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; ... 6 more ...; resposta: { ...; } | undefined; })[]' is not assignable to type 'MensagemInbox[]'.
2026-01-19T15:56:42.289Z	          Type 'MensagemInbox | { id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; ... 6 more ...; resposta: { ...; } | undefined; }' is not assignable to type 'MensagemInbox'.
2026-01-19T15:56:42.289Z	            Type '{ id: string; autor: "contato" | "equipe" | "agente"; tipo: TipoMensagem; conteudo: string; horario: string; dataHora: string; interno: boolean; clientMessageId: string | undefined; ... 5 more ...; resposta: { ...; } | undefined; }' is not assignable to type 'MensagemInbox'.
2026-01-19T15:56:42.289Z	              Types of property 'envioStatus' are incompatible.
2026-01-19T15:56:42.289Z	                Type 'string' is not assignable to type '"sending" | "sent" | "failed" | undefined'.
2026-01-19T15:56:42.289Z	
2026-01-19T15:56:42.289Z	  941 |       atualizarConversa(
2026-01-19T15:56:42.289Z	  942 |         payload.conversation_id,
2026-01-19T15:56:42.289Z	> 943 |         (conversa) => {
2026-01-19T15:56:42.289Z	      |         ^
2026-01-19T15:56:42.289Z	  944 |           if (conversa.mensagens.some((mensagem) => mensagem.id === payload.message.id)) {
2026-01-19T15:56:42.289Z	  945 |             return conversa;
2026-01-19T15:56:42.289Z	  946 |           }
2026-01-19T15:56:42.416Z	Next.js build worker exited with code: 1 and signal: null
2026-01-19T15:56:55.350Z	Failed: error occurred while running build command