# 🚨 EMERGENCY DEPLOY CHECKLIST

## ANTES DO DEPLOY (5 MINUTOS)

### ⚡ Variáveis Críticas
```bash
# Verificar se estão configuradas
vercel env ls

# Testar localmente
vercel env pull .env.production
cp .env.production .env.local
npm run dev
```

### 🔍 Testes Rápidos
- [ ] Login funciona localmente
- [ ] Dashboard carrega dados
- [ ] Upload PDF funciona
- [ ] Health check responde

---

## DURANTE O DEPLOY (10 MINUTOS)

### 🚀 Deploy Command
```bash
vercel --prod
```

### 📊 Monitorar em Tempo Real
```bash
# Terminal 1 - Logs
vercel logs --follow

# Terminal 2 - Teste automático
node scripts/test-production-endpoints.js https://sua-url.vercel.app
```

---

## APÓS O DEPLOY (15 MINUTOS)

### ✅ VALIDAÇÃO CRÍTICA

#### 1. Health Check
```bash
curl https://sua-url.vercel.app/api/health
# Esperado: {"status":"ok","timestamp":"..."}
```

#### 2. Autenticação
```bash
# Acessar manualmente
https://sua-url.vercel.app/login
# Tentar login com usuário real
```

#### 3. APIs Protegidas
```bash
# Devem retornar 401 sem sessão
curl https://sua-url.vercel.app/api/transactions
curl https://sua-url.vercel.app/api/dashboard
curl https://sua-url.vercel.app/api/balance
```

#### 4. Upload PDF
- [ ] Fazer upload de PDF real
- [ ] Verificar se processa sem timeout
- [ ] Checar se transações aparecem

#### 5. SSE Real-time
```bash
# Testar heartbeat
curl -N https://sua-url.vercel.app/api/events/refresh
# Esperado: data: {"type":"connected"}
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### ❌ Login retorna 401
**Causa**: NEXTAUTH_URL incorreta
```bash
# Corrigir
vercel env add NEXTAUTH_URL production
# Valor: https://sua-url-exata.vercel.app
vercel --prod
```

### ❌ Database connection failed
**Causa**: DATABASE_URL inválida
```bash
# Testar conexão
psql $DATABASE_URL -c "SELECT 1;"
# Corrigir se necessário
vercel env add DATABASE_URL production
```

### ❌ PDF não processa
**Causa**: OPENAI_API_KEY ausente
```bash
# Verificar
vercel env ls | grep OPENAI
# Adicionar se faltar
vercel env add OPENAI_API_KEY production
```

### ❌ Rate limit atingido
**Causa**: Upstash Redis não configurado
```bash
# Configurar ou remover rate limiting
vercel env rm UPSTASH_REDIS_REST_URL
vercel env rm UPSTASH_REDIS_REST_TOKEN
```

### ❌ Timeout no upload
**Causa**: PDF muito grande
```bash
# Aumentar timeout no vercel.json
"app/api/documents/route.ts": {"maxDuration": 180}
```

---

## 🔄 ROLLBACK PLAN

### Se algo der errado:
```bash
# 1. Identificar o problema
vercel logs --filter="error"

# 2. Se for crítico, fazer rollback
vercel rollback

# 3. Se não funcionar, remover deploy
vercel rm --prod --yes

# 4. Fazer novo deploy com correções
vercel --prod
```

---

## 📱 TESTES FINAIS OBRIGATÓRIOS

### Usuário Real Test:
1. **Login**
   - Email: usuário real
   - Senha: senha real
   - Resultado: ✅ Dashboard aparece

2. **Dados**
   - Dashboard mostra valores reais
   - Sem dados mock
   - Resultado: ✅ Valores corretos

3. **PDF**
   - Upload de extrato bancário real
   - Processamento concluído
   - Transações importadas
   - Resultado: ✅ Funcionando

4. **Performance**
   - Carregamento < 3s
   - APIs < 1s
   - Resultado: ✅ Aceitável

---

## 🎯 GO/NO-GO DECISION

### ✅ GO para Produção se:
- [ ] Health check OK
- [ ] Login funciona
- [ ] PDF processa
- [ ] Sem erros 500
- [ ] Performance aceitável

### ❌ NO-GO se:
- [ ] Qualquer API crítica falha
- [ ] Login não funciona
- [ ] PDF não processa
- [ ] Erros 500 constantes
- [ ] Performance > 5s

---

## 📞 CONTATO EMERGÊNCIA

Se algo crítico falhar:
1. **Parar o deploy**: `vercel rm --prod --yes`
2. **Manter versão anterior**: Não fazer novo deploy
3. **Investigar causa**: Usar logs e testes
4. **Comunicar usuários**: Se necessário

**Status final**: 🚀 **PRONTO PARA USUÁRIOS** ou ⚠️ **PRECISA DE CORREÇÕES**
