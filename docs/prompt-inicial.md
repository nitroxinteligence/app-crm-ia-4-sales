VOCÊ É O CODEX. GERE UM FRONTEND COMPLETO (WEB APP) EM NEXT.JS (APP ROUTER) + TYPESCRIPT + TAILWIND + SHADCN/UI PARA UM CRM CHAMADO “VP CRM”.
OBJETIVO: ENTREGAR APENAS FRONTEND (COM BACKEND REAL)
O APP DEVE SER TOTALMENTE NAVEGÁVEL COM ROTAS, LAYOUT CONSISTENTE, LIGHT/DARK MODE, SIDEBAR COLAPSÁVEL, TOPBAR FIXA, E SIDE PANELS (SHEET) PARA DETALHES.
A EXPERIÊNCIA É DESKTOP-FIRST (1440), RESPONSIVA PARA TABLET, MOBILE PODE SER SIMPLES (APENAS NÃO QUEBRAR).

========================

1. STACK E REGRAS
   ========================

* Next.js (App Router) + TypeScript
* TailwindCSS
* shadcn/ui (Radix)
* lucide-react para ícones
* Inter como fonte padrão
* Implementar tema Light/Dark (dark padrão; cores invertidas). Adicionar toggle de tema no menu do usuário.
* Proibir dependências extras desnecessárias.
* Todos os dados devem ser tipados (interfaces/types).
* Todas as listas com muitos itens devem suportar infinite scroll (simulado no frontend).
* Implementar estados de loading (skeleton), empty state, error state e permission denied.
* Implementar confirmação (Dialog) para ações destrutivas (delete, block, disconnect).
* Implementar mascaramento de dados (telefone/email) quando role = VIEWER.
* Não implementar automações/workflows nesta V1.

========================
2) BRAND / UI
=============

* Nome: VP CRM
* Estilo: clean enterprise, produtividade com respiro
* Cor primária: azul enterprise (padrão shadcn)
* Sem cor secundária para IA
* Cards preferencialmente com borda (outline) sem sombra

========================
4) ROTAS E NAVEGAÇÃO
====================

Rotas Auth:

* /entrar
* /cadastro
* /recuperar-senha
* /trial-expirado

Rotas App:

* /onboarding  (wizard com opção de pular etapas)
* /app/dashboard
* /app/inbox
* /app/pipeline
* /app/leads
* /app/calendar
* /app/agents
* /app/reports
* /app/settings
* /app/settings/team
* /app/settings/channels
* /app/settings/fields
* /app/settings/billing
* /app/settings/language
* /app/settings/privacy

Implementar navegação via Sidebar + Topbar, com highlight do item ativo.

========================
5) CONTEXTO DE ESTADO (SEM BACKEND)
===================================

Crie um “fake auth state” no frontend:

* Usuário atual (nome, email, role: ADMIN|MANAGER|MEMBER|VIEWER)
* Workspace atual (multi-tenant)
* Canais conectados do workspace (WA/IG)
* Plano atual (Essential|Premium|Pro), trial (7 dias), limites (1 user trial, 1 canal trial, max 2 agents)
  Armazenar em local state simples (React context) ou Zustand (se quiser, mas preferir sem libs extras). Pode usar Context API.

========================
6) APP SHELL (OBRIGATÓRIO)
==========================

Implementar AppShell em /(app)/layout.tsx:

* Sidebar colapsável com ícones Lucide e tooltips no colapsado
* Topbar fixa com:

  * Breadcrumb/título
  * Seletor de workspace
  * Badges de status de canais conectados (WA/IG/MSG/EMAIL/LI)
  * Notificações (sininho com badge)
  * Avatar/Perfil (menu com theme toggle + logout)
* Área principal com PageHeader + conteúdo
* SidePanel base reutilizável (Sheet à direita) para detalhes (Lead/Deal/Ticket/Company/Task)

========================
7) ONBOARDING WIZARD (OBRIGATÓRIO)
==================================

/onboarding: wizard NÃO PULÁVEL (o usuário deve passar pelas etapas, mas algumas podem permitir “continuar sem convidar” etc).
Etapas:

1. Perfil + Empresa:

   * nome completo, nome empresa/workspace, segmento (select), tamanho equipe (select)
2. Pipeline padrão (editável):

   * pipeline modelo estilo Kommo com etapas editáveis e reorder
3. Conectar Canais:

   * onboarding exige pelo menos 1 canal conectado (preferir WhatsApp)
4. Criar 1º Agente:

   * escolher template (SDR/Atendimento/Suporte/Propostas/Voice) ou do zero
   * exige criação de pelo menos 1 agente
5. Importar CSV:

6. Convidar equipe:

   * convidar por email, escolher role
   * pode avançar sem convidar, mas deve ver a etapa
7. Conclusão:

   * checklist final + botão “Ir para Dashboard”

Após conclusão, redirecionar para /app/dashboard.

========================
8) DASHBOARD (KPIs PRIMEIRO)
============================

/app/dashboard:

* Header “Dashboard”
* Filtros: período (Hoje/7d/30d), canal (Todos/WA/IG/MSG/EMAIL/LI)
* Linha 1: 5 KPI cards:

  1. Leads hoje/7d
  2. Qualificados vs desqualificados
  3. Conversas ativas (Inbox)
  4. Deals em aberto (R$ + US$)
  5. Ações do Agente (últimas 24h)
* Linha 2: 3 ChartCards:

  * Funil conversão por etapa
  * Barras por canal
  * Linha tendência 7/30 dias
    (Gráficos podem ser placeholders visuais, sem chart lib; apenas UI)
* Linha 3: Alertas + Quick actions:
  Alertas: leads sem resposta, intenção alta, tarefas do dia
  Ações rápidas: Ir Inbox, Criar Deal, Criar Agente, Conectar Canal
* Estados: skeleton loading, empty, error

========================
9) INBOX OMNICHANNEL (3 COLUNAS)
================================

/app/inbox:
Layout 3 colunas:
Coluna 1: Lista de conversas

* Tabs: Abertas/Pendentes/Resolvidas/Spam
* Busca
* Filtros: canal, tag, owner, não lidas
* Item: avatar, nome, canal, preview, badge não lida, tags

Coluna 2: Chat

* Header: nome + canal + status
* Ações rápidas: tag, transferir, resolver/pender, criar deal, criar tarefa
* Timeline mensagens + mídia (image/pdf/audio preview)
* Composer:

  * input
  * anexos
  * templates WhatsApp
  * quick replies (por workspace)
  * menu IA (adiado)
* Nota interna (somente equipe)

Coluna 3: Painel do contato

* dados: nome, telefone, email, empresa
* tags + status + owner
* atalhos: criar deal/tarefa
* histórico: deals, atividades
* mascaramento para viewer

Regra de agente:

* Agente responde automaticamente por padrão.
* Se etapa/status marcado como “Atendimento humano”, agente pausa respostas (mostrar badge “Atendimento humano”).

Modais:

* Transferir conversa
* Criar deal/tarefa a partir do chat
* Confirmar spam/bloquear

========================
10) PIPELINE (KANBAN)
=====================

/app/pipeline:

* Kanban com colunas = etapas
* Drag & drop
* Filtros: owner, tags, origem, status, canal
* Deal Card mostra: nome, empresa, valor, owner, tags, última atividade, canal
* Clique no card abre SidePanel do Deal (não navegar para outra página)
  SidePanel Deal:
* header + resumo rápido + tabs:
  Visão geral, Conversas, Atividades, Notas, Arquivos, Auditoria
* Bulk actions (seleção múltipla): tags, owner, delete (confirm)

Tela/flow “Editar etapas do funil”:

* reorder, rename, add/remove

========================
11) LEADS/CONTATOS (TABELA CLÁSSICA)
====================================

/app/leads:

* DataTable com infinite scroll
* colunas mínimas: Nome, Telefone (obrigatórios), demais opcionais (Email, Status, Tags, Owner, Empresa, Última atividade)
* filtros e busca
* bulk actions: tag, status, owner, export CSV, delete (confirm)
* Clique no row abre SidePanel do Lead:
  tabs: Visão geral, Conversas, Atividades, Notas, Arquivos, Auditoria
* Import CSV (página ou modal): upload, mapear, preview, confirmar

Mascaramento para role VIEWER.

========================
12) CALENDÁRIO/TAREFAS
======================

/app/calendar:

* Visão mês, semana, agenda list (tabs)
* Criar tarefa (modal)
  Campos: título, tipo (ligação/reunião/follow-up/email/outro), data/hora, responsável, relacionamento opcional (lead/deal/conversa/outro)
* Integrações: conectar Google Calendar / Outlook

Regra V1: tarefas criadas apenas pelo usuário (não pelo agente). Ainda assim, permitir exibir “criado por agente” desativado.

========================
14) AGENTES DE IA (CORE)
========================

/app/agents:

* Lista de agentes com status, tipo, canais ativos, uso/limites
* Limite V1: max 2 agentes por workspace (mostrar banner/upsell quando tentar criar o 3º)
* Criar agente: template ou do zero
* Editor do agente com abas:

  1. Configuração:

     * nome, tipo, tom, idioma (PT/EN), horário, canais (WA/IG/MSG/EMAIL/LI)
     * variáveis do workspace (empresa, proposta etc.)
  2. Ações permitidas (escopos + modos):

     * modos: Autônomo / Assistido / Somente rascunho
     * toggles de ações:
       enviar msg, criar/editar lead, criar/editar deal, mover etapa, enviar email, usar template WhatsApp, transferir humano, bloquear contato (default off), excluir (bloqueado)
     * guardrails: limite ações/minuto/dia (UI)
  3. Conhecimento:

     * upload até 10 arquivos (PDF/TXT/DOCX), lista com status (processando/pronto)
     * campo FAQ/texto
  4. Testar agente:

     * sandbox chat + timeline de eventos (input->interpretação->ação)
  5. Auditoria:

     * logs filtráveis (período/canal/ação)

========================
15) RELATÓRIOS / BI
===================

/app/reports:

* visões:

  * Overview
  * Agentes
  * Vendas
  * Inbox/Atendimento
* filtros: período, canal, agente
* cards + gráficos placeholders
* export CSV (modal)

========================
17) CONFIGURAÇÕES
=================

/app/settings e subrotas:

* /team:
  lista usuários, convidar (modal), definir role, remover
* /channels:
  listar integrações WA/IG/MSG/EMAIL/LI com status; conectar/reconectar/desconectar (confirm)
  permitir selecionar contas (IG/FB/LI) no UI
* /fields:
  abas: Lead Fields e Deal Fields
  criar campo: nome, tipo, opções, obrigatório, reorder
* /billing:
  planos: Essential, Premium, Pro
  trial: 7 dias, 1 usuário, 1 canal
  cobrança: add-on por usuário e por canal; não cobrar por mensagens; não cobrar por agentes (mas limite 2)
  telas: plano atual, tabela comparativa, add-ons, checkout stripe placeholder, histórico pagamentos, cancelar assinatura (confirm)
* /language:
  seletor PT-BR / EN (por usuário)
* /privacy:
  toggle mascaramento para viewer + placeholders retenção/export

========================
18) COPILOTO IA GLOBAL (TOPBAR)
===============================

Copiloto IA adiado (nao implementar nesta etapa).

========================
19) SIDE PANEL (COMPONENTE GLOBAL)
==================================

Implementar componente /components/common/SidePanel.tsx reutilizável.
Estrutura:

* Header fixo (título/subtítulo/ações/fechar)
* Resumo rápido (chips status/tags/owner + campos chave + atalhos)
* Tabs fixas: Visão geral, Conversas, Atividades, Notas, Arquivos, Auditoria
* Body scrollável
* Footer opcional (Salvar/Cancelar)
  Usar para Lead, Deal e Task.

========================
20) QUALIDADE
=============

* Layout consistente
* Componentização limpa
* Tipos TypeScript em /src/lib/types.ts
* Funções de permissão em /src/lib/permissions.ts
* Funções de mascaramento em /src/lib/masking.ts
* Sem gambiarras visuais
* UX enterprise: confirmações, empty states com CTA, skeletons
