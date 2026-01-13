# Inbox WhatsApp - Analise e Plano de Implementacao

## Objetivo
Garantir que o /app/inbox funcione 100% com WhatsApp (oficial e nao-oficial), com conversas de grupos corretamente agrupadas, chats privados separados e uma operacao estavel/performance.

## Mapa de arquitetura atual

### Fluxo WhatsApp oficial (Cloud API)
1) `POST /api/webhooks/whatsapp` recebe o payload e grava em `webhook_events`.
2) Chama `AGENTS_API_URL/webhooks/whatsapp/process`.
3) `apps/agents` processa o evento em `whatsapp_ingestion.py`:
   - cria/atualiza `leads`, `conversations`, `messages`, `attachments`.
4) UI em `src/components/inbox` consulta `conversations` + `messages` via Supabase.

### Fluxo WhatsApp nao-oficial (UAZAPI)
1) `POST /api/webhooks/whatsapp-nao-oficial` recebe payload e grava em `webhook_events`.
2) Chama `AGENTS_API_URL/webhooks/whatsapp-nao-oficial/process`.
3) `apps/agents` processa em `uazapi_ingestion.py`:
   - identifica grupos, atualiza `leads`, `conversations`, `messages`, `attachments`.
4) UI consome dados via Supabase (mesmo modelo do oficial).

### UI Inbox
- `src/app/app/inbox/page.tsx` -> `VisaoInbox`.
- `VisaoInbox` busca conversas, assina realtime e monta o estado.
- `ListaConversas` lista e filtra.
- `ChatConversa` exibe mensagens e faz envio.

## Problemas observados (gaps)

### Grupos aparecendo como conversas privadas
- Em alguns payloads nao-oficiais, o grupo pode nao vir em `chatid`, e o sender vira o `wa_id`, criando conversa por participante.
- Resultado: mensagens do mesmo grupo aparecem em chats separados (por participante).

### Separacao visual de grupos x privados
- A lista atual mostra tudo em uma unica lista.
- Isso atrapalha o atendimento e nao atende o requisito "grupos e chats privados separados".

### Limites de informacao para grupos
- O modelo `messages` nao guarda o participante (sender name) em grupos.
- No chat, mensagens de grupo aparecem sem o nome do participante.

## Gargalos e pontos de melhoria

### Consultas pesadas no Inbox
- `VisaoInbox` carrega `conversations` com `messages` e `attachments` para TODAS as conversas.
- Em workspaces grandes, isso gera alta latencia e custo no Supabase.

### Realtime + polling
- Existe subscription realtime + `setInterval` a cada 6s (e outro de 8s para UAZAPI).
- Pode gerar excesso de refresh em ambientes com volume alto.

### Mensagens sem paginacao
- `ChatConversa` renderiza todas as mensagens da conversa (sem paginar).
- Necessario limitar/usar pagina incremental.

## Ajustes ja aplicados

- UAZAPI: melhor deteccao de grupo usando `chat_info` como fallback.
  - Arquivo: `apps/agents/app/services/uazapi_ingestion.py`.
- UI: listas separadas para grupos e conversas privadas.
  - Arquivo: `src/components/inbox/lista-conversas.tsx`.

## Plano detalhado (execucao)

### Fase 1 - Correcoes criticas de agrupamento (Curto prazo)
1) Validar payloads de grupos (UAZAPI):
   - Confirmar `wa_chatid` e `chatid` em payloads reais.
   - Garantir que `wa_id` use o id do grupo.
2) Verificar Cloud API (oficial):
   - Checar se existe `group_id` ou campo equivalente.
   - Se existir, usar como `wa_id` para criar a conversa do grupo.
3) Ajustar UI:
   - Mostrar grupos e privados em secoes separadas (feito).
   - Adicionar flag visual "Grupo" nos itens (ja existe).
4) Validar comportamento:
   - Mensagens de participantes distintos devem cair na mesma conversa (grupo).

### Fase 2 - Qualidade e consistencia (Medio prazo)
1) Adicionar metadata de participante em mensagens de grupo:
   - Campo `sender_name` ou `sender_id` em `messages`.
   - Exibir nome do participante no `ChatConversa`.
2) Melhorar state do Inbox:
   - Carregar apenas resumo de conversas na lista.
   - Buscar mensagens somente quando a conversa for aberta.
3) Paginar historico:
   - API para buscar mensagens por `conversation_id` com limit/offset.
   - Botao "carregar anteriores".

### Fase 3 - Performance e estabilidade (Medio/Longo prazo)
1) Realtime refinado:
   - Assinar somente inserts de `messages` e atualizar conversa selecionada.
   - Reduzir polling quando realtime estiver ativo.
2) Indices e consultas:
   - Garantir indices em `messages(conversation_id, created_at)`.
   - Considerar view/materialized para resumo de conversas.
3) Observabilidade:
   - Logar falhas de webhook e envios.
   - Painel simples de erro por integration_account.

## Aceite (Definition of Done)

- Mensagens de grupos aparecem em um unico chat do grupo.
- Chats privados e grupos aparecem separados na lista.
- Inbox suporta volume maior sem lentidao visivel (lista sem carregar todas as mensagens).
- Nenhuma regressao no envio de mensagens e anexos.

## Arquivos principais

- `src/components/inbox/visao-inbox.tsx`
- `src/components/inbox/lista-conversas.tsx`
- `src/components/inbox/chat-conversa.tsx`
- `src/app/api/webhooks/whatsapp/route.ts`
- `src/app/api/webhooks/whatsapp-nao-oficial/route.ts`
- `apps/agents/app/services/whatsapp_ingestion.py`
- `apps/agents/app/services/uazapi_ingestion.py`
