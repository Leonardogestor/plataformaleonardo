#!/bin/bash

# Script de Deploy para Vercel
# Uso: ./deploy.sh [staging|production]

ENVIRONMENT=${1:-staging}

echo "🚀 Iniciando deploy para $ENVIRONMENT..."

# Verificar se está logado na Vercel
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ Você não está logado na Vercel. Execute 'vercel login' primeiro."
    exit 1
fi

# Verificar variáveis de ambiente
if [ ! -f ".env.local" ]; then
    echo "❌ Arquivo .env.local não encontrado. Configure as variáveis de ambiente locais."
    exit 1
fi

# Build do projeto
echo "📦 Buildando o projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build falhou. Verifique os erros acima."
    exit 1
fi

# Deploy para Vercel
echo "🌐 Fazendo deploy para $ENVIRONMENT..."
if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod
else
    vercel
fi

echo "✅ Deploy concluído com sucesso!"
echo "🔗 URL: https://plataformalmg.vercel.app"
