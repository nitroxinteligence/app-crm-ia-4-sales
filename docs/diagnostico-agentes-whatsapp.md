# Diagnostico Completo - Agentes IA e Integracao WhatsApp (Oficial + UAZAPI)

## Etapas e checklist desta entrega

Etapas definidas:
1) Consolidar requisitos e decisoes do usuario no diagnostico.
2) Mapear impactos por provider (Oficial vs UAZAPI) e canais.
3) Desenhar fluxo de configuracao do agente por provider.
4) Listar regras operacionais e de compliance para follow-up.
5) Consolidar checklist final de prontidao e proximos passos.

Checklist (marcar conforme concluido):
- [x] Etapa 1: Consolidar requisitos e decisoes no documento.
- [x] Etapa 2: Mapear impactos por provider e canais.
- [x] Etapa 3: Definir fluxo de configuracao do agente por provider.
- [x] Etapa 4: Listar regras operacionais e de compliance para follow-up.
- [x] Etapa 5: Consolidar checklist final de prontidao e proximos passos.

---

## Requisitos confirmados pelo usuario (decisoes finais)
- Modo do agente: sempre autonomo. Remover/ignorar modos alternativos.
- UAZAPI: nao tem janela de 24h. Follow-up liberado, mensagens em grupo e reacoes liberadas.
- WhatsApp Oficial: segue janela de 24h/72h e diretrizes Meta; follow-up fora da janela gera custo/limitacoes.
- Templates: obrigatorios apenas no WhatsApp Oficial; UAZAPI nao usa templates.
- Roteamento: 1 agente por numero (sem multi-agente por numero).
- Instagram: nao entra no fluxo agora (card com cadeado "Em breve").

---

## Fluxo de criacao do agente (novo requisito de UX)

Quando o usuario clicar em "Criar agente" em `/app/agentes`, deve abrir uma pagina limpa (sem topbar, sem sidebar) com 3 cards lado a lado:
1) Conectar API OFICIAL do WhatsApp (Meta)
2) Conectar API NAO OFICIAL do WhatsApp (UAZAPI)
3) Conectar ao Instagram (cadeado + "Em breve")

Ao selecionar uma opcao, o usuario segue para a configuracao do agente com variacoes por provider.

Regras de selecao:
- Oficial: habilitar fluxo de templates e mostrar aviso de janela e custos.
- Nao oficial: liberar follow-up e mensagens sem templates.
- Instagram: bloqueado (apenas informativo).

---

## Modais obrigatorios por provider

1) UAZAPI: modal imediato ao selecionar\n
Mensagem: aviso de risco de banimento e recomendacao de uso da API Oficial.

2) WhatsApp Oficial: modal na etapa de follow-up\n
Mensagem: diretrizes oficiais, janela de 24h/72h, custos e link para documentacao Meta.

---

## Regras de follow-up por provider

WhatsApp Oficial (Meta):
- Follow-up deve respeitar janela.
- Fora da janela, somente template aprovado.
- Exibir explicacao de custos e politicas no modal.

UAZAPI (Nao oficial):
- Follow-up liberado, sem templates.
- Sem bloqueio por janela.

---

## Checklist de implementacao (pendente)

Checklist macro por etapa (sem execucao ainda):
- [x] Etapa A: Pagina inicial de selecao de provider (3 cards, layout limpo).
- [x] Etapa B: Fluxo Oficial (com templates e aviso de janela/custo).
- [x] Etapa C: Fluxo UAZAPI (sem templates, follow-up livre).
- [x] Etapa D: Ajustar regras do agente (ignorar modo, janela por provider).
- [x] Etapa E: Revisar dependencias e validacoes finais.

---

## Mapeamento do que ainda precisa ser resolvido (priorizado)

### Backend (obrigatorio)
- [x] Remover bloqueio de janela 24h para UAZAPI no agente
   - Local: `apps/agents/app/services/agent_runner.py` + `apps/agents/app/services/followups.py`.
   - Regra: para `whatsapp_nao_oficial`, permitir envio e follow-up mesmo fora da janela.

- [x] Remover modo do agente (autonomo/assistido/rascunho)
   - Local: types/UI e persistencia.
   - Regra: simplificar para sempre autonomo (status ativo = executa).

- [x] Garantir que follow-up no UAZAPI nunca tenta template
   - Local: `apps/agents/app/services/followups.py`.
   - Regra: se provider = nao oficial, usar sempre `mensagem_texto` e ignorar template.

### UI (obrigatorio)
- [x] Remover modos do agente na UI (autonomo/assistido/rascunho)
   - Local: `src/components/agentes/editor-agente.tsx` + `src/lib/config-agentes.ts`.

- [x] Exibir estado do provider selecionado no editor
   - Local: `src/components/agentes/editor-agente.tsx`.
   - Regra: deixar claro qual provider esta ativo (badge/label).

### Integração/Compliance (obrigatorio)
- [x] Atualizar textos e links de compliance Meta
   - Local: modal de diretrizes no editor.
   - Regra: link final da Meta que o time definir.

### Operacional (recomendado)
- [x] Validar dependencias de OCR/RAG em ambiente
   - Redis: OK (redis-cli encontrado).
   - Tesseract: OK.
   - FFmpeg: OK.
   - Poppler (pdftotext): OK (instalado).

- [x] Documentar regras finais por provider
   - Atualizar `docs/diagnostico-agentes-whatsapp.md` e README relevante.

## Contexto e metodologia
Objetivo: validar se o sistema de agentes em `/app/agentes` esta 100% pronto para atuar no WhatsApp do usuario, usando **todas** as configuracoes (prompt, conhecimento, follow-up, permissoes, pausas, etc) e integrado tanto ao WhatsApp Oficial (Meta) quanto ao UAZAPI (nao oficial).

Observacao: nao existe SDD/PRD formal em `docs/specs/` para avaliacao de compliance. Este diagnostico se baseia em inspeção do codebase e fluxo real.

Arquivos revisados (principais):
- UI/Next: `src/components/agentes/editor-agente.tsx`, `src/components/agentes/visao-agentes.tsx`
- API Next: `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/webhooks/whatsapp-nao-oficial/route.ts`, `src/app/api/agentes/*`
- Agents Service: `apps/agents/app/main.py`, `apps/agents/app/services/agent_runner.py`
- Ingestion: `apps/agents/app/services/whatsapp_ingestion.py`, `apps/agents/app/services/uazapi_ingestion.py`
- Follow-up: `apps/agents/app/services/followups.py`
- Conhecimento: `apps/agents/app/services/knowledge.py`, `apps/agents/app/services/media.py`
- Ferramentas de envio: `apps/agents/app/tools/inbox.py`
- Schema: `supabase/migrations/20250309000400_agents.sql`, `supabase/migrations/20250308000200_inbox_whatsapp.sql`, `supabase/migrations/20250314002000_uazapi_unofficial_integrations.sql`

---

## Fluxo end-to-end (visao tecnica)

1) Usuario configura agente em `/app/agentes`:
   - Configuracoes persistidas em `agents`, `agent_permissions`, `agent_followups`,
     `agent_calendar_links`, `agent_consents`, `agent_knowledge_files`.

2) Mensagem chega (WhatsApp Oficial ou UAZAPI):
   - Webhook Next salva em `webhook_events`.
   - Agents Service processa e cria/atualiza `messages`, `conversations`, `leads`.

3) Disparo do agente:
   - `apps/agents/app/main.py` chama `_enqueue_agents` apos ingestao inline.
   - `run_agent` roda via Celery em `apps/agents/app/services/agent_runner.py`.

4) Resposta do agente:
   - Envio via `apps/agents/app/tools/inbox.py`:
     - Oficial: `WhatsAppClient` (Graph API).
     - UAZAPI: `UazapiClient`.
   - Mensagem do agente salva em `messages` e atualiza `conversations`.

---

## Cobertura das configuracoes do agente (mapa completo)

### Prompt / FAQ / Tom / Horario / Idioma
Fonte: `agents.configuracao` (JSON) + `idioma_padrao` + `detectar_idioma`.
- Usado em: `agent_runner._build_system_prompt`.
- `prompt` + `faq` entram no system prompt.
- `tom`, `horario`, `timezone`, `tempo_resposta_segundos` entram no prompt.
- `detectar_idioma` usa `langdetect` na ultima mensagem do contato.

Status: OK (aplicado no prompt).
Gaps:
- Horario e tempo de resposta sao apenas informativos (sem enforcement).

### Conhecimento (arquivos)
Fonte: `agent_knowledge_files`, `agent_knowledge_chunks`.
- Upload via UI (`EditorAgente`) e processamento via `/api/agentes/conhecimento/processar`.
- Extracao: OCR e parsing em `knowledge.py` + `media.py`.
- RAG via `retrieve_knowledge` e RPCs `match_agent_knowledge_*`.

Status: OK com dependencias criticas.
Dependencias necessarias:
- `OPENAI_API_KEY` e/ou `GEMINI_API_KEY`.
- Redis (`REDIS_URL` / `UPSTASH_REDIS_URL`).
- Ferramentas nativas: `tesseract`, `poppler`, `ffmpeg` (OCR/midia).

### Follow-ups
Fonte: `agent_followups`.
- Disparo por Celery (`schedule_followups_task` + `run_followup`).
- Respeita janela 24h e templates.

Status: Parcial.
Gaps:
- UI nao reidrata `mensagem_texto` e `usar_template` corretamente; re-salvar pode perder configuracao textual.
- UAZAPI nao suporta templates, mas follow-up tenta usar template se configurado.

### Permissoes
Fonte: `agent_permissions`.
- Habilita/limita ferramentas em `agent_runner._build_tools`.

Status: OK.

### Pausas (tags, etapas, humano)
Fonte: `agents.pausar_em_tags`, `agents.pausar_em_etapas`, `agents.pausar_ao_responder_humano`, `conversations.modo_atendimento_humano`.
- `should_pause` bloqueia agente em todos os cenarios.

Status: OK.

### Consentimento
Fonte: `agent_consents`.
- `has_agent_consent` bloqueia o agente se nao houver consentimento.

Status: OK (mas impede execucao total se nao for marcado).

### Calendario
Fonte: `agent_calendar_links`.
- Tools `calendar_*` habilitadas quando permissao esta ativa.

Status: OK (depende de integracao Google Calendar ativa).

### Modo do agente (autonomo/assistido/rascunho)
Fonte: apenas no frontend/types.
- Nao existe persistencia em `agents` nem uso no `agent_runner`.

Status: NAO IMPLEMENTADO.
Impacto: o agente sempre opera como autonomo quando `status=ativo`.

---

## Integracao WhatsApp (oficial vs nao-oficial)

### Oficial (Meta)
Implementacao:
- Tokens e `phone_number_id` em `integration_accounts` + `integration_tokens`.
- Envio via `WhatsAppClient`.
- Templates sincronizados via `whatsapp_templates.py`.

Status: OK, com dependencias:
- `integration_tokens` deve existir (por conta ou integracao).
- `waba_id`/`phone_number_id` corretos para sync de templates.

Observacoes:
- Janela 24h e templates sao respeitados apenas por regra de prompt. Nao existe selecao automatica de template.
- Quando `outside_window`, o agente deixa de enviar mensagem (logica de bloqueio), exigindo template.

### UAZAPI (nao oficial)
Implementacao:
- `integration_accounts.provider = whatsapp_nao_oficial`.
- Token em `integration_tokens`.
- Envio via `UazapiClient.send_text`.

Status: OK para texto e midia.
Limites e gaps:
- Templates nao suportados (erro em `send_whatsapp_template`).
- Janela 24h desabilitada no backend para UAZAPI (sem bloqueio).

### Grupos
- UAZAPI ingere grupos e guarda `sender_id`/`sender_nome`/`sender_avatar_url`.
- `lead.telefone` em grupos pode ser o JID do grupo.
- `send_whatsapp_text` para UAZAPI deve aceitar JID de grupo.

Status: Parcial (depende de `lead.telefone` e do formato correto do JID).

---

## Prontidao geral (veredito)

### Prontos
- Uso de prompt/FAQ/conhecimento na geracao de respostas.
- Pausas por humano/tags/etapas.
- Envio via WhatsApp Oficial e UAZAPI implementado.
- Follow-up com logica de janela 24h.
- Auditoria e creditos registrados.

### Gaps criticos (impedem 100%)
Sem gaps criticos restantes para o escopo atual (WhatsApp Oficial e UAZAPI).

### Gaps medios (impactam qualidade)
1) **Tempo de resposta e horario sao apenas informativos**
   - Sem enforcement real.

2) **RAG dependente de infraestrutura**
   - Falha se Redis ou OCR/midia nao estiverem disponiveis.

3) **Agente por numero**
   - Apenas 1 agente ativo por `integration_account_id` (UI filtra). Sem roteamento por regras.

---

## Checklist de prontidao (operacional)

1) Integracao
- `integration_accounts.provider` definido (`whatsapp_oficial` ou `whatsapp_nao_oficial`).
- `integration_tokens` valido.
- `integration_accounts.status = conectado`.

2) Agente
- `agents.integration_account_id` preenchido.
- `agent_permissions` configuradas (incluindo `enviar_mensagem`).
- `agent_consents` criado (consentimento marcado).
- `agent_followups` coerentes com o provider (sem template no UAZAPI).

3) Infra
- Redis acessivel.
- `OPENAI_API_KEY` e/ou `GEMINI_API_KEY` validas.
- OCR/midia instalados (`tesseract`, `ffmpeg`, `poppler`).

---

## Recomendacoes para chegar em 100%

1) Implementar enforcement real de horario/tempo de resposta (opcional, melhoria de qualidade).
2) Monitorar custos e politicas de templates no WhatsApp Oficial.

---

## Perguntas em aberto

1) Como o sistema deve escolher template automaticamente (ex.: por categoria/idioma)?
Implementado fallback por categoria (utility > transactional > authentication > marketing > service). Ajustar se necessario.

---

## Conclusao

O sistema esta funcional para o escopo atual (WhatsApp Oficial e UAZAPI). Para ficar 100% pronto em producao, restam apenas melhorias de qualidade opcionais (enforcement de horario/tempo) e monitoramento de custos/politicas de template no oficial.

---

# INSTRUÇÕES PARA PROSSEGUIR:

1. Quando o usuário for criar um novo Agente, ao clicar em “Criar Agente” na pagina /app/agentes, deve aparecer uma unica PAGINA, sem topava, sem sidebar, sem NADA, APENAS COM 3 CARDS no modo SELECT um ao lado do outro: 

Primeiro card: “Conectar API OFICIAL do WhatsApp (META)”
Segundo card: “Conectar API NÃO OFICIAL do WhatsApp”
Terceiro card: “Conectar ao Instagram (ícone de cadeado com o texto “Em breve”)

Após o usuário selecionar vai para a pagina de configurações do Agente, porém por que eu fiz isso, eu fiz isso por que DEPENDENDO do que o usuário selecionar, ele vai para opçoes DIFERENTES!!!

A API NAO OFICIAL DO WHATSAPP (UAZAPI) funciona completamente DIFERENTE do que a API OFICIAL DO WHATSAPP (META)… Entao é por isso que temos que ter configurações diferentes, um exemplo: follow-up na API NAO OFICIAL é liberado tranquilamente, na API OFICIAL nao é liberado, tem a janela de 24h ou 72h se nao me engano, mas tem uma janela, após passar dessa janela tem custo para fazer o follow-up, e ao usuário ir para a etapa do FOLLOW-UP ao selecionar API OFICIAL DO WHATSAPP, deve aparecer um pop-up/modal explicando TODAS as diretrizes do WhatsApp api oficial (meta) com o link para o usuário acessar e entender todo os usos, custos, etc…

Para a API NAO OFICIAL o follow-up é liberado, mensagem em grupo é liberado, reagir a mensagens é liberado, etc…

Entao precisamos ter isso antes de tudo!

E também quando o usuario selecionar conectar API NAO OFICIAL DO WHATSAPP, deve aparecer um MODAL assim que ele selecionar explicando que o USO DA API NAO OFICIAL pode causar risco de banimentos, etc e o usuário está por sua conta e risco. O ideal SEMPRE é utilizar a API OFICIAL DO WHATSPAP (META).

Outro ponto: NAO PRECISA TER TEMPLATE SE O USUÁRIO selecionar conectar com API NAO OFICIAL, ele mesmo pode definir sua própria mensagem.
