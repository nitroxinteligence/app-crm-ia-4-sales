#!/bin/bash

# Script para gerar API Key do CRM
# Não precisa de login - usa service_role_key

set -e

echo "=== Gerador de API Key do CRM ==="
echo ""

# Obter variáveis do .env
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Erro: Variáveis SUPABASE_URL ou SERVICE_ROLE_KEY não encontradas no .env"
    exit 1
fi

# Nome da API Key
read -p "Nome da API Key (default: N8N Integration): " KEY_NAME
KEY_NAME=${KEY_NAME:-"N8N Integration"}

echo ""
echo "Gerando API Key..."

# Gerar key aleatória
API_KEY="vpcrm_$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-48)"

# Pegar workspace_id do primeiro workspace (assumindo que existe apenas um em dev)
WORKSPACE_ID=$(curl -s "${SUPABASE_URL}/rest/v1/workspaces?select=id&limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  | jq -r '.[0].id // empty')

if [ -z "$WORKSPACE_ID" ]; then
    echo "❌ Erro: Nenhum workspace encontrado. Crie um workspace primeiro."
    exit 1
fi

# Inserir API key no banco
RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/api_keys" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"workspace_id\":\"${WORKSPACE_ID}\",\"key\":\"${API_KEY}\",\"name\":\"${KEY_NAME}\"}")

# Verificar se foi criado
if echo "$RESULT" | jq -e '.[0].id' > /dev/null 2>&1; then
    echo ""
    echo "🎉 API Key gerada com sucesso!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Copie e guarde esta key em local seguro:"
    echo ""
    echo "  $API_KEY"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Use no N8N com o header:"
    echo "   Name: X-API-Key"
    echo "   Value: $API_KEY"
    echo ""
    echo "✅ Teste agora:"
    echo "   curl \"http://localhost:3000/api/leads\" -H \"X-API-Key: $API_KEY\""
    echo ""
else
    echo "❌ Erro ao criar API Key:"
    echo "$RESULT" | jq
    exit 1
fi
