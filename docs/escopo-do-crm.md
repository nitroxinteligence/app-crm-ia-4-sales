A seguir está um **documento completo (texto puro)** com o escopo do **VP CRM (Vertical Partners CRM)**. Ele descreve **todas as telas, navegação, componentes, estados, permissões e funcionalidades V1**, com padrões de UI e estrutura para **Next.js + shadcn/ui**, **web app**, **light/dark**, **sidebar colapsável**, **topbar fixa**, **side panels** para detalhes, **infinite scroll** e **bulk actions**.

---

# VP CRM — Especificação Completa do Frontend (V1)

## 0) Objetivo do Produto

VP CRM é um CRM **tudo-em-um** com **Inbox omnichannel** (WhatsApp, Instagram, Messenger, Email, LinkedIn) e **Agentes de IA** integrados em todo o sistema, capazes de atuar de forma autônoma (com regras definidas pelo usuário).
V1 é um **Web App** (desktop-first) totalmente responsivo (tablet), com mobile planejado para depois.

---

## 1) Stack e Requisitos Técnicos de Frontend

* Framework: **Next.js** (App Router)
* UI: **shadcn/ui** (Radix) + Tailwind
* Ícones: **lucide-react**
* Tema: **Light + Dark** (dark padrão com cores invertidas; mesma identidade)
* Layout: Sidebar colapsável + Topbar fixa + conteúdo com **Side Panels** (Sheet) para detalhes
* Dados: mock/placeholder (não implementar backend nesta etapa)
* Navegação: client-side (Next navigation)
* Listas grandes: **infinite scroll**
* Bulk actions: seleção múltipla (não precisa seleção persistente além da lista visível)
* Modais: confirmação para ações destrutivas (delete/bloquear)
* Mascaramento de dados para perfis com permissão limitada (Viewer)

---

## 2) Branding e Identidade Visual

* Nome provisório: **VP CRM**
* Estilo: **Clean enterprise**, produtividade com respiro
* Cor primária: **Azul enterprise**
* Sem cor secundária “IA” (IA também usa azul)
* Tipografia: **Inter**
* Densidade: média (respiro, sem poluição)
* Cards: preferir estilo shadcn (borda/outline e sombra mínima)

---

## 3) Estrutura Geral (App Shell)

### 3.1 Sidebar (colapsável)

Itens (ordem):

1. Dashboard
2. Inbox
3. Pipeline
4. Leads/Contatos
5. Empresas
6. Calendário/Tarefas
7. Agentes de IA
8. Tickets/Suporte
9. Relatórios/BI
10. Configurações

Comportamento:

* Expandida: ícone + label
* Colapsada: apenas ícones + tooltip
* Item ativo com destaque (pill + barra lateral)
* Seções: Core / Admin (Settings separado)

### 3.2 Topbar (fixa)

Elementos da esquerda para direita:

* Breadcrumb/título da página (ex: “Inbox”)
* Seletor de Workspace (dropdown)
* Status de canais conectados (badges: WA, IG, MSG, Email, LI com indicador)
* Botão “Copiloto IA” (abre modal/painel)
* Notificações (ícone sino com badge)
* Perfil do usuário (avatar + menu)

### 3.3 Conteúdo Principal

* Header da página (título + actions)
* Conteúdo (listas, kanban, inbox, dashboards)
* Side Panel à direita para detalhes (Lead/Deal/Ticket/Task/Company)
* Em telas menores, Side Panel vira overlay (sheet)

---

## 4) Conceitos de Dados (Entidades)

* Workspace (empresa/conta multi-tenant)
* User (Admin, Manager, Member, Viewer)
* Lead/Contato (mesmo objeto com status)
* Company (Empresa; opcional)
* Deal (Oportunidade; no Pipeline)
* Conversation (Conversa no Inbox)
* Ticket (Suporte; módulo separado)
* Task (Tarefa / Calendário)
* Agent (Agente de IA)
* KnowledgeBaseItem (Arquivos/docs para agente; até 10 arquivos)
* Tags (labels)
* Custom Fields:

  * Custom fields para Lead e para Deal (separados)
  * Tipos: text, number, currency, date, select, multi-select, boolean

Moedas: R$ e U$ (por enquanto)

---

## 5) Permissões (Roles)

Roles: **Admin, Manager, Member, Viewer**

Regras gerais (front):

* Admin: tudo
* Manager: tudo exceto billing e configurações críticas (pode depender)
* Member: acesso aos módulos, sem billing
* Viewer: apenas leitura, com **mascaramento** de dados sensíveis

Mascaramento para Viewer:

* Telefone: (**)*****-1234
* Email: m***@dominio.com
* Em Inbox: exibir apenas parte do número e ocultar anexos sensíveis se necessário (apenas UI)

Permissões por módulo (front):

* Leads/Contatos: read/write para Admin/Manager/Member; Viewer read masked
* Deals/Pipeline: read/write para Admin/Manager/Member; Viewer read (sem valor completo se quiser)
* Inbox: Admin/Manager/Member responde; Viewer apenas visualização (sem enviar)
* Agentes: Admin/Manager cria/edita; Member pode visualizar/operar dependendo; Viewer apenas view
* Tickets: Admin/Manager/Member; Viewer view
* Settings/Billing: Admin apenas (e opcional Manager limitado)

---

## 6) Autenticação e Entrada

### 6.1 Telas

* Login
* Criar conta
* Esqueci senha
* Trial expirado / Acesso bloqueado

### 6.2 Criar Conta

Campos:

* Nome completo
* Email
* Senha
* Confirmar senha

Após criar conta, obrigatoriamente iniciar Onboarding Wizard.

---

## 7) Onboarding Wizard (obrigatório)

Formato: wizard em etapas, não pulável.

Etapas:

1. Perfil + Empresa

   * Nome completo
   * Nome da empresa/workspace
   * Segmento (select)
   * Tamanho da equipe (select)
2. Pipeline padrão (editável)

   * Já vem pipeline modelo estilo Kommo (editável)
   * Usuário pode renomear etapas, adicionar/remover
3. Conectar Canais/Contas (selecionar quais conectar)

   * WhatsApp (API oficial)
   * Instagram
   * Messenger
   * Email
   * LinkedIn
   * Usuário seleciona quais conectar e inicia “flow” de conexão (UI mock)
4. Criar 1º Agente

   * Usuário escolhe template (SDR, Atendimento, Suporte, Copiloto, Propostas, Voice) ou “do zero”
   * Configuração básica do agente (nome, função, canais, idioma, tom)
5. Importar CSV

   * Importar Leads/Contatos (e opcional Empresas)
6. Convidar equipe + permissões

   * Convidar por email
   * Definir role: Admin/Manager/Member/Viewer
7. Conclusão

   * Checklist final + botão “Ir para Dashboard”

Regra: onboarding exige pelo menos:

* 1 canal conectado (no mínimo WhatsApp)
* 1 agente criado
* Convidar equipe pode ser opcional, mas a tela é obrigatória (usuário pode “pular convite” mas não pular etapa; pode avançar sem convidar)

Após concluir, navega para Dashboard.

---

## 8) Dashboard (Home)

### Layout

* Header: “Dashboard”
* Filtros: período (Hoje/7d/30d), canal (Todos, WA, IG, MSG, Email, LI)

### Linha 1: 5 KPI Cards

1. Leads (Hoje / 7d)
2. Qualificados vs Desqualificados
3. Conversas ativas (Inbox)
4. Deals em aberto (R$ + U$)
5. Ações do Agente (últimas 24h)

KPI Card:

* Label
* Valor grande
* Delta % (badge)
* Subtexto
* Estado: loading skeleton / empty

### Linha 2: Gráficos (3 cards)

* Funil: conversão por etapa
* Barras: resultados por canal
* Linha: tendência 7/30 dias

### Linha 3: Alertas + Ações rápidas

Alertas:

* Leads sem resposta há X
* Conversas com intenção alta
* Tickets alta prioridade
* Tarefas vencendo hoje

Ações rápidas:

* Ir para Inbox
* Criar Deal
* Criar Agente
* Conectar Canal

---

## 9) Inbox Omnichannel (3 colunas)

### Layout (Kommo-like)

Coluna 1: Lista de conversas
Coluna 2: Chat
Coluna 3: Painel do contato

### Coluna 1 — Lista

* Tabs: Abertas / Pendentes / Resolvidas / Spam
* Busca
* Filtros: canal, tag, owner, não lidas
* Item de conversa:

  * avatar + nome
  * ícone canal
  * preview
  * badge não lida
  * tags (chips pequenos)

### Coluna 2 — Chat

Header:

* Nome + canal + status
* Ações rápidas:

  * aplicar tag
  * transferir conversa (abre modal)
  * resolver / pendente
  * criar deal (modal)
  * criar ticket (modal)
  * criar tarefa (modal)

Timeline:

* Mensagens texto
* Mensagens com mídia: imagem, pdf, áudio (preview)

Composer:

* input
* anexos (upload)
* templates (WhatsApp)
* quick replies (por workspace)
* botões de IA:

  * sugerir resposta
  * resumir conversa
  * extrair dados (nome/email/necessidade)
  * classificar intenção

Nota interna:

* Mensagem interna visível apenas à equipe (estilo “internal note”)

### Coluna 3 — Painel do contato

* Dados: nome, telefone, email, empresa
* Status + tags + owner
* Atalhos:

  * criar deal
  * criar ticket
  * criar tarefa
* Histórico:

  * deals associados
  * tickets associados
  * atividades (tarefas)
* Mascaramento para viewer

### Regras do agente no Inbox

* Agente responde automaticamente nas conversas, exceto quando:

  * o lead/deal estiver numa etapa/configuração de “Atendimento humano”
* UI deve permitir visualizar status:

  * “Modo: Agente ativo” / “Modo: Atendimento humano” (badge)

### Ações adicionais

* Marcar spam (com confirmação)
* Bloquear contato (com confirmação)
* Busca global dentro do inbox (campo de busca)

---

## 10) Pipeline (Kanban)

### Visão principal

* Kanban com colunas = etapas
* Drag & drop cards
* Filtros: owner, tags, origem, status, canal
* Apenas Kanban (sem lista)

### Etapas padrão (modelo inicial, editável)

Exemplo base:

* Novo Lead
* Em andamento
* Qualificado
* Desqualificado
* Atendimento humano
* Conversa finalizada
* Follow-up
  (Usuário pode editar e adicionar/remover)

### Deal Card (mostrar informações necessárias)

Card deve conter:

* Nome do lead
* Empresa (se existir)
* Valor (R$/U$)
* Owner
* Tags
* Última atividade / última mensagem
* Canal (ícone)

### Side Panel do Deal (ao clicar no card)

Abrir Side Panel padrão (direita)
Tabs:

* Visão geral
* Conversas
* Atividades
* Notas
* Arquivos
* Auditoria

### Bulk actions no Kanban

* Selecionar múltiplos deals
* Aplicar tags
* Alterar owner
* Excluir (com modal)
* Mover para etapa (opcional)

### Editar Pipeline

Tela/side panel para:

* Renomear etapas
* Reordenar
* Adicionar/remover
* Definir cor/ícone da etapa (opcional)

---

## 11) Leads / Contatos (tabelas clássicas)

### Lista

* Tabela com infinite scroll
* Colunas:

  * Nome (obrigatório)
  * Telefone (obrigatório)
  * Email (opcional)
  * Status
  * Tags
  * Owner
  * Empresa
  * Última atividade
* Filtros: status, tags, owner, canal, origem
* Busca
* Bulk actions:

  * aplicar tag
  * mudar status
  * atribuir owner
  * exportar CSV
  * deletar (abre modal de confirmação)

### Detalhe

Abrir Side Panel padrão do Lead

* Campos editáveis inline
* Custom fields de Lead
* Tabs (visão geral, conversas, atividades, notas, arquivos, auditoria)

### Importação CSV

Tela/flow:

* upload CSV
* mapear colunas
* preview
* confirmar importação

---

## 12) Empresas

* Lista (tabela + filtros + busca + bulk)
* Detalhe (Side Panel)
* Criar/editar empresa

Empresa é opcional para lead.

---

## 13) Tarefas / Calendário

### Calendário

Visual estilo Google Agenda:

* visão mês
* visão semana
* lista/agenda

### Tarefa

* Criar tarefa (modal)
* Tipo: ligação, reunião, follow-up, email, outro
* Data/hora
* Responsável
* Relacionar a lead/deal/ticket/conversa (opcional)
* Lembretes via push/web

Regra: tarefas são criadas apenas pelo usuário (não pelo agente) nesta V1.

Integrações:

* Fluxo de “Conectar Google Calendar”
* Fluxo de “Conectar Outlook Calendar”
  (Apenas UI, sem backend)

---

## 14) Agentes de IA (módulo principal)

### Lista de agentes

* Cards/lista com:

  * Nome
  * Tipo (SDR/Atendimento/Suporte/Copiloto/Propostas/Voice)
  * Canais ativos
  * Status (ativo/pausado)
  * Uso (créditos/limites)
* Botão “Criar agente”

Regra V1: máximo de **2 agentes** por workspace (mostrar limite no UI)

### Criar agente

* Opção: Template ou Do zero
* Templates: SDR, Atendimento, Suporte, Copiloto, Propostas, Voice
* Ao criar, abrir Editor do Agente

### Editor do Agente (abas)

Aba 1: Configuração

* Nome do agente
* Função (tipo)
* Tom de voz (select)
* Idioma (PT/EN)
* Horários de atuação (ex: comercial/24-7)
* Canais onde atua (checkboxes: WA/IG/MSG/Email/LI)
* Regras de escalonamento para humano (UI placeholder)
* Variáveis do workspace (nome empresa, proposta, etc.)

Aba 2: Ações permitidas (escopos + modos)

* Modos:

  * Autônomo
  * Assistido (aprovação)
  * Somente rascunho
* Lista de permissões (toggles):

  * Enviar mensagem
  * Criar/editar lead
  * Criar/editar deal
  * Mover etapa
  * Criar ticket
  * Criar tarefa (pode existir no UI mas desabilitado na V1)
  * Enviar email
  * Usar template WhatsApp
  * Transferir para humano
  * Bloquear contato (desabilitado por padrão)
  * Excluir (bloqueado por padrão)
* Limites/guardrails:

  * ações por minuto/dia (UI)
  * bloqueio de ações destrutivas (UI)

Aba 3: Conhecimento

* Upload de arquivos (até 10)
* Tipos: PDF, TXT, DOCX
* Lista de arquivos com:

  * nome
  * tipo
  * status (processando/pronto)
  * remover
* Campo FAQ/manual (texto)
* “Coleções” de conhecimento (opcional UI)

Aba 4: Testar agente (Sandbox)

* Chat interno para testar prompts
* Timeline de eventos:

  * input
  * interpretação
  * ação sugerida/executada
* Botão “Resetar conversa”

Aba 5: Auditoria (logs)

* Lista com filtros:

  * período
  * canal
  * tipo de ação
* Item de log:

  * data/hora
  * ação
  * alvo (lead/deal/ticket)
  * resultado

---

## 15) Tickets / Suporte (módulo separado)

### Lista

* Tabela com:

  * ID
  * Título/assunto
  * Status (aberto/em andamento/resolvido)
  * Prioridade (baixa/média/alta)
  * Cliente (lead/empresa)
  * Responsável
  * Última atualização
* Filtros: status, prioridade, responsável
* Busca
* Infinite scroll
* Bulk actions:

  * mudar status
  * mudar prioridade
  * atribuir responsável
  * deletar (com modal)

### Detalhe do ticket (Side Panel)

Tabs:

* Visão geral (status/prioridade/responsável)
* Conversas (thread)
* Notas internas
* Arquivos
* Auditoria
* IA: sugerir solução/resumo (painel dentro do ticket)

---

## 16) Relatórios / BI

### Visão geral

* Seletores:

  * período
  * canal
  * agente (se aplicável)
* Cards e gráficos:

  * conversão
  * tempo médio de conversa
  * performance por canal
  * performance do agente
* Exportação CSV (modal)

### Relatório de Agentes

KPIs:

* leads atendidos
* leads convertidos
* leads qualificados/desqualificados
* tempo médio de conversa
* ações executadas

### Relatório de Vendas

* funil por etapa
* conversão
* deals em aberto (R$/U$)

### Relatório Inbox/Atendimento

* volume por canal
* tempo de resposta (placeholder)
* tempo de conversa

---

## 17) Configurações

### 17.1 Perfil

* Nome, email
* Trocar senha (UI)

### 17.2 Equipe e permissões

* Lista de usuários
* Convidar usuário (modal)
* Definir role (Admin/Manager/Member/Viewer)
* Remover usuário

### 17.3 Canais e contas conectadas

* Lista de integrações (WA/IG/MSG/Email/LI)
* Status: conectado / desconectado / erro
* Botões: conectar, reconectar, desconectar
* Selecionar quais contas (no caso IG/FB/LI)

### 17.4 Campos customizados

* Aba Lead fields
* Aba Deal fields
* Criar campo:

  * nome
  * tipo
  * opções (para select/multi-select)
  * obrigatório sim/não
* Reordenar campos

### 17.5 Billing / Planos

Planos:

* Essential
* Premium
* Pro

Trial:

* 7 dias
* 1 usuário
* 1 canal
* máximo 2 agentes (mas no trial pode limitar 1 agente; exibir as regras no UI)

Cobrança:

* custo adicional por usuário conectado
* custo adicional por canal conectado
* não cobrar por volume de mensagens
* não cobrar por agentes (limite de 2 por enquanto)

Telas do Billing:

* Plano atual
* Comparação de planos (tabela)
* Add-ons:

  * adicionar usuários
  * adicionar canais
* Checkout (Stripe placeholder)
* Histórico de pagamentos (UI)
* Cancelar assinatura (modal)
* Upgrade/downgrade (flow)

### 17.6 Idioma

* Seletor PT-BR / EN
* Preferência por usuário

### 17.7 Privacidade e Retenção

* Toggle mascaramento para Viewer
* Retenção de dados (placeholder)
* Opções de exportação de dados (placeholder)

---

## 18) Copiloto IA Global (Topbar)

Botão “Copiloto IA” abre um modal/sheet com:

* Campo de chat: “Pergunte qualquer coisa sobre seu CRM”
* Sugestões rápidas:

  * “Resuma o status do funil”
  * “Liste leads mais quentes”
  * “Sugira próximos passos”
* Resposta em cards
* (UI apenas; sem implementação real)

---

## 19) Padrões de UI (Componentes e Estados)

Componentes:

* Button, Input, Select, Tabs, Table, Badge, Tooltip, Toast, Dialog, Sheet, Dropdown, Skeleton

Estados padrão em todas as telas:

* Loading (skeleton)
* Empty state (mensagem + CTA)
* Error state (mensagem + retry)
* Permission denied (quando role não permite)

Modais obrigatórios:

* Confirmar exclusão
* Confirmar bloquear contato
* Confirmar desconectar canal
* Confirmar cancelar assinatura

---

## 20) Side Panel (padrão global)

Aplicado em:

* Lead
* Deal
* Ticket
* Task
* Company

Estrutura:

* Header (título/subtítulo + ações + fechar)
* Resumo rápido (chips + campos chave + atalhos)
* Tabs:

  * Visão geral
  * Conversas
  * Atividades
  * Notas
  * Arquivos
  * Auditoria
* Body scrollável
* Footer opcional (Salvar/Cancelar)

---

## 21) Navegação (Rotas sugeridas)

* /login
* /signup
* /forgot-password
* /onboarding (wizard)
* /app/dashboard
* /app/inbox
* /app/pipeline
* /app/leads
* /app/companies
* /app/calendar
* /app/agents
* /app/tickets
* /app/reports
* /app/settings

  * /team
  * /channels
  * /fields
  * /billing
  * /language
  * /privacy

---

## 22) Regras de Limites (UI)

* Trial:

  * 7 dias
  * 1 usuário
  * 1 canal
  * Sem automações
* Plano pago:

  * até 2 agentes por workspace (por enquanto)
  * add-on por usuário
  * add-on por canal

UI deve mostrar:

* banners de limite atingido
* CTA para upgrade
* bloqueios visuais em botões quando limite excede

---

## 23) Lista completa de Telas (V1) — para o Codex gerar

Auth:

* Login, Signup, Forgot Password, Trial Expired

Onboarding:

* Step 1 Perfil/Empresa
* Step 2 Pipeline
* Step 3 Conectar Canais
* Step 4 Criar Agente
* Step 5 Import CSV
* Step 6 Convidar Equipe
* Step 7 Conclusão

App:

* Dashboard
* Inbox (com estados e modais)
* Pipeline Kanban (com side panel deal)
* Leads/Contatos (tabela + side panel lead + import csv)
* Empresas (tabela + side panel)
* Calendário (mês/semana/agenda + modal tarefa)
* Agentes (lista + editor com abas + teste + auditoria + conhecimento)
* Tickets (lista + side panel + IA)
* Relatórios (visões + export csv)
* Settings (perfil, equipe, canais, campos, billing, idioma, privacidade)

---

## 24) Requisitos finais para o Codex

* Implementar apenas frontend com dados mock (fixtures)
* Usar componentes shadcn e layout consistente
* Implementar theme toggle (light/dark)
* Implementar navegação + estados de UI
* Implementar side panels com tabs
* Implementar infinite scroll (mock)
* Implementar bulk selection e ações (mock)
* Implementar masking para role Viewer
* Implementar onboarding wizard obrigatório