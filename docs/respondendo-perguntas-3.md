 1. Prioridade inicial: quer comecar pelo Inbox + WhatsApp (mesmo sem CRM completo) ou pela fundacao (Auth +
     Workspaces + CRM base) e depois Inbox?
Vamos começar por INBOX + Integraçao do WhatsApp API OFICIAL (precisamos ter um backend que integre com a conta API oficial do WhatsApp do usuário) para poder aparecer todas as conversas deste whatsapp no inbox).
  2. O app tera multi-workspace por usuario (um usuario em varios workspaces) ou 1 usuario = 1 workspace?
Por enquanto, 1 usuário = 1 workspace
  3. Qual fluxo de auth? Email/senha apenas, magic link, social (Google), SSO?
E-mail e senha apenas
  4. Roles atuais (Admin/Manager/Member/Viewer) continuam? Alguma regra extra por modulo?
Sim, padre!
  5. “Leads” e “Contatos” sao entidades separadas ou um unico objeto com status?
Leads sao todas as pessoas que entram dentro do WhatsApp do usuário que estará integrado no App e ao inbox, se torna CONTATO quando o usuário CADASTRA este lead no App.
  6. Campos customizados: quer separar “Lead fields” e “Deal fields” como tabelas distintas?
Faça o que for recomendado!
  7. Tags: globais por workspace ou privadas por usuario?
Globais por workspace.
  8. Pipeline: vamos permitir multiplos pipelines por workspace?
Sim, o usuário poderá criar quantas pipelines ele quiser.
  9. Deals: o “owner” deve ser sempre usuario ou pode ser “time”/fila?
Owner pode ser o Agente também, mas por enquanto simplifique.
  10. Inbox: status das conversas sao exatamente (aberta, pendente, resolvida, spam)?
Sim!
  11. Inbox: “nota interna” vira mensagem com flag interno ou entidade separada?
Flag interno, é uma nota/informaçao/conteudo que o usuário atribui aquela conversa com o lead/contato.
  12. Inbox: precisamos gravar payload bruto de webhooks para auditoria?
Faça o que for recomendado, este aplicativo será um SAAS vendido para milhares de pessoas, entao precisa ter arquitetura modular e robusto o suficiente para suportar e ter eficiencia!
  13. Inbox: quick replies e templates (WhatsApp) devem ser armazenados no banco desde o inicio?
Sim, o usuário deve ter a opçao de criar novos Quick replies.
  14. Inbox: anexos e midias ficam em Supabase Storage? Qual limite de tamanho por arquivo?
No máximo até 5mb por arquivo, e sim, fica no supabase Storage.
  15. WhatsApp: vamos usar Cloud API direto (Meta) ou provedor (Twilio/360dialog)?
Direto do META.
  16. WhatsApp: ja existe WABA/Business Manager ou vamos criar do zero?
Criar do zero. Busque toda a documentaçao na web, use context7 mcp também.
  17. WhatsApp: precisamos de suporte a templates aprovados e categoria de template?
Sim!
  18. Instagram/Messenger: prioridade logo apos WhatsApp ou pode ficar para uma etapa posterior?
Sim, podemos criar após o WhatsApp já estar 100% funcional.
  19. Email: provider preferido (SES, SendGrid, Postmark)? So envio ou envio + inbound?
Ainda nao sei, vamos deixar essa funcionalidade para depois, mas descreva na documentaçao o que for recomendado para ficar salvo para depois.
  20. LinkedIn: sera requisito real ou “nice to have” (API bem restrita)?
Ainda nao iremos implementar o LinkedIn, preciso ver o grau de dificuldade. Vamos iniciar com WhatsApp, instagram e Messenger.
  21. IA: provider desejado (OpenAI/Anthropic/Vertex) e modelo preferido?
OpenAI, porém ainda nao vamos implementar os Agentes de IA por enquanto.
  22. IA: agentes podem executar acoes automaticas ou sempre assistidas na V1?
Ainda nao vamos implementar os Agentes de IA por enquanto.
  23. IA: precisamos de vetorizacao (pgvector) ja na primeira etapa de agentes?
  24. Agentes: limite de 2 por workspace permanece ou varia por plano?
Varia por plano.
  25. Tarefas/Calendario: integracao com Google/Outlook entra quando?
Etapas bem futuras, nao agora.
  26. Notificacoes: in-app apenas ou email/push tambem?
In-app
  27. Relatorios: precisamos de dados historicos reais desde a primeira etapa ou pode iniciar com agregacoes simples?
Históricos reais SEMPRE, puxando tudo do supabase
  28. Billing: Stripe entra quando? Quais planos/limites exatos?
Ainda nao tenho isso, aguarde que iremos implementar em breve.
  29. LGPD/retencao: existe politica definida de exclusao/anonimizacao?
Ainda nao, o que voce recomenda
  30. Auditoria: quais eventos sao obrigatorios (ex: login, alteracao de deal, envio de mensagem)?
Todos eventos recomendados.
  31. Observabilidade: prefere Sentry/Logflare/PostHog ou outra stack?
Qual voce recomenda, melhor custo-benefício e desempenho, performance?
  32. Infra: deploy principal em Vercel? Alguma restricao?
Iremos implementar na digitalOcean
  33. Fila/Jobs: ok usar Redis + BullMQ ou prefere algo 100% Supabase (Edge Functions + cron)?
Redis + BullMQ, na verdade voce prefere o BullMQ ou RabbitMQ?
  34. API: quer BFF via Next.js route handlers ou acesso direto do client ao Supabase?
O que voce recomenda?
  35. CSV import: precisa ser async (job) ou pode ser sync no inicio?
O que voce recomenda? O que for melhor custo-beneficio + alto desempenho.
  36. Performance: qual volume esperado (mensagens/dia, usuarios, conversas ativas)?
MUITAS, iremos ter alta demanda, entao o sistema e arquitetura precisa estar robusto e eficiente, porém com custo-beneficio agregado!
  37. Compliance: precisamos criptografar campos especificos (telefone/email) no banco?
Telefone e e-mail nao, mas dados sensíveis como CPF, CNPJ, Endereços, etc… Sim!
  38. Times/filas: existe conceito de “time” (ex: SDR, Suporte) ou tudo por usuario?
Tudo por usuário eu acredito.
  39. “Canais ativos” na topbar devem refletir integracoes reais ou apenas flag manual?
Integraçoes reais!
  40. Tem alguma prioridade comercial que altere a ordem do roadmap proposto?
Nao!