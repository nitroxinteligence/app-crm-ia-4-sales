# WhatsApp Cloud API - App Review (Meta) e Permissoes

Este documento registra o problema atual de permissao no Meta App Review e o plano para resolver.
Objetivo: habilitar o fluxo 1-clique do Embedded Signup (sem pedir WABA/Phone Number ID manualmente).

## 1) Problema atual

- Permissoes reprovadas:
  - whatsapp_business_messaging
  - whatsapp_business_management
- Impacto:
  - Nao conseguimos listar WABA/phone_numbers
  - Nao conseguimos assinar webhooks automaticamente
  - Sem webhook, nenhuma mensagem inbound chega no `/app/inbox`

## 2) Requisitos para 1-clique (automacao total)

Para o fluxo automatico funcionar, o app precisa:
- Advanced Access para:
  - whatsapp_business_messaging
  - whatsapp_business_management
  - business_management
- App conectado ao Business Manager do cliente
- Usuario do login ser admin do Business Manager que possui o WABA
- Webhook configurado com URL HTTPS estavel

## 3) Checklist de configuracao (antes de reenviar)

1) App Settings
- App Domains preenchido (dominio HTTPS fixo)
- Privacy Policy URL
- Terms of Service URL
- User Data Deletion URL

2) Business Verification
- Verificar o Business Manager associado ao app

3) Permissoes
- Solicitar somente permissoes usadas no fluxo
- Remover o que nao for essencial

4) Acesso e roles
- Adicionar o app em Business Settings > Accounts > Apps
- Adicionar o usuario reviewer como admin do WABA (quando aplicavel)

## 4) Evidencias exigidas no App Review

### 4.1 Video (screencast)
Roteiro recomendado:
1. Login no app (`/app/integracoes`)
2. Botao "Conectar"
3. Login no Meta
4. Selecionar conta do WhatsApp Business
5. Retorno ao app com status "Conectado"
6. Enviar mensagem para o numero conectado
7. Ver a mensagem entrando no `/app/inbox`

### 4.2 Instrucoes de teste
- Enviar um usuario de teste (email/senha)
- Explicar onde clicar e o que esperar em cada tela

### 4.3 Justificativa de cada permissao
Copiar/colar no App Review:

whatsapp_business_management
> Necessaria para localizar o WhatsApp Business Account (WABA), listar phone numbers e assinar webhooks.
> Sem isso o app nao consegue vincular o numero do cliente nem receber mensagens.

whatsapp_business_messaging
> Necessaria para enviar e receber mensagens no WhatsApp do cliente dentro do CRM (Inbox omnichannel).
> E a funcionalidade principal do produto.

business_management
> Necessaria para identificar o Business Manager do usuario e localizar o WABA associado durante o onboarding.

## 5) Observacoes importantes

- Sem Advanced Access, o fluxo automatico nao funciona para usuarios finais.
- Em modo "Development", o app so funciona com usuarios em App Roles (admins/testers).
- Webhook precisa de URL HTTPS estavel (tunnel fixo, dominio proprio ou reverse proxy).
- Se reaprovar permissoes, o usuario precisa reautenticar para conceder novos scopes.

## 6) Plano B (se reprovado novamente)

1) Usar BSP (ex: 360dialog/Twilio) para reduzir burocracia de App Review
2) Manter fluxo manual temporario (WABA/Phone Number ID) apenas para clientes selecionados
3) Preparar novo pacote de evidencias e reenviar

## 7) Status atual

- Reprovado em 2025-12-30
- Proxima acao: reenviar App Review com video + instrucoes + justificativas acima
