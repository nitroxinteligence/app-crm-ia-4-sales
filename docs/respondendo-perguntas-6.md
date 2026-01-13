 - A UAZAPI será self‑hosted ou serviço gerenciado? Qual a base URL em dev e prod?
Será no proprio servidor da UAZAPI:
Server URL: 
https://free.uazapi.com
Instance Token:  
2abcab6b-bfbc-44b4-8270-178d5b4e9e51
  - Temos admintoken para criar instâncias via API? Onde devo guardar (env)?
Admin token: ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t
Tudo tem que ficar no .env
  - Qual a política de instâncias: 1 número por workspace ou vários?
Depende do plano, se o usuário selecionar o plano básico, terá apenas 1 número por workspace. Se o usuário selecionar o plano premium, terá vários números por workspace e assim sucessivamente para todo os planos, os benefícios que o usuario irá receber e funcionalidades, condizem diretamente com o plano que ele irá escolher, entao se ele escolher o plano PREMIUM ou PRO, ele terá direito a várias conexoes de acordo com o plano em @docs/planos-e-creditos.md
  - Se for vários números por workspace, o inbox precisa indicar qual número recebeu cada
    mensagem?
Sim, no inbox precisa ter um filtro dos numeros conectados e se o usuário nao filtrar, tem que aparecer por padrao o numero que recebeu a mensagem.
  - Nome da integração na UI: prefere “WhatsApp (não oficial)” ou “WhatsApp Web”?
WhatsApp (não oficial)
  - Quem pode conectar/desconectar: ADMIN apenas ou MEMBER também?
apenas ADMIN.
  - O modal deve auto‑atualizar o QR? Em qual intervalo?
Verifique a documentação da UAZAPI para verificar o intervalo de atualização do QRCode.
  - Deve ter botão de “Gerar novo QR / Reconectar” quando desconectado?
Sim, teremos um botão para gerar um novo QRCode ou reconectar ao servidor.
  - Permite conectar oficial e não oficial ao mesmo tempo?
Sim, o usuário pode conectar tanto a API OFICIAL do WHATSAPP quanto a API NÃO OFICIAL da UAZAPI, porém ele nao pode ter 2 AGENTES em um unico numero, cada AGENTE precisa conectar em um unico numero individualmente.
  - Webhook: preferem receber no agents service ou em API do Next?
Verifque o que é mais recomendado!
  - Segurança do webhook: UAZAPI suporta assinatura? Se não, quer usar header secreto?
Como assim suporta assinatura? Verifique a documentaçao do UAZAPI e decida o que for mais recomendado.
  - Mensagens: ingestão só texto ou também mídia (imagem/áudio/docs)?
TUDO! Assim como o agente interperta video, audio, imagem, docs na API OFICIAL, deve interpretar tudo no UAZAPI.
  - Se mídia, salvamos arquivos no Supabase Storage?
Sim, da mesma forma que a API OFICIAL.
  - Envio de mensagens pelo CRM via não‑oficial: sim ou só inbound por enquanto?
Sim!
  - Podemos reutilizar o fluxo de criação de leads/contatos do WhatsApp oficial?
Acredito que sim, nao vejo por que nao, mas verifique estude e analise o mais recomendado.
  - Exibir no card da integração o telefone/JID conectado?
Sim!!
  - Limite de instâncias no plano UAZAPI?
Depende do plano, se o usuário selecionar o plano básico, terá apenas 1 instância por workspace. Se o usuário selecionar o plano premium, terá várias instâncias por workspace e assim sucessivamente para todo os planos, os benefícios que o usuario irá receber e funcionalidades, condizem diretamente com o plano que ele irá escolher, entao se ele escolher o plano PREMIUM ou PRO, ele terá direito a várias instâncias de acordo com o plano em @docs/planos-e-creditos.md

No UAZAPI teremos várias instancias, chegando a mais de 100 dispostivos que podem ser conectados.
  - Integração deve respeitar bloqueio por trial expirado (igual oficial)?
Sim, com certeza!
  - Como quer mostrar erros de conexão: toast, inline, estado do modal?
Sim!
  - No onboarding, o usuário é obrigado a conectar WhatsApp não oficial, ou pode pular?
Pode pular, mas o ideal é que ele conecte API OFICIAL ou não OFICIAL.
  - Posso alterar/migrar o schema do Supabase agora, ou devo reutilizar apenas integrations?
FAÇA O QUE FOR RECOMENDADO!
  - Dev e Prod terão tokens/instâncias separados?
Nao sei, acredito que nao é necessário por que no prod. iremos apenas testar, no dev é que o jogo vai funcionar pra valer.

---

Consideraçoes:

1. Voce deve puxar na API da uazapi e inserir uma funçao que busque instancias disponiveis para gerar o QRCode, caso nao tenha emita um aviso "toast" para o usuário dizendo que nao tem instancias disponiveis e considera conectar apenas a API OFICIAL do WHATSAPP.