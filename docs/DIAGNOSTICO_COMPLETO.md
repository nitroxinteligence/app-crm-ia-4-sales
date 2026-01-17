# Diagnóstico Completo do Codebase

## Sumário Executivo
- **Objetivo:** Avaliar detalhadamente o estado atual do projeto *CRM da Vertical Partners* para determinar sua prontidão para produção.
- **Escopo analisado:** Diretórios `apps`, `docs`, `logs`, `public`, `scripts`, `src`, `supabase` e a raiz do repositório (excluídos `node_modules` e `.next` por serem artefatos de build/dependências).
- **Metodologia:** Busca por marcadores de dívida técnica em comentários (`// TODO`, `# FIXME`, `/* NOTE */`), análise de arquivos de configuração `.env`, inspeção de padrões de desempenho conhecidos e contagem de funcionalidades implementadas vs. ausentes.
- **Resultado geral:** **Prontidão estimada: 64 %**. O projeto possui a maior parte das funcionalidades essenciais funcionando, porém há áreas que requerem ajustes antes da liberação para produção.

---

## 1. Cobertura Funcional
| Área | Funcionalidades Detectadas | Status |
|------|---------------------------|--------|
| **Contatos** | Listagem, filtros, seleção em lote, visualização detalhada | ✅ Completo |
| **Relatórios** | Exportação, filtragem por canal, endpoints API (`/reports/*`) | ✅ Completo |
| **Integrações WhatsApp** | Tokens, configuração, webhook | ✅ Completo |
| **Autenticação** | Formulário de cadastro, login, integração Google OAuth | ✅ Completo |
| **Push Notifications** | Configuração Pusher, chaves públicas | ✅ Completo |
| **Supabase** | Conexão, chaves de serviço, URLs | ✅ Completo |
| **Baileys (WhatsApp API)** | Configurações de reconexão, keep‑alive, timeouts | ✅ Completo |
| **R2 (Cloudflare Storage)** | Buckets configurados, URLs públicos | ✅ Completo |
| **Outros** | Scripts auxiliares, documentação, CI/CD | ⚠️ Parcial |

> **Observação:** Funcionalidades marcadas como *parcial* ainda dependem de ajustes de configuração ou de código ainda em desenvolvimento (ex.: scripts de deploy, documentação completa).

---

## 2. Dívida Técnica – Marcadores TODO/FIXME/NOTE
### 2.1 Método de Busca
- **Padrões considerados:** `// TODO`, `# FIXME`, `/* NOTE */` (delimitados por comentários).
- **Diretórios analisados:** `apps`, `docs`, `scripts`, `src` (excluídos `node_modules` e `.next`).

### 2.2 Resultado
- **Marcadores encontrados no código-fonte:** **0**.
- **Observação:** ocorrências textuais da palavra "todo" em documentos não representam dívida técnica.

> **Impacto:** As pendências estão implícitas nas áreas de arquitetura, validação, performance e segurança descritas nas seções 4, 7 e 8. Recomenda‑se registrar essas pendências como tarefas explícitas (issues) para rastreabilidade.

---

## 3. Validação dos Arquivos `.env`
### 3.1 Arquivo `.env` na raiz
```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
NEXT_PUBLIC_SITE_URL=... (três valores diferentes)
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_ACCESS_TOKEN=...
... (demais variáveis)
```
- **Problemas detectados:**
  1. **Variáveis duplicadas** – `NEXT_PUBLIC_SITE_URL` aparece três vezes com valores diferentes (produção, localhost, Cloudflare). Isso pode gerar comportamento inesperado dependendo do ambiente.
  2. **Chaves expostas** – Tokens e chaves secretas estão em texto plano no repositório. Recomenda‑se mover para um gerenciador de segredos (ex.: Supabase Vault, 1Password) e usar placeholders no repo.
  3. **Valores vazios ou placeholders** – Algumas linhas estão em branco ou contêm `""` (ex.: `REDIS_URL` contém aspas duplas). Pode causar falhas de conexão.

### 3.2 Arquivo `.env` em `apps/baileys`
```dotenv
AGENTS_API_URL=http://localhost:8001
AGENTS_API_KEY=...
PORT=7001
BAILEYS_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PUSHER_APP_ID=2102606
... (demais variáveis)
```
- **Problemas detectados:**
  1. **Hard‑coded URLs de localhost** – `AGENTS_API_URL` aponta para `http://localhost:8001`. Em produção isso deve ser substituído por URL do serviço.
  2. **Ausência de variáveis de ambiente de produção** (ex.: `NEXT_PUBLIC_SUPABASE_URL` não está presente aqui, podendo gerar inconsistência).

### 3.3 Recomendações Gerais
- Consolidar todas as variáveis de ambiente em um único arquivo de template (`.env.example`) com comentários explicativos.
- Validar duplicidades e valores vazios com `npm run env:validate` (script em `scripts/validate-env.mjs`).
- Remover chaves secretas do versionamento e armazená‑las em serviços de secret management.

---

## 4. Análise de Desempenho e Padrões de Código
### 4.1 Padrões de Anti‑desempenho Identificados
| Arquivo | Linha | Padrão | Impacto Potencial |
|--------|------|--------|-------------------|
| `src/app/api/reports/export/route.ts` | 99 | Condição `if (canal && canal !== "todos")` repetida em vários endpoints | Duplicação de lógica e manutenção mais difícil. |
| `src/components/contatos/visao-contatos.tsx` | 742‑746 | Filtros encadeados dentro de loops de renderização | Pode causar re‑renderizações caras em listas grandes. |
| `apps/baileys/src/index.js` | 3193‑3203 | Variável `isVoiceNote` calculada repetidamente dentro de loop | Pode levar a trabalho síncrono desnecessário. |

### 4.2 Dependências Desatualizadas
- **Comando executado:** `npm outdated`.
- **Resumo do relatório:**

| Pacote | Atual | Wanted | Latest |
|--------|-------|--------|--------|
| `@aws-sdk/client-s3` | 3.970.0 | 3.971.0 | 3.971.0 |
| `@aws-sdk/s3-request-presigner` | 3.970.0 | 3.971.0 | 3.971.0 |
| `@supabase/supabase-js` | 2.89.0 | 2.90.1 | 2.90.1 |
| `@types/node` | 20.19.27 | 20.19.30 | 25.0.9 |
| `@types/react` | 19.2.7 | 19.2.8 | 19.2.8 |
| `eslint-config-next` | 16.1.1 | 16.1.1 | 16.1.3 |
| `next` | 16.1.1 | 16.1.1 | 16.1.3 |
| `zod` | 3.25.76 | 3.25.76 | 4.3.5 |

### 4.3 Recomendações de Otimização
1. **Utilizar `Promise.all`** para chamadas assíncronas em loops onde apropriado.
2. **Memoizar funções de filtro** com `useMemo` ou `useCallback` em componentes React.
3. **Revisar duplicação de lógica de validação** e extrair para funções utilitárias.
4. **Adicionar testes de carga** nos endpoints críticos (`/reports/*`, `/inbox/*`).

---

## 5. Estimativa de Prontidão para Produção
| Critério | Peso | Avaliação | Pontuação |
|----------|------|-----------|-----------|
| Funcionalidades essenciais | 40 % | 90 % (todos os fluxos críticos implementados) | 36 % |
| Dívida técnica (pendências sem rastreio) | 20 % | 40 % (pendências difusas, sem TODOs explícitos) | 8 % |
| Configuração de ambiente (.env) | 15 % | 50 % (variáveis duplicadas, chaves expostas) | 7,5 % |
| Performance / Escalabilidade | 15 % | 60 % (alguns anti‑padrões, sem testes de carga) | 9 % |
| Testes automatizados | 10 % | 30 % (poucos testes unitários/integrados) | 3 % |
| **Total** | 100 % |  | **63,5 %** |

**Arredondado para 64 %** ao considerar margem de melhoria nas áreas de teste e documentação.

---

## 6. Plano de Ação Prioritário
1. **Mapear e registrar pendências críticas** (issues) – priorizar rotas de API e componentes de contato.
2. **Consolidar e securizar `.env`** – criar `.env.example`, validar duplicidades e mover segredos para um cofre.
3. **Refatorar filtros e loops** em componentes React para melhorar renderização.
4. **Atualizar dependências** e garantir que nenhuma vulnerabilidade crítica exista.
5. **Ampliar cobertura de testes** (unitários + integração) nas áreas de relatórios e integração WhatsApp.
6. **Executar testes de carga** nos endpoints de exportação de relatórios.
7. **Documentar** variáveis de ambiente e processos de deploy em `docs/DEPLOYMENT_GUIDE.md`.

## 7. Análise Detalhada da Pasta `apps`

### Visão Geral
- Subpastas: `agents`, `baileys`
- Total de arquivos de código: não aferido nesta rodada.
- Nenhum marcador TODO/FIXME com prefixo de comentário encontrado fora de dependências.

### `agents` (Python FastAPI)
- **Arquitetura:** Estrutura modular com camadas `clients`, `services`, `schemas`. Boa separação, porém:
  - Uso de variáveis de ambiente hardcoded em `config.py` (ex.: URLs padrão `https://free.uazapi.com`).
  - Falta de validação de valores críticos (ex.: `AGENTS_API_URL` pode ficar vazio, gerando falhas silenciosas).
  - Ausência de tratamento de exceções em chamadas HTTP (`httpx.Client`) – erros propagam sem retry.
- **Segurança:** Chaves e tokens são lidas diretamente de env, mas não há verificação de presença; pode iniciar aplicação sem credenciais.
- **Bugs Potenciais:** Funções de validação de URL (`ensure_redis_ssl_options`) podem retornar `None` se `value` não for string.
- **Funcionalidades faltantes:** Não há testes unitários para os serviços; falta cobertura de integração.

### `baileys` (Node.js)
- **Arquitetura monolítica:** Um único arquivo `src/index.js` (~3200 linhas) combina:
  - Servidor Express
  - Integração Baileys
  - Gerenciamento de sessões, fila de retry, Pusher, R2 storage, etc.
  - Isso dificulta manutenção e testes unitários.
- **Hardcoded / Configurações:**
  - Valores padrão vazios para várias variáveis de ambiente (`API_KEY`, `SUPABASE_URL`, etc.).
  - Construção de `R2_ENDPOINT` com fallback que pode gerar URL incorreta se `R2_ACCOUNT_ID` ausente.
- **Bugs e Más Práticas:**
  - Uso de `await` dentro de loops sem `Promise.all` (ex.: carregamento de fila de retry).
  - Funções de retry manipulam estado global sem sincronização (possível race condition).
  - Falta de validação de payloads nas rotas Express, risco de injeção.
- **Erros Detectados:**
  - `throw new Error` em falta de variáveis críticas interrompe a inicialização sem tratamento.
  - `logger.warn` usado para erros críticos (ex.: falha ao carregar fila) – deveria abortar.
- **Funcionalidades ausentes:** Não há endpoint de healthcheck; ausência de métricas de performance.

### Conclusão
- **Bugs críticos:** Falta de validação de env, possíveis exceções não tratadas, race conditions na fila de retry.
- **Arquitetura:** `baileys` precisa ser refatorado em módulos (ex.: separar camada de API, camada de Baileys, camada de persistência).
- **Segurança:** Centralizar carregamento de segredos e validar presença antes de iniciar.
- **Próximos passos:** Refatorar `baileys/src/index.js` em múltiplos arquivos, adicionar testes unitários, implementar validação de configuração, melhorar tratamento de erros nas chamadas HTTP.

---

## 8. Análise Detalhada da Pasta `src`

### Visão Geral
- **Total de arquivos:** ~200 arquivos TypeScript/TSX.
- **Frameworks principais:** Next.js (App Router), React, Tailwind CSS, Zod, TanStack Query.

### Estrutura de Diretórios
- `src/app`: Rotas da aplicação Next.js (App Router + route handlers).
- `src/components`: Componentes React reutilizáveis.
- `src/hooks`: Custom hooks.
- `src/lib`: Clientes de serviços externos (Supabase, R2, Google Calendar, Pusher, Agentes) e utilitários.
- `src/styles`: Estilos globais.
- `src/types`: Definições de tipos TypeScript.

### Principais Problemas Identificados
1. **Rotas API monolíticas**
   - Ex.: `src/app/api/inbox/send/route.ts` (951 linhas) combina validação, persistência, lógica de envio via Baileys e tratamento de erros.
   - Ex.: `src/app/api/webhooks/whatsapp/route.ts` (≈800 linhas) mistura parsing de eventos, chamadas externas e atualização de DB.
   - **Recomendação:** Extrair lógica de negócio para serviços (`src/services/*`) e criar repositórios (`src/repositories/*`).

2. **Validação de Entrada Inconsistente**
   - Apenas ~30% das rotas utilizam schemas Zod; muitas confiam em `request.json()` sem sanitização.
   - Falta de validação de parâmetros de URL (`params.id`).
   - **Recomendação:** Padronizar uso de Zod para todas as entradas e criar middleware de validação.

3. **Tratamento de Erros Fragmentado**
   - Respostas variam entre `500`, `400` e `200` com mensagens genéricas.
   - Ausência de camada de erro centralizada.
   - **Recomendação:** Implementar middleware `errorHandler` que converte exceções em respostas HTTP consistentes.

4. **Hardcoded URLs e Valores**
   - URLs estáticas como `https://graph.facebook.com` e `https://accounts.google.com/o/oauth2/v2/auth` espalhadas pelo código.
   - Fallbacks vazios para variáveis de ambiente (`process.env.API_KEY ?? ""`).
   - **Recomendação:** Centralizar URLs e valores padrão em `src/lib/config.ts` e garantir que variáveis críticas lancem erro se ausentes.

5. **Problemas de Concorrência**
   - Uso de `await` dentro de loops (ex.: processamento de fila de retry) pode bloquear o event loop.
   - Estado global mutável (`sessions`, `retryQueue`) sem sincronização.
   - **Recomendação:** Refatorar para `Promise.all` e usar estruturas de dados imutáveis ou mutex.

6. **Segurança**
   - Exposição de chaves públicas (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PUSHER_KEY`).
   - Falta de sanitização de strings ao gerar HTML ou inserir no banco (risco XSS/SQLi).
   - Ausência de proteção CSRF em rotas POST.
   - **Recomendação:** Auditar todas as inserções de dados, usar bibliotecas de sanitização e habilitar tokens CSRF.

7. **Performance e Escalabilidade**
   - Falta de caching de resultados de chamadas externas (ex.: Graph API).
   - Componentes React sem memoização (`useMemo`, `React.memo`).
   - **Recomendação:** Implementar caching (LRU) e otimizar componentes críticos.

8. **Testes e Cobertura**
   - Poucos testes unitários para hooks e componentes.
   - Falta de testes de integração para rotas API.
   - **Recomendação:** Introduzir Jest + React Testing Library para UI, Supertest para API, e criar pipeline de cobertura.

9. **Observabilidade**
   - Ausência de endpoint `/healthz`.
   - Logs não estruturados (uso de `logger.warn` sem contexto).
   - **Recomendação:** Adicionar healthcheck, usar logger JSON (ex.: `pino`) e integrar com Sentry.

### Conclusão
A pasta `src` contém a maior parte da lógica de negócio e apresenta problemas de modularidade, validação, segurança e performance. A refatoração deve focar em dividir rotas monolíticas, padronizar validação e tratamento de erros, remover valores hardcoded, melhorar testes e implementar observabilidade. Essas ações são críticas para garantir estabilidade e prontidão para produção.

---

## 9. Próximos Passos
- **Revisão do usuário** deste diagnóstico.
- **Aprovação** para iniciar a execução das correções listadas.
- **Agendamento** de sessões de teste de carga e revisão de segurança.

---

## Checklist de Melhorias
- [x] Corrigir escopo e metodologia da busca de dívida técnica.
- [x] Ajustar inconsistências de prontidão (percentuais e arredondamento).
- [x] Padronizar numeração e ordem das seções.
- [x] Refinar a seção de `apps` com observações coerentes de rastreio.
- [x] Atualizar linguagem de riscos/impactos para maior precisão.
- [x] Executar `npm outdated` e registrar o relatório de dependências.
- [x] Consolidar `.env` em `.env.example` com validação automatizada.
- [x] Publicar `docs/DEPLOYMENT_GUIDE.md` com processo de deploy.
- [x] Adicionar healthcheck (`/api/healthz`) e documentar no guia de deploy.
- [x] Padronizar respostas/validação com helpers (`src/lib/api/*`) nas rotas de convites.
- [x] Centralizar leitura de envs com `src/lib/config.ts` em módulos críticos.
- [x] Padronizar filtro `canal` nos relatórios (`src/lib/reports/filters.ts`).
- [x] Otimizar filtros/seleção em `src/components/contatos/visao-contatos.tsx`.
- [x] Padronizar webhooks WhatsApp/Instagram e rotas `process` (validação + env).
- [x] Padronizar validação/erros em `/api/inbox/send` e `/api/inbox/whatsapp/send-template`.
- [x] Atualizar lockfile (`npm install`) após incluir `zod` em `package.json`.
- [x] Aplicar padronização no webhook Google Calendar.
- [x] Padronizar `/api/integrations/whatsapp/connect` (validação + env + erros).
- [x] Padronizar `/api/integrations/google/connect` (env + erros).
- [x] Padronizar `/api/integrations/google/status` e `/api/integrations/google/disconnect`.
- [x] Padronizar `/api/integrations/whatsapp/status`.
- [x] Padronizar `/api/integrations/whatsapp-baileys/status`.
- [x] Padronizar `/api/integrations/whatsapp-baileys/connect` e `/api/integrations/whatsapp-baileys/disconnect`.
- [x] Padronizar `/api/integrations/instagram/status` e `/api/integrations/instagram/connect`.
- [x] Padronizar `/api/integrations/whatsapp/templates/sync`.
- [x] Padronizar `/api/integrations/whatsapp-baileys/groups`.
- [x] Padronizar `/api/inbox/whatsapp/templates`.
- [x] Padronizar `/api/inbox/notes`.
- [x] Padronizar `/api/inbox/tags`.
- [x] Padronizar `/api/inbox/quick-replies`.
- [x] Padronizar `/api/inbox/block`.
- [x] Padronizar `/api/inbox/deals`.
- [x] Padronizar `/api/inbox/conversations/[conversationId]`.
- [x] Padronizar `/api/contacts` e `/api/contacts/[contactId]`.
- [x] Padronizar `/api/leads`.
- [x] Padronizar `/api/leads/[leadId]`.
- [x] Padronizar `/api/tasks`.
- [x] Padronizar `/api/tasks/[taskId]`.
- [x] Padronizar `/api/pipeline`.
- [x] Padronizar `/api/pipeline/[pipelineId]`.
- [x] Padronizar `/api/pipeline/stages`.
- [x] Padronizar `/api/settings/fields/[fieldId]`.
- [x] Padronizar `/api/settings/fields`.
- [x] Padronizar `/api/settings/invites`.
- [x] Padronizar `/api/settings/profile`.
- [x] Padronizar `/api/settings/team`.
- [x] Padronizar `/api/settings/privacy`.
- [x] Padronizar `/api/settings/billing`.
- [x] Padronizar `/api/realtime/auth`.
- [x] Padronizar `/api/storage/signed-url`.
- [x] Padronizar `/api/plans/select`.
- [x] Padronizar `/api/plans/status`.
- [x] Padronizar `/api/calendar/events`.
- [x] Padronizar `/api/calendar/events/[eventId]`.
- [x] Padronizar `/api/calendar/sync`.
- [x] Padronizar `/api/reports/export`.
- [x] Padronizar `/api/reports/negocios`.
- [x] Padronizar `/api/reports/atendimentos`.
- [x] Padronizar `/api/crm/leads/convert`.
- [x] Padronizar `/api/auth/api-keys/[keyId]`.
- [x] Padronizar `/api/auth/api-keys`.
- [x] Padronizar `/api/deals`.
- [x] Padronizar `/api/deals/[dealId]`.
- [x] Adicionar helpers HTTP 502/503 em `src/lib/api/responses.ts`.
- [x] Padronizar `/api/agentes/sandbox`.
- [x] Padronizar `/api/agentes/conhecimento/processar`.
- [x] Centralizar envs em `src/lib/auth/api-auth.ts`.
- [x] Centralizar envs em `src/lib/r2/server.ts`.
- [x] Centralizar envs em `src/lib/uazapi.ts`.
- [x] Padronizar 502/503 em webhooks WhatsApp/Instagram (incluindo rotas `process`).
- [x] Padronizar 502/503 em integrações WhatsApp templates sync e Baileys groups.
- [x] Adicionar helpers HTTP 409/410/415 em `src/lib/api/responses.ts`.
- [x] Padronizar respostas 409/410/415/502 em `/api/inbox/send`.
- [x] Adicionar helper HTTP dinâmico (`httpError`) em `src/lib/api/responses.ts`.
- [x] Padronizar resposta de erro dinâmica em `/api/inbox/whatsapp/send-template`.
- [x] Padronizar endpoints WhatsApp não oficial (410) com `gone` helper.
- [x] Adicionar helper HTTP 402 (`paymentRequired`) em `src/lib/api/responses.ts`.
- [x] Padronizar resposta 403 de permissões em `/api/integrations/whatsapp/connect`.
- [x] Padronizar respostas 402/409/502 em `/api/integrations/whatsapp-baileys/connect`.
- [x] Padronizar resposta 502 em `/api/integrations/whatsapp-baileys/disconnect`.
- [x] Extrair `parseGraphError` para helper compartilhado em `src/lib/whatsapp/graph.ts`.
- [x] Reutilizar `parseGraphError` em `/api/inbox/send` e `/api/inbox/whatsapp/send-template`.
- [x] Extrair helpers de anexos do inbox para `src/lib/inbox/attachments.ts`.
- [x] Extrair tipos do Supabase inbox para `src/lib/inbox/database.ts`.
- [x] Extrair helpers de mensagens do inbox para `src/lib/inbox/messages.ts`.
- [x] Extrair helpers de envio do inbox para `src/lib/inbox/senders.ts`.
- [x] Atualizar `/api/inbox/send` para usar helpers de envio compartilhados.
- [x] Extrair envio de mídia oficial do WhatsApp para `src/lib/inbox/senders.ts`.
- [x] Atualizar `/api/inbox/send` para usar `sendWhatsappMedia`.
- [x] Centralizar variáveis de ambiente do Baileys em `apps/baileys/src/config.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar config centralizada.
- [x] Extrair fila de retry do Baileys para `apps/baileys/src/retry-queue.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar retry queue modular.
- [x] Extrair realtime (Pusher) do Baileys para `apps/baileys/src/realtime.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar realtime modular.
- [x] Extrair estado de sessões do Baileys para `apps/baileys/src/session-state.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar estado de sessões modular.
- [x] Extrair repositório de sessões do Baileys para `apps/baileys/src/session-repository.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar repositório de sessões modular.
- [x] Extrair rotas de sessões do Baileys para `apps/baileys/src/routes/sessions.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar rotas de sessões modular.
- [x] Extrair bootstrap de sessões do Baileys para `apps/baileys/src/session-bootstrap.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar bootstrap modular.
- [x] Extrair rotas de mensagens do Baileys para `apps/baileys/src/routes/messages.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar rotas de mensagens modular.
- [x] Adicionar validação centralizada de envs do Baileys em `apps/baileys/src/validate-env.js`.
- [x] Atualizar `apps/baileys/src/index.js` para usar validação de envs.
- [x] Adicionar validação de envs no Agents (`apps/agents/app/config.py`).
- [x] Validar envs no startup do Agents em `apps/agents/app/main.py`.
- [x] Atualizar relatório de dependências com `npm outdated` (rodada atual).
- [x] Corrigir log do Cloudflare Workers e ajustar handler `/api/deals/[dealId]`.
