# 🧪 Kiwify Webhook Testing Checklist

## 🎯 OBJETIVO
Testar completamente a integração Kiwify antes de ir para produção.

## 📋 PASSO A PASSO

### 🥇 PASSO 1 - LOG NO WEBHOOK ✅
- [x] Logging detalhado adicionado ao webhook
- [x] Logs mostram: evento, ID, email, payload completo
- [x] Logs de negócio: criação usuário, ativação premium

### 🥈 PASSO 2 - TESTE LOCAL
```bash
# Terminal 1 - Iniciar servidor
npm run dev

# Terminal 2 - Testar webhook
npm run test:webhook
```

### 🥉 PASSO 3 - VERIFICAÇÃO

#### ✅ 1. Webhook chegou?
- [ ] Verificar console do servidor
- [ ] Deve ver: `🔥 KIWIFY WEBHOOK RECEBIDO`
- [ ] Payload completo deve aparecer

#### ✅ 2. Evento correto?
- [ ] `order_paid` para compra
- [ ] `subscription_renewed` para renovação  
- [ ] `subscription_canceled` para cancelamento

#### ✅ 3. Usuário atualizado?
```sql
-- Verificar no banco
SELECT * FROM users WHERE email = 'cliente@teste.com';
SELECT * FROM subscriptions WHERE user_id = [ID];
SELECT * FROM feature_access WHERE user_id = [ID];
```

## 🔍 TESTES ESPECÍFICOS

### Teste 1: Nova Compra (order_paid)
- [ ] Webhook recebe evento
- [ ] Usuário criado (se não existir)
- [ ] Premium ativado
- [ ] Subscription criada

### Teste 2: Renovação (subscription_renewed)
- [ ] Webhook recebe evento
- [ ] Usuário encontrado
- [ ] Premium mantido
- [ ] Subscription atualizada

### Teste 3: Cancelamento (subscription_canceled)
- [ ] Webhook recebe evento
- [ ] Usuário encontrado
- [ ] Premium revogado
- [ ] Grace period aplicado

### Teste 4: Idempotência
- [ ] Enviar mesmo evento 2x
- [ ] Segunda vez deve retornar "Event already processed"
- [ ] Sem duplicação no banco

## 🚨 ERROS CLÁSSICOS

### ❌ Webhook não chega
- Verificar URL na Kiwify
- Verificar se servidor está online
- Verificar firewall/ngrok

### ❌ Evento duplicado
- Idempotência falhando
- Verificar `extractEventId()`
- Verificar `isEventProcessed()`

### ❌ Usuário não atualizado
- Schema não tem campos `isActive`, `plan`
- Verificar se Subscription model existe
- Verificar permissões do banco

### ❌ Sempre retorna erro 500
- Verificar logs completos
- Verificar se Prisma está conectado
- Verificar variáveis de ambiente

## 🛠️ COMANDOS ÚTEIS

```bash
# Verificar logs em tempo real
tail -f logs/app.log

# Testar webhook manualmente
curl -X POST http://localhost:3000/api/webhooks/kiwify \
  -H "Content-Type: application/json" \
  -d '{"event":"order_paid","data":{"customer":{"email":"test@test.com"}}}'

# Limpar dados de teste
npm run db:reset && npm run db:seed
```

## 📊 RESULTADOS ESPERADOS

### Sucesso ✅
```
🔥 KIWIFY WEBHOOK RECEBIDO
📦 KIWIFY WEBHOOK - Payload recebido: {...}
🎯 KIWIFY WEBHOOK - Evento: order_paid, ID: order_12345, Email: cliente@teste.com
👤 USER - Buscando/criando usuário: cliente@teste.com
👤 USER - Usuário criado com sucesso: cliente@teste.com (ID: abc123)
🚀 ATIVANDO PREMIUM - User ID: abc123, Subscription ID: sub_456
🎉 PREMIUM - Acesso premium ativado para user abc123
✅ KIWIFY WEBHOOK - Resultado do processamento: {success: true, userId: "abc123"}
🎉 KIWIFY WEBHOOK - Resposta enviada: {success: true, userId: "abc123"}
```

### Falha ❌
```
❌ KIWIFY WEBHOOK - Falha na validação do secret
❌ KIWIFY WEBHOOK - JSON inválido recebido
❌ KIWIFY WEBHOOK - Email não encontrado no payload
💥 KIWIFY WEBHOOK - ERRO CRÍTICO: [error details]
```

## 🎯 CHECKLIST FINAL PRODUÇÃO

- [ ] Webhook responde 200 sempre
- [ ] Não duplica eventos
- [ ] Usuário ativa corretamente
- [ ] Cancelamento remove acesso
- [ ] Email bate com usuário
- [ ] Logs funcionando
- [ ] Idempotência 100%
- [ ] Schema atualizado
- [ ] Variáveis ambiente OK
- [ ] Testado com Kiwify real

---

## 📞 SUPORTE

Se algo falhar:
1. Verificar logs completos
2. Testar com script local
3. Verificar banco de dados
4. Testar idempotência
5. Simular erro proposital

**Só ir para produção após TUDO marcado!**
