Li docs/respondendo-perguntas-4.md e docs/planos-e-creditos.md. Sobre o “Copiloto global”: ele está
  definido nos docs como um botão na topbar, mas hoje não aparece em src/components/estrutura/barra-
  superior.tsx. Você quer que ele exista já com backend real?
Nao precisa no momento!

  Escopo e UX

  - O Copiloto global entra agora (chat geral na topbar) ou fica fora do MVP?
Fora do MVP.
  - O “Testar agente” deve ser sandbox (sem enviar mensagens reais) ou pode disparar mensagens reais?
Deve ser apenas sandbox, testes entre o usuario que criou o Agente e o proprio Agente, é apenas para o usuário TESTAR O AGENTE.
  - Onde quer exibir a “resposta do agente” no Inbox além da timeline (ex: card lateral, badge de status,
Veja onde é realmente necessário para um bom UI/UX.

    painel de ações)?
  - Outros roles (Manager/Member/Viewer) podem ver logs/estatísticas do agente ou fica 100% oculto?
100% oculto.
  - No módulo Relatórios, o agente só gera insights por chat ou também preenche KPIs automaticamente?
Preenche KPIs automaticamente. No caso o Agente envia os dados para o supabase e do supabase aparece nos relatórios.


  Ações Permitidas e Conflitos

  - Tarefas: o agente pode criar tarefas ou isso fica exclusivamente para o usuário?
Exclusivamente para o usuário.
  - O agente pode marcar conversa como “spam” ou só “resolvida/pendente”?
Sim, pode marcar como spam ou resolvida/pendente. Porém o proprio usuario que vai determinar isso nas configuraçoes do Agente.
  - Criação automática de lead no primeiro inbound é obrigatória sempre?
Sim! Sempre que um lead novo chegar o Agente deve criar o lead em /pipeline (na pipeline definida pelo usuário nas configuraçoes do Agente) e associar a ele o primeiro contato, no caso o Agente cria o deal + contato que vai para a pagina /contatos
  - O agente pode alterar campos customizados de lead/deal ou só tags + etapa?
Sim, pode alterar campos customizados de lead/deal.
  - Follow-up: ele deve iniciar conversas ativas sem mensagem recente do lead? (sequência automática)
O usuário que vai decidir quando o follow-up vai iniciar, é o ideal que nas configuraçoes do Agente tenha uma seçao/aba apenas para o follow-up para que o usuário determine o horário do follow-up, ex: 30min sem resposta: Agente envia follow-up com template de mensagem aprovada pela META que está vinculado a conta que o usuário integrou, etc... Ai o usuário poderá criar vários follow-ups quiser.

  Canais, Números e Pausa

  - Cada agente escolhe 1 número WhatsApp ou pode usar vários?
1 numero de telefone para 1 Agente.
  - Qual padrão de pausa: tag “atendimento humano”, etapa “atendimento humano”, ou ambos por default?
Ambos por default, mas o usuário deve ter a autonomia de alterar isso nas configuraçoes do Agente.
  - Reativação do agente é manual ou automática após X horas/dias?
O usuário que irá definir isso nas configuraçoes do Agente.
  - Se um humano responde na conversa, o agente deve pausar automaticamente?
Sim, isso é extremamente importante!
  - Idioma detectado fica salvo por conversa ou por contato?
Por conversa.

  Memória e RAG

  - Supermemory: qual provedor/URL exata da API e como quer estruturar (por conversa, por lead, por
    agente)?
No momento nao iremos usar o supermemory, vamos deixar isso pra uma atualizaçao futura, por enquanto vamos usar o supabase + redis. (voce irá decidir como utilizar da melhor forma possivel e mais inteligente com os Agentes.)
  - Quer que o Supermemory seja a memória principal e o Supabase+Redis apenas cache/RAG auxiliar?
  - Vetor store preferido: pgvector no Supabase ou Redis Vector? (posso escolher e você aprova)
Pode escolher o que for mais recomendado para que o AGENTE seja inteligente, alto desempenho e custo-benefício.
  - Modelo de embeddings: OpenAI padrão e Gemini só fallback, ou ambos ativos?
Ambos ativos.
  - Qual tamanho máximo por arquivo de conhecimento e precisamos OCR para PDFs escaneados?
5mb por arquivo, e sim precisamos de OCR para PDFs, DOCx, TXTs, e imagens. Tudo isso o usuário pode enviar para treinar o Agente e o Agente deve entender qual o melhor momento para recuperar essas informaçoes de acordo com o contexto da conversa e a necessidade.

  Multimodal (áudio/imagem/vídeo/doc)

  - Áudio: usar Whisper/OpenAI ou Gemini para transcrição?
Whisper/OpenAI e gemini como fallback.
  - Vídeo: basta extrair áudio ou precisa análise de frames/imagem também?
Nao precisa, apenas extrair o audio do video e transcrever.
  - Imagem/documento: OCR obrigatório? (PT-BR + EN)
Sim, obrigatorio, e em todas as linguas.
  - O texto derivado deve ir para RAG automaticamente?
Sim, automaticamente, porém deve ser tratado com Q&A e depois ir para o RAG automaticamente.
  - Confirmar limite de 5 MB também para mídia enviada pelo lead?
Sim, 5mb por arquivo.

  Arquitetura e Integração

  - Posso criar um serviço Python em apps/agents com API REST e workers?
Sim, faça o que for melhor recomendado para alto desempenho.
  - A ingestão do WhatsApp fica no Node (como hoje) ou movemos para o Python?
Faça o que for recomendado!
  - Fila: prefere Celery/RQ (Python) ou manter BullMQ (Node) e integrar?
O que é mais recomendado?
  - Streaming de tokens: você quer “digitando em tempo real” no Inbox?
Nao conseguimos ter este efeito digitando com a API OFICIAL DO WHATSAPP, isso nao vai aparecer no whatsapp, infelizmente, mas há nao ser que voce tenha outra ideia de como implementar isso, estou aberto a sugestoes.
  - Autenticação Next → Python: API key interna, JWT do Supabase ou outra?
Veja qual é a melhor forma, mais inteligente e recomendado!

  Infra e Ambientes

  - Prefere seguir com Hostinger + Docker Compose ou migrar para DigitalOcean?
O que voce recomenda? me diga sua opiniao sincera.
  - Quer ambientes dev/staging/prod separados com Supabase/WhatsApp app separados?
Faça o que for mais recomendado!
  - Redis/queue: serviço gerenciado ou tudo self-hosted?
Redis será na nuvem/cloud, até mesmo para velocidade, etc...
  - Já tem domínio HTTPS estável para webhooks e API dos agentes?
Ainda nao, o que voce me recomenda para ter isso?

  Custos, Créditos e Limites

  - Unidade de crédito: por mensagem, por token, ou por “ação do agente”?
Por mensagem, cada mensagem enviada pelo Agente conta como 1 unidade de crédito. e contabilizando (intput + output).
  - O que acontece ao zerar créditos: pausar agente, desviar para humano, ou bloquear envios?
Ao zerar os créditos abre um MODAL imediatamente, informando que o Agente está sem créditos e pedindo para o usuário recarregar os créditos e redirecionando para /configuracoes/cobranca
  - Ordem de fallback de modelo: GPT‑4.1‑mini → Gemini 2.5‑Flash → gpt‑4o‑mini ok?
Sim!
  - Quer limites por agente (mensagens/dia) além dos limites por plano?
Nao tem limites por agente, apenas por plano.

  Compliance, Consentimento e Retenção

  - Retenção: por quanto tempo manter logs/resumos do agente? (ex: 90 dias, 12 meses, indefinido)
90 dias, por default.
  - Consentimento: por agente ou por workspace? Campos obrigatórios (user_id, timestamp, ip)?
Por Agente.
  - LGPD: se houver pedido de exclusão, removemos memória do Supermemory e embeddings?
Sim, mas sempre comunicando o usuario o que irá acontecer.
  - Você aceita guardar versões de prompt/políticas para auditoria?
Nao é necessário.

  Calendário e CRM

  - Google Calendar: agente pode criar evento, checar disponibilidade, ou só sugerir horários?
O Agente deve ter autonomia para fazer tudo no calendário, agendar reunioes, criar eventos, verificar disponibilidade, cancelar eventos/reunioes, reagendar, editar, etc... E também nas configuraçoes do Agente deve aparecer as AGENDAS DISPONIVEIS que o AGENTE irá utilizar para poder realizar os agendamentos, caso a AGENTE não tenha configurado nenhuma agenda, ele deve aparecer uma mensagem informando que o AGENTE não tem agendas configuradas e aparecer um botão para configurar as agendas na pagina /calendario
  - Qual calendário usar quando há múltiplos usuários? (admin, responsável do lead, ou um padrão do
    workspace)
Como eu disse na resposta anterior, o usuario que irá definir nas configuraçoes do Agente qual AGENDA o AGENTE irá utilizar para usar.
  - Regras de pipeline: o agente pode criar deal automaticamente ou só quando configurado?
Sim, pode fazer isso automaticamente!
  - Quais campos customizados são proibidos de serem alterados pelo agente?
O usuário que deve definir isso nas configuraçoes do Agente.

  Se você responder esses pontos, fecho o planejamento técnico completo.