CRM - Vertical Partners

—

 Bootstrap do projeto

  - Devo inicializar um novo projeto Next.js aqui mesmo (não há código no repo)?
Sim
  - Qual gerenciador de pacotes devo usar: 1) pnpm 2) npm 3) yarn?
npm
  - Quer estrutura com src/ ou tudo na raiz?
O que voce recomenda? Posteriormente vamos implementar o backend
  - Qual versão alvo de Next.js/React/Node?
Escolha voce, o que mais for recomendado.
  - Posso instalar shadcn/ui via CLI e next-themes (vai exigir aprovação por acesso à rede)?
Sim!
  - Quer Tailwind padrão shadcn ou tokens customizados além do básico?
O que voce recomenda de acordo com o escopo do projeto?
  - Mantemos ESLint/Prettier default do create-next-app?
Escolha voce, o que mais for recomendado.
  - Usamos alias @/ para imports?
Escolha voce, o que mais for recomendado.

  Rotas e nomes PT-BR (há conflito nos docs)

  - Auth: qual é a fonte de verdade? 1) /entrar, /cadastro, /recuperar-senha, /trial-expirado 2) /login, /signup, /forgot-password, /trial-expired?
Eu só alterei o nome para pt-br, apenas isso.
  - Rotas app devem ser PT-BR? Ex: 1) /app/dashboard 2) /app/painel?
Sim! Em pt-br
  - Configurações: 1) /app/settings/... 2) /app/configuracoes/...?
Sim! Em pt-br
  - Pipeline/leads/companies/calendar/agents/tickets/reports: prefere PT-BR? (funil, leads/contatos, empresas, calendario/agenda, agentes, tickets/suporte, relatorios)
Sim, pt-br
  - Confirmo usar ASCII sem acentos nos paths/arquivos? Ex: configuracoes, recuperar-senha?
Sim!
  - Nomes de arquivos de componentes também em PT-BR? Ex: barra-superior.tsx vs topbar.tsx?
Sim!
  - Componentes React podem manter nome em inglês (Topbar) mesmo com arquivo PT-BR?
Sim!

  Idioma & conteúdo

  - Texto da UI 100% PT-BR ou manter termos como “Inbox”/“Pipeline”?
Pode manter como inbox, pipeline, etc.
  - “Leads” vs “Contatos” nos labels?
Sim! Leads e contatos sao coisas diferentes, vai além da nomenclatura.
  - Abreviações de canais (WA/IG/MSG/EMAIL/LI) ou nomes completos?
Nomes completos
  - Formatos: data dd/MM/yyyy, hora 24h, moeda R$ 1.234,56 e US$ 1,234.56?
Sim!

  Escopo da Etapa 1 (Dashboard)

  - A Etapa 1 inclui AppShell completo (sidebar + topbar + tema) ou só o conteúdo do dashboard?
Inclui appshell completo também
  - Quer placeholders das outras rotas agora (página em branco com título) ou deixar para etapas futuras?
Etapas futuras.
  - Quer estados do dashboard (loading/empty/error/denied) alternáveis por query param ou toggle no UI?
Escolha voce, o que mais for recomendado.
  - Dados do dashboard: mock derivado de fixtures ou valores estáticos?
Mockados
  - “Copiloto IA” já nesta etapa (sheet/modal mock)?
Nao
  - AppShell deve aplicar em todas as rotas /app/* já nesta etapa?
Nao sei. Escolha voce, o que mais for recomendado.

  AppShell & navegação

  - Sidebar colapsável deve persistir estado (localStorage) ou pode resetar ao recarregar?
Escolha voce, o que mais for recomendado.
  - Breadcrumb real ou apenas título da página na topbar?
Breadcrumb real.
  - Quantos workspaces mockados e quais nomes?
Central Vertical Partners
  - Badges de canais: mostrar status conectado/desconectado já no dashboard?
Sim! Mostrar apenas o que está conectado.
  - Menu de perfil além de tema + logout (ex: “Perfil”)?
Sim!
  - Notificações: só ícone com badge ou dropdown básico?
Dropdown
  - Sidebar com separadores “Core” e “Admin” visuais?
Sim!

  Dados mock & estado

  - Mocks em JSON fixo ou gerados por função (seed) em src/lib/mock?
Escolha voce, o que mais for recomendado.
  - src/lib/types.ts com todas entidades já agora ou só as do dashboard?
Escolha voce, o que mais for recomendado.
  - Fake auth state (Context) já na etapa 1? Qual role padrão?
Escolha voce, o que mais for recomendado.
  - Mascaramento para Viewer precisa aparecer no dashboard?
Escolha voce, o que mais for recomendado.
  - src/lib/permissions.ts já na etapa 1 ou mais tarde?
Escolha voce, o que mais for recomendado.

  UI/estilo

  - Confirmar cards com borda sem sombra e densidade média?
Sim!
  - Conteúdo limitado a max-w-[1440px] ou full-width?
Escolha voce, o que mais for recomendado.
  - PageHeader do dashboard terá ações (ex: export/refresh) já agora?
Os dados do dashboard devem ser em tempo real, mas por enquanto que estamos usando dados mockados nao precisamos nos importar com isso. Sobre o export é bom ter também.
  - Placeholder de gráficos: estilo minimalista ou mais detalhado?
Use gráficos do shadcnblocks, na verdade TUDO voce deve usar do shadcn e shadcn blocks
  - Alertas: lista simples ou cards com ícones/badges?
Os alertas devem aparecer na tela quando forem ativados e com um som de alarme para notificar por som ao usuário.

  Acessibilidade

  - Alguma exigência extra além de foco visível e semântica correta?
Escolha voce, o que mais for recomendado.
  - Tooltips no sidebar colapsado: comportamento específico?
Sim

  Testes & docs

  - Deseja testes unitários/Storybook já na etapa 1 ou depois?
Escolha voce, o que mais for recomendado.
  - Quer README curto com estrutura e rotas?
Escolha voce, o que mais for recomendado.

  Operação

  - Posso executar comandos que baixam dependências (precisa sua aprovação)?
Pode executar tudo!
  - Quer commits por etapa ou apenas mudanças no working tree?
Por etapa. Aqui está meu repo: https://github.com/nitroxinteligence/crm-verticalpartners

—