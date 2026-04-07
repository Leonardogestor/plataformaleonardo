# Deploy Produção Completo - LMG Platform

## 🚋 PLANO DE DEPLOY PASSO A PASSO

### ETAPA 1: CONFIGURAÇÃO AMBIENTE VERCEL

#### 1.1 Instalar Vercel CLI
```bash
npm i -g vercel
```

#### 1.2 Login na Vercel
```bash
vercel login
```

#### 1.3 Configurar Variáveis de Ambiente

Execute os comandos abaixo para configurar TODAS as variáveis obrigatórias:

```bash
# Database (CRÍTICO)
vercel env add DATABASE_URL production
# Valor: postgresql://[user]:[pass]@[host]:[port]/[db]?sslmode=require

# NextAuth (CRÍTICO)
vercel env add NEXTAUTH_URL production
# Valor: https://seu-dominio.vercel.app

vercel env add NEXTAUTH_SECRET production
# Valor: [32+ caracteres aleatórios - gerar com: openssl rand -base64 32]

# OpenAI (OBRIGATÓRIO)
vercel env add OPENAI_API_KEY production
# Valor: sk-... (chave real da OpenAI)

vercel env add AI_MODEL production
# Valor: gpt-4o-mini

vercel env add AI_TEMPERATURE production
# Valor: 0.1

# Pluggy Open Finance (OBRIGATÓRIO)
vercel env add PLUGGY_CLIENT_ID production
# Valor: Client ID real do Pluggy Dashboard

vercel env add PLUGGY_CLIENT_SECRET production
# Valor: Client Secret real do Pluggy Dashboard

vercel env add PLUGGY_WEBHOOK_SECRET production
# Valor: [gerar webhook secret no Pluggy]

# Rate Limiting (RECOMENDADO)
vercel env add UPSTASH_REDIS_REST_URL production
# Valor: URL do Redis Upstash

vercel env add UPSTASH_REDIS_REST_TOKEN production
# Valor: Token do Redis Upstash

# Segurança (OBRIGATÓRIO)
vercel env add CRON_SECRET production
# Valor: [gerar com: openssl rand -base64 24]

# Blob Storage (OBRIGATÓRIO)
vercel env add BLOB_READ_WRITE_TOKEN production
# Valor: vercel_blob_rw_... (gerado automaticamente pelo Vercel)

# Configurações (OBRIGATÓRIO)
vercel env add MAX_TRANSACTIONS_PER_DOCUMENT production
# Valor: 5000

vercel env add AI_CONFIDENCE_THRESHOLD production
# Valor: 0.7

# Processamento (OBRIGATÓRIO)
vercel env add DOCUMENT_PROCESSING_ENABLED production
# Valor: true

vercel env add PDF_PROCESSING_ENABLED production
# Valor: true
```

### ETAPA 2: DEPLOY INICIAL

#### 2.1 Deploy da Aplicação
```bash
# Fazer deploy inicial
vercel --prod

# Anotar a URL gerada (ex: https://lmg-platform.vercel.app)
```

#### 2.2 Atualizar NEXTAUTH_URL
```bash
# Atualizar com a URL real do deploy
vercel env add NEXTAUTH_URL production
# Valor: https://lmg-platform.vercel.app (URL real)
```

#### 2.3 Deploy Final com URL correta
```bash
vercel --prod
```

### ETAPA 3: CONFIGURAÇÃO BANCO DE DADOS

#### 3.1 Migrations Prisma
```bash
# Gerar Prisma Client com Data Proxy
PRISMA_GENERATE_DATAPROXY=true npm run db:generate

# Fazer deploy das migrations (se necessário)
npm run db:migrate:deploy
```

#### 3.2 Seed de Dados (Opcional)
```bash
# Criar usuário admin se necessário
npm run db:seed
```

### ETAPA 4: VALIDAÇÃO PÓS-DEPLOY

#### 4.1 Teste de Conectividade
```bash
# Testar se a aplicação está online
curl https://seu-dominio.vercel.app/api/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

#### 4.2 Teste de Autenticação
```bash
# Acessar: https://seu-dominio.vercel.app/login
# Tentar fazer login com usuário real
```

## 📋 CHECKLIST FINAL DE VALIDAÇÃO

### ✅ APIs CRÍTICAS
- [ ] `/api/health` - Status da aplicação
- [ ] `/api/auth/[...nextauth]` - Login/logout
- [ ] `/api/transactions` - CRUD transações
- [ ] `/api/balance` - Saldo consolidado
- [ ] `/api/investments` - Investimentos
- [ ] `/api/dashboard` - Dados dashboard
- [ ] `/api/documents` - Upload PDF
- [ ] `/api/events/refresh` - SSE heartbeat

### ✅ FLUXOS USUÁRIO
- [ ] Login com credenciais reais
- [ ] Dashboard carregando dados reais (sem mock)
- [ ] Upload e processamento de PDF
- [ ] Criação/edição de transações
- [ ] Visualização de investimentos
- [ ] Atualizações em tempo real (heartbeat)

### ✅ PERFORMANCE
- [ ] Tempo de carregamento < 3s
- [ ] APIs respondendo < 1s
- [ ] PDF processando sem timeout (120s)
- [ ] Rate limiting ativo

### ✅ SEGURANÇA
- [ ] Apenas usuários autenticados acessam dados
- [ ] Rate limiting funcionando
- [ ] Headers de segurança ativos
- [ ] Sem dados sensíveis expostos

## 🚨 PRINCIPAIS PONTOS DE FALHA

### ALTO RISCO
1. **NEXTAUTH_URL incorreta**
   - **Causa**: URL diferente da aplicação
   - **Impacto**: Login falha com 401
   - **Solução**: Verificar URL exata do deploy

2. **DATABASE_URL inválida**
   - **Causa**: String de conexão errada
   - **Impacto**: Aplicação não conecta no banco
   - **Solução**: Testar conexão manualmente

3. **OPENAI_API_KEY ausente**
   - **Causa**: Chave não configurada
   - **Impacto**: Processamento de PDF falha
   - **Solução**: Adicionar chave real

### MÉDIO RISCO
1. **Timeout no processamento PDF**
   - **Causa**: PDF muito grande ou complexo
   - **Impacto**: Upload falha após 120s
   - **Solução**: Reduzir tamanho ou otimizar

2. **Rate limiting muito restrito**
   - **Causa**: Limites baixos demais
   - **Impacto**: Usuários bloqueados
   - **Solução**: Ajustar limites no Upstash

3. **Conexões DB esgotadas**
   - **Causa**: Muitas conexões simultâneas
   - **Impacto**: Aplicação lenta/erro
   - **Solução**: Usar Prisma Data Proxy

### BAIXO RISCO
1. **Console.log em produção**
   - **Causa**: Logs não removidos
   - **Impacto**: Performance levemente afetada
   - **Solução**: Remover logs desnecessários

2. **Imagens com localhost**
   - **Causa**: Domínio não configurado
   - **Impacto**: Imagens não carregam
   - **Solução**: Adicionar domínio Vercel

## 🔧 COMANDOS DE EMERGÊNCIA

### Resetar Deploy
```bash
# Remover deploy atual
vercel rm --prod --yes

# Fazer novo deploy
vercel --prod
```

### Verificar Logs
```bash
# Ver logs de erro
vercel logs

# Ver logs de função específica
vercel logs --filter="api/documents"
```

### Testar Localmente
```bash
# Testar com variáveis de produção
vercel env pull .env.production
cp .env.production .env.local
npm run dev
```

## 📊 MONITORAMENTO

### Métricas Chave
- **Uptime**: 99.9%
- **Response Time**: < 1s
- **Error Rate**: < 1%
- **Upload Success**: > 95%

### Alertas Configurar
- Alta taxa de erros 4xx/5xx
- Tempo de resposta > 3s
- Falhas no processamento de PDF
- Rate limit atingido

## 🎯 RESULTADO FINAL

Após seguir este guia, você terá:

1. ✅ Aplicação 100% funcional na Vercel
2. ✅ Todas as APIs operando
3. ✅ Banco conectado e otimizado
4. ✅ Autenticação funcionando
5. ✅ PDF processando corretamente
6. ✅ Rate limiting ativo
7. ✅ Segurança implementada
8. ✅ Monitoramento configurado

**Status final**: 🚀 **PRONTO PARA USUÁRIOS REAIS**
