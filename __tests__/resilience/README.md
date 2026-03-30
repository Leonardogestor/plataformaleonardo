# 🧪 Testes de Resiliência - LMG Platform

## 📋 Estrutura de Testes

Esta suite de testes valida a resiliência do pipeline sob condições extremas e falhas reais.

## 🎯 Objetivos

1. **Validar comportamento sob falhas de infra**
2. **Garantir consistência de dados**
3. **Testar limites de performance**
4. **Verificar recuperação automática**
5. **Simular cenários de produção**

## 📁 Testes Implementados

### 🔴 **Infra (Redis Offline)**
- **Arquivo**: `redis.test.ts`
- **Validação**: Sistema continua operando sem Redis
- **Cenário**: `ECONNREFUSED` simulado
- **Esperado**: Graceful degradation, não crash

### 🤖 **Serviços (OpenAI Down)**
- **Arquivo**: `openai.test.ts`
- **Validação**: Pipeline fallback funciona
- **Cenário**: Mock de falha OpenAI
- **Esperado**: Regex/OCR como fallback

### 🔄 **Deduplicação**
- **Arquivo**: `deduplication.test.ts`
- **Validação**: Fingerprints consistentes
- **Cenário**: Transações duplicadas
- **Esperado**: Detecção 100% efetiva

### ⏱️ **Timeout e Concorrência**
- **Arquivo**: `timeout.test.ts`
- **Validação**: Controle de concorrência + timeout
- **Cenário**: Operações lentas e limites
- **Esperado**: Respeito de limites sem crash

### 📈 **Load Testing**
- **Arquivo**: `load.test.ts`
- **Validação**: Performance sob carga
- **Cenário**: 10K+ itens
- **Esperado**: Throughput linear, sem memory leaks

### 🎯 **Score de Confiança**
- **Arquivo**: `confidence.test.ts`
- **Validação**: Classificação automática
- **Cenário**: Transações suspeitas vs normais
- **Esperado**: Rejeição automática de low confidence

### 🔄 **Fallback Pipeline**
- **Arquivo**: `fallback.test.ts`
- **Validação**: Cascata de fallbacks
- **Cenário**: Falha em cascata
- **Esperado**: OCR como último recurso

## 🚀 Como Executar

```bash
# Instalar dependências
cd __tests__/resilience
npm install

# Executar todos os testes
npm run test:all

# Executar teste específico
npm run test:redis
npm run test:openai
npm run test:deduplication
npm run test:timeout
npm run test:load
npm run test:confidence
npm run test:fallback

# Com coverage
npm run test:coverage
```

## 📊 Métricas Validadas

- **Resiliência**: Sistema não crash sob falhas
- **Performance**: Throughput > 100 itens/s
- **Confiabilidade**: Recuperação automática funcional
- **Consistência**: Sem duplicatas ou corrupção
- **Escalabilidade**: Comportamento linear sob carga

## 🔧 Configuração

Os testes usam mocks controlados para simular condições exatas sem depender de infra externa.

## ✅ Critérios de Sucesso

- [ ] Todos os testes passam
- [ ] Cobertura > 80%
- [ ] Performance < 2s por teste
- [ ] Sem memory leaks detectados
- [ ] Logs estruturados gerados

## 🚨 Critérios de Falha

- [ ] Qualquer teste crasha a aplicação
- [ ] Dados corrompidos ou inconsistentes
- [ ] Memory leaks > 10MB
- [ ] Performance degradada > 50%
- [ ] Logs ausentes ou incorretos
