# 🔧 Configuração de Ambiente na Vercel

## Problema Identificado
O login na Vercel está retornando 200 mas não redirecionando, indicando que as variáveis de ambiente podem não estar configuradas corretamente no dashboard da Vercel.

## Variáveis Necessárias

### 1. Variáveis de Ambiente Obrigatórias
Configure no dashboard da Vercel (Project Settings > Environment Variables):

```
NEXTAUTH_URL=https://plataformalmg.vercel.app
NEXTAUTH_SECRET=asKWu3RMvo+VVxx3GSrmbezI9cESKh5t/I9uLhVRARE=
NODE_ENV=production
DATABASE_URL=postgresql://postgres:NiatCfZsAatKrsnqmxNhknZsezLwRffH@shortline.proxy.rlwy.net:33990/railway?sslmode=require
```

### 2. Variáveis Opcionais
```
PLUGGY_CLIENT_ID=Client ID de produção do Pluggy Dashboard
PLUGGY_CLIENT_SECRET=Client Secret de produção do Pluggy Dashboard
```

## Passos para Configurar

1. **Acessar Dashboard Vercel**
   - Entre em https://vercel.com/dashboard
   - Selecione o projeto "plataformaleonardo"

2. **Configurar Variáveis**
   - Vá para Settings > Environment Variables
   - Adicione todas as variáveis acima
   - Marque como "Production" e "Preview"

3. **Redeploy**
   - Vá para Deployments
   - Clique no último deploy e selecione "Redeploy"
   - Aguarde o deploy completar

4. **Testar**
   - Acesse https://plataformalmg.vercel.app/login
   - Use: admin@plataformalmg.com / admin123

## Verificação
Após configurar, execute:
```bash
node test-vercel-login-complete.js
```

## Possíveis Erros
- **401 Unauthorized**: Variáveis de ambiente incorretas
- **500 Internal**: Database URL inválida
- **302 Loop**: NEXTAUTH_URL incorreto

## Importante
As variáveis de ambiente no arquivo `.env.production` só funcionam em builds locais. Na Vercel, precisam ser configuradas no dashboard.
