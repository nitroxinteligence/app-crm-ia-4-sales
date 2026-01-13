# Solucao: WhatsApp nao oficial (UAZAPI) - UX + controle de instancia unica

## Objetivo
Melhorar a experiencia do modal de conexao do WhatsApp nao oficial e garantir que cada workspace use apenas **1 instancia ativa**.

## Ajustes implementados

### 1) Status em tempo real com feedback visual
- Polling imediato e continuo a cada 5s no endpoint:
  - `/api/integrations/whatsapp-nao-oficial/instance-status`
- Status normalizado para valores como `connecting`, `connected`, `disconnected`
- Badge e indicador com cores e animacao:
  - Conectado: verde
  - Conectando/Pendente: amarelo com pulso
  - Desconectado: vermelho

### 2) Layout do modal (UI)
- Card de status com indicador visual (ponto colorido + badge)
- Placeholder do QR code com bloco visual e animacao leve quando carregando
- Texto de instrucoes mais claro
- Indicacao do intervalo de atualizacao do status

### 3) Instancia unica por workspace
- A UI exibe **apenas uma instancia**.
- O backend reutiliza a conta existente quando possivel.
- Para criar uma nova instancia, o modal envia `forceNewInstance=true`.

### 4) Desconectar e excluir
- Botao **Desconectar** remove a instancia e limpa o registro no banco.
- Apos desconectar, o usuario pode conectar outro numero.

### 5) Gerar novo QR Code
- O botao **Gerar novo QR** cria uma nova instancia automaticamente.
- O backend remove qualquer instancia existente antes de criar a nova.

### 6) Presenca no card
- O card exibe a presenca retornada pela UAZAPI (`current_presence`).

## Endpoints envolvidos
- `POST /api/integrations/whatsapp-nao-oficial/connect`
  - cria nova instancia quando `forceNewInstance=true`
- `GET /api/integrations/whatsapp-nao-oficial/instance-status`
  - traz status + presence
- `POST /api/integrations/whatsapp-nao-oficial/disconnect`
  - desconecta e exclui a instancia

## Arquivos alterados
- `src/components/integracoes/modal-whatsapp-nao-oficial.tsx`
- `src/components/integracoes/visao-integracoes.tsx`
- `src/app/api/integrations/whatsapp-nao-oficial/connect/route.ts`
- `src/app/api/integrations/whatsapp-nao-oficial/instance-status/route.ts`
- `src/app/api/integrations/whatsapp-nao-oficial/status/route.ts`
- `src/app/api/integrations/whatsapp-nao-oficial/disconnect/route.ts`

## Observacoes
- O modal ainda fecha automaticamente quando a conexao fica `connected`.
- Se quiser manter aberto para confirmacao, posso ajustar.
