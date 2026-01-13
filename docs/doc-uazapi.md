# Buscar mensagens em um chat

## Busca mensagens com múltiplos filtros disponíveis. Este endpoint permite:

Busca por ID específico: Use id para encontrar uma mensagem exata
Filtrar por chat: Use chatid para mensagens de uma conversa específica
Filtrar por rastreamento: Use track_source e track_id para mensagens com dados de tracking
Limitar resultados: Use limit para controlar quantas mensagens retornar
Ordenação: Resultados ordenados por data (mais recentes primeiro)

curl --request POST \
  --url https://free.uazapi.com/message/find \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "chatid": "5511999999999@s.whatsapp.net",
  "limit": 20,
  "offset": 0
}'

Link: https://docs.uazapi.com/endpoint/post/message~find

---

# Deleta chat
## Deleta um chat e/ou suas mensagens do WhatsApp e/ou banco de dados. Você pode escolher deletar:

Apenas do WhatsApp
Apenas do banco de dados
Apenas as mensagens do banco de dados
Qualquer combinação das opções acima

curl --request POST \
  --url https://free.uazapi.com/chat/delete \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999",
  "deleteChatDB": true,
  "deleteMessagesDB": true,
  "deleteChatWhatsApp": true
}'

---

# Fixar/desafixar chat
## Fixa ou desafixa um chat no topo da lista de conversas. Chats fixados permanecem no topo mesmo quando novas mensagens são recebidas em outros chats.

curl --request POST \
  --url https://free.uazapi.com/chat/pin \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999",
  "pin": true
}'

---

# Busca chats com filtros
## Busca chats com diversos filtros e ordenação. Suporta filtros em todos os campos do chat, paginação e ordenação customizada.

Operadores de filtro:

~ : LIKE (contém)
!~ : NOT LIKE (não contém)
!= : diferente
>= : maior ou igual
> : maior que
<= : menor ou igual
< : menor que
Sem operador: LIKE (contém)

curl --request POST \
  --url https://free.uazapi.com/chat/find \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "operator": "AND",
  "sort": "-wa_lastMsgTimestamp",
  "limit": 50,
  "offset": 0,
  "wa_isGroup": true,
  "lead_status": "~novo",
  "wa_label": "~importante"
}'

---

# Marcar chat como lido/não lido
## Atualiza o status de leitura de um chat no WhatsApp.

Quando um chat é marcado como lido:

O contador de mensagens não lidas é zerado
O indicador visual de mensagens não lidas é removido
O remetente recebe confirmação de leitura (se ativado)
Quando marcado como não lido:

O chat aparece como pendente de leitura
Não afeta as confirmações de leitura já enviadas

curl --request POST \
  --url https://free.uazapi.com/chat/read \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999@s.whatsapp.net",
  "read": false
}'

---

# Arquivar/desarquivar chat
## Altera o estado de arquivamento de um chat do WhatsApp.

Quando arquivado, o chat é movido para a seção de arquivados no WhatsApp
A ação é sincronizada entre todos os dispositivos conectados
Não afeta as mensagens ou o conteúdo do chat

curl --request POST \
  --url https://free.uazapi.com/chat/archive \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999",
  "archive": true
}'

---

# Enviar mensagem de texto
## Envia uma mensagem de texto para um contato ou grupo.

Recursos Específicos
Preview de links com suporte a personalização automática ou customizada
Formatação básica do texto
Substituição automática de placeholders dinâmicos
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions, forward, track_source, track_id, placeholders e envio para grupos.

curl --request POST \
  --url https://free.uazapi.com/send/text \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999",
  "text": "Olá! Como posso ajudar?"
}'

---

# Baixar arquivo de uma mensagem
## Baixa o arquivo associado a uma mensagem de mídia (imagem, vídeo, áudio, documento ou sticker).

Parâmetros
id (string, obrigatório): ID da mensagem
return_base64 (boolean, default: false): Retorna arquivo em base64
generate_mp3 (boolean, default: true): Para áudios, define formato de retorno
true: Retorna MP3
false: Retorna OGG
return_link (boolean, default: true): Retorna URL pública do arquivo
transcribe (boolean, default: false): Transcreve áudios para texto
openai_apikey (string, opcional): Chave OpenAI para transcrição
Se não informada, usa a chave salva na instância
Se informada, atualiza e salva na instância para próximas chamadas
download_quoted (boolean, default: false): Baixa mídia da mensagem citada
Útil para baixar conteúdo original de status do WhatsApp
Quando uma mensagem é resposta a um status, permite baixar a mídia do status original
Contextualização: Ao baixar a mídia citada, você identifica o contexto da conversa
Exemplo: Se alguém responde a uma promoção, baixando a mídia você saberá que a pergunta é sobre aquela promoção específica
Exemplos
Baixar áudio como MP3:
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "generate_mp3": true
}
Transcrever áudio:
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "transcribe": true
}
Apenas base64 (sem salvar):
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "return_base64": true,
  "return_link": false
}
Baixar mídia de status (mensagem citada):
{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "download_quoted": true
}
Útil quando o cliente responde a uma promoção/status - você baixa a mídia original para entender sobre qual produto/oferta ele está perguntando.

Resposta
{
  "fileURL": "https://api.exemplo.com/files/arquivo.mp3",
  "mimetype": "audio/mpeg",
  "base64Data": "UklGRkj...",
  "transcription": "Texto transcrito"
}
Nota:

Por padrão, se não definido o contrário:
áudios são retornados como MP3.
E todos os pedidos de download são retornados com URL pública.
Transcrição requer chave OpenAI válida. A chave pode ser configurada uma vez na instância e será reutilizada automaticamente.

curl --request POST \
  --url https://free.uazapi.com/message/download \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "id": "7EB0F01D7244B421048F0706368376E0",
  "return_base64": false,
  "generate_mp3": false,
  "return_link": false,
  "transcribe": false,
  "openai_apikey": "sk-...",
  "download_quoted": false
}'

---

# Enviar reação a uma mensagem
## Envia uma reação (emoji) a uma mensagem específica. Este endpoint permite:

Adicionar ou remover reações em mensagens

Usar qualquer emoji Unicode válido

Reagir a mensagens em chats individuais ou grupos

Remover reações existentes

Verificar o status da reação enviada

Tipos de reações suportados:

Qualquer emoji Unicode válido (👍, ❤️, 😂, etc)

String vazia para remover reação

Exemplo de requisição básica:


{
  "number": "5511999999999@s.whatsapp.net",
  "text": "👍",
  "id": "3EB0538DA65A59F6D8A251"
}

Exemplo de requisição para remover reação:


{
  "number": "5511999999999@s.whatsapp.net",
  "text": "",
  "id": "3EB0538DA65A59F6D8A251"
}

Exemplo de resposta:


{
  "success": true,
  "message": "Reaction sent",
  "reaction": {
    "id": "3EB0538DA65A59F6D8A251",
    "emoji": "👍",
    "timestamp": 1672531200000,
    "status": "sent"
  }
}

Exemplo de resposta ao remover reação:


{
  "success": true,
  "message": "Reaction removed",
  "reaction": {
    "id": "3EB0538DA65A59F6D8A251",
    "emoji": null,
    "timestamp": 1672531200000,
    "status": "removed"
  }
}

Parâmetros disponíveis:

number: Número do chat no formato internacional (ex: 5511999999999@s.whatsapp.net)

text: Emoji Unicode da reação (ou string vazia para remover reação)

id: ID da mensagem que receberá a reação

curl --request POST \
  --url https://free.uazapi.com/message/react \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "number": "5511999999999@s.whatsapp.net",
  "text": "👍",
  "id": "3EB0538DA65A59F6D8A251"
}'

---

# Apagar Mensagem Para Todos
## Apaga uma mensagem para todos os participantes da conversa.

Funcionalidades:
Apaga mensagens em conversas individuais ou grupos
Funciona com mensagens enviadas pelo usuário ou recebidas
Atualiza o status no banco de dados
Envia webhook de atualização
Notas Técnicas:

O ID da mensagem pode ser fornecido em dois formatos:
ID completo (contém ":"): usado diretamente
ID curto: concatenado com o owner para busca
Gera evento webhook do tipo "messages_update"
Atualiza o status da mensagem para "Deleted"

curl --request POST \
  --url https://free.uazapi.com/message/delete \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "id": "string"
}'

---

# Edita uma mensagem enviada
## Edita o conteúdo de uma mensagem já enviada usando a funcionalidade nativa do WhatsApp.

O endpoint realiza:

Busca a mensagem original no banco de dados usando o ID fornecido
Edita o conteúdo da mensagem para o novo texto no WhatsApp
Gera um novo ID para a mensagem editada
Retorna objeto de mensagem completo seguindo o padrão da API
Dispara eventos SSE/Webhook automaticamente
Importante:

Só é possível editar mensagens enviadas pela própria instância
A mensagem deve existir no banco de dados
O ID pode ser fornecido no formato completo (owner:messageid) ou apenas messageid
A mensagem deve estar dentro do prazo permitido pelo WhatsApp para edição

curl --request POST \
  --url https://free.uazapi.com/message/edit \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "id": "3A12345678901234567890123456789012",
  "text": "Texto editado da mensagem"
}'

---

# LINKS

https://docs.uazapi.com/endpoint/post/chat~delete
https://docs.uazapi.com/endpoint/post/chat~archive
https://docs.uazapi.com/endpoint/post/chat~read
https://docs.uazapi.com/endpoint/post/chat~mute
https://docs.uazapi.com/endpoint/post/chat~pin
https://docs.uazapi.com/endpoint/post/chat~find
https://docs.uazapi.com/endpoint/post/message~download
https://docs.uazapi.com/endpoint/post/message~react
https://docs.uazapi.com/endpoint/post/message~delete
https://docs.uazapi.com/endpoint/post/message~edit

