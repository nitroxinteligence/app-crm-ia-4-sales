#!/bin/bash
# Script para limpar cache e tentar build limpo

echo "🛑 PARANDO SERVIDORES NODE (se houver)..."
# Tenta matar processos na porta 3000 ou next
# Melhor não matar sem perguntar. Vamos apenas limpar.

echo "🧹 Limpando pastas de cache..."
rm -rf .next
rm -rf .turbo
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo

echo "✅ Cache limpo."

echo "🚀 Iniciando build limpo..."
npm run build
