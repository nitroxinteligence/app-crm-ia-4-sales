Para desenvolvimento local, o GOOGLE_WEBHOOK_URL não pode ser localhost. O Google só envia webhooks para HTTPS público. Então você tem duas opções:

Opção A (recomendada p/ dev local): usar túnel HTTPS

  1. Rode um túnel para sua porta 3000 (ex: ngrok http 3000 ou cloudflared tunnel --url http://
     localhost:3000).
  2. Copie a URL HTTPS gerada (ex: https://abcd-1234.ngrok-free.app).
  3. No .env, use:
     GOOGLE_WEBHOOK_URL=https://abcd-1234.ngrok-free.app/api/webhooks/google-calendar
  4. Reinicie o npm run dev.
     Obs: a URL muda a cada sessão do ngrok, então precisa atualizar o .env quando reiniciar.

  Opção B: apontar para o domínio publicado
  Se você já tem o app rodando no domínio (produção/staging), mantenha:
  GOOGLE_WEBHOOK_URL=https://app.verticalpartners.com.br/api/webhooks/google-calendar
  Mas nesse caso, os webhooks vão cair no servidor publicado, não no seu localhost.

  Sobre o redirect URL: pode ter dois cadastrados no Google, mas no .env você usa apenas um por
  ambiente.

  - Dev: GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
  - Prod: GOOGLE_REDIRECT_URI=https://app.verticalpartners.com.br/api/integrations/google/callback