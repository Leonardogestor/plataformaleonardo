# 📘 LMG Platform - Runbook Operacional

## 🎯 Visão Geral

Este runbook documenta procedimentos operacionais para garantir a estabilidade, performance e escalabilidade da LMG Platform em ambiente de produção.

## 📋 Estrutura do Runbook

### 🔴 **Incidentes Críticos (P0)**
- Sistema indisponível
- Perda de dados
- Falha de pagamento
- Segurança comprometida

### 🟡 **Incidentes Altos (P1)**
- Performance degradada
- Fila parada
- Redis instável
- Alta taxa de erros

### 🟡 **Incidentes Médios (P2)**
- Falha em processamento de lote
- DLQ crescendo
- SLA violado
- Backup falhando

### 🟢 **Incidentes Baixos (P3)**
- Alertas de performance
- Logs de depuração
- Manutenção programada

---

## 🚨 **Procedimentos de Emergência**

### P0 - Sistema Indisponível

#### 📞 **Diagnóstico Imediato**
1. Verificar status dos serviços:
   ```bash
   # Health check completo
   curl -f http://localhost:3000/api/health
   kubectl get pods -n lmg-platform
   ```

2. Identificar ponto de falha:
   - Aplicação parada?
   - Banco de dados inacessível?
   - Redis conectado?
   - Worker rodando?

3. Comunicar time:
   ```bash
   # Canal de emergência
   echo "🚨 P0 - Sistema Indisponível"
   # Notificar stakeholders
   ```

#### 🔄 **Ação Imediata**
1. **Não reiniciar serviços automaticamente** - Pode piorar a situação
2. **Investigar causa raiz** antes de qualquer ação
3. **Preparar rollback** se necessário
4. **Documentar timeline** do incidente

#### 📝 **Comunicação**
- Criar incident no sistema de tickets
- Notificar canais apropriados
- Atualizar status page

#### ⏱️ **Resolução**
1. Aplicar fix específico
2. Monitorar estabilização
3. Realizar post-mortem
4. Implementar prevenção

---

### P1 - Performance Degradada

#### 📊 **Detecção**
1. Monitorar métricas em tempo real:
   ```bash
   # Verificar KPIs
   curl http://localhost:3000/api/admin/metrics
   ```

2. Identificar gargalos:
   - CPU > 80%
   - Memória > 85%
   - Tempo de resposta > 5s
   - Fila > 1000 jobs

#### 🛠️ **Ação**
1. **Escalar horizontalmente**:
   ```bash
   # Aumentar workers
   kubectl scale deployment lmg-platform --replicas=3
   ```

2. **Otimizar queries**:
   ```sql
   -- Adicionar índices em queries lentas
   EXPLAIN ANALYZE SELECT * FROM transactions WHERE date > '2024-01-01';
   ```

3. **Cache intensivo**:
   ```typescript
   // Aumentar TTL de cache
   const cacheConfig = {
     ttl: 3600000, // 1 hora
     maxSize: 10000
   }
   ```

---

### P2 - Fila Parada

#### 🔍 **Diagnóstico**
1. Verificar status da fila:
   ```bash
   # Status da fila
   curl http://localhost:3000/api/queue/status
   ```

2. Logs do worker:
   ```bash
   # Logs recentes
   docker logs lmg-platform-worker --tail=100
   ```

#### 🔄 **Ação**
1. **Restart controlado**:
   ```bash
   # Reiniciar worker
   kubectl rollout restart deployment/lmg-platform-worker
   ```

2. **Limpar fila travada**:
   ```bash
   # Limpar jobs presos
   curl -X POST http://localhost:3000/api/queue/clean
   ```

3. **Verificar DLQ**:
   ```bash
   # Verificar Dead Letter Queue
   curl http://localhost:3000/api/dlq/status
   ```

---

### P3 - DLQ Crescendo

#### 📈 **Monitoramento**
1. Thresholds críticos:
   - DLQ > 100 jobs
   - Taxa de erro > 10%
   - Jobs presos > 1 hora

#### 🚨 **Alerta Automática**
```bash
# Script de monitoramento
#!/bin/bash
DLQ_SIZE=$(curl -s http://localhost:3000/api/dlq/size)
ERROR_RATE=$(curl -s http://localhost:3000/api/metrics/error-rate)

if [ $DLQ_SIZE -gt 100 ] || [ $ERROR_RATE -gt 10 ]; then
  echo "🚨 DLQ CRÍTICO - Size: $DLQ_SIZE, Error Rate: $ERROR_RATE%"
  # Enviar alerta
  curl -X POST -H "Content-Type: application/json" \
       -d '{"level": "critical", "message": "DLQ overflow"}' \
       http://localhost:3000/api/alerts
fi
```

#### 🧹 **Processamento**
1. **Análise de causa**:
   - Parser falhando?
   - IA sobrecarregada?
   - Schema inválido?

2. **Reprocessar seletivamente**:
   ```bash
   # Reprocessar apenas DLQ
   curl -X POST http://localhost:3000/api/dlq/reprocess
   ```

3. **Escala automática**:
   ```bash
   # Aumentar workers temporariamente
   kubectl scale deployment lmg-platform-worker --replicas=5
   ```

---

## 📊 **Monitoramento Contínuo**

### 📈 **Métricas Essenciais**

#### 1. Health Check (5 minutos)
```bash
#!/bin/bash
while true; do
  STATUS=$(curl -s http://localhost:3000/api/health)
  echo "$(date): $STATUS"
  sleep 300
done
```

#### 2. Performance Metrics (1 minuto)
```bash
#!/bin/bash
while true; do
  curl -s http://localhost:3000/api/admin/metrics | jq '.'
  sleep 60
done
```

#### 3. Dashboard Operacional
- URL: `http://localhost:3000/admin/dashboard`
- KPIs em tempo real:
  - Jobs processados/minuto
  - Tempo médio de processamento
  - Taxa de sucesso/erro
  - Uso de IA (tokens/custo)
  - Tamanho da fila

---

## 🔧 **Procedimentos de Manutenção**

### 📅 **Backup Diário**
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
# Backup do banco
pg_dump lmg_platform > backup_$DATE.sql
# Backup de configurações
kubectl get configmap lmg-platform-config -o yaml > config_$DATE.yaml
```

### 🔄 **Deploy Controlado**
```bash
#!/bin/bash
# Deploy com rollback
kubectl set image deployment/lmg-platform lmg-platform:v2.1.0
kubectl rollout status deployment/lmg-platform
# Verificar saúde
kubectl rollout status deployment/lmg-platform-worker
```

### 🧹 **Limpeza de Recursos**
```bash
#!/bin/bash
# Limpar logs antigos
docker system prune -f
# Limpar métricas antigas
curl -X DELETE http://localhost:3000/api/metrics/cleanup
```

---

## 🚨 **Resposta a Incidentes**

### 📋 **Comunicação de Incidente**

#### Template de Alerta
```json
{
  "incident_id": "INC-2024-03-001",
  "severity": "P1",
  "title": "Sistema Indisponível",
  "description": "Aplicação não respondendo a health checks",
  "impact": "Todos os usuários afetados",
  "start_time": "2024-03-15T10:30:00Z",
  "services_affected": ["api", "worker", "database"],
  "status": "investigating",
  "estimated_resolution": "2024-03-15T11:00:00Z",
  "actions_taken": [
    "Investigando logs",
    "Verificando infraestrutura",
    "Comunicando stakeholders"
  ]
}
```

#### Canais de Comunicação
1. **Slack**: `#incidents-lmg-platform`
2. **Email**: `ops@lmgplatform.com`
3. **Status Page**: `status.lmgplatform.com`
4. **SMS**: Para incidentes P0

### 📝 **Post-Mortem Template**
```markdown
# Incident Post-Mortem: INC-2024-03-001

## Resumo
- **Duração**: 45 minutos
- **Impacto**: 100% usuários afetados
- **Causa Raiz**: Conexão Redis esgotada
- **Resolução**: Scale horizontal + otimização de queries

## Timeline
- **10:30**: Início do incidente
- **10:35**: Detecção automática
- **10:40**: Notificação P0
- **10:45**: Investigação iniciada
- **11:00**: Causa identificada
- **11:15**: Solução implementada
- **11:30**: Serviço restaurado

## Lições Aprendidas
1. **Monitoramento de conexões Redis** implementado
2. **Auto-scaling baseado em métricas** configurado
3. **Circuit breaker para Redis** adicionado

## Ações Preventivas
1. Implementar health checks para Redis
2. Configurar alertas proativos para DLQ
3. Adicionar métricas de conexão ao dashboard
4. Testes de carga regulares para Redis
```

---

## 📋 **Escalas e DR**

### 🚀 **Estrutura de Escalabilidade**
```
┌─────────────────────────────────────┐
│        Load Balancer         │
├─────────────────────────────────────┤
│  API Gateway (3x)          │
├─────────────────────────────────────┤
│  Web Servers (3x)           │
├─────────────────────────────────────┤
│  Redis Cluster (3x)          │
├─────────────────────────────────────┤
│  PostgreSQL (1 primary + 2 replicas) │
├─────────────────────────────────────┤
│  Workers (5x por servidor)     │
├─────────────────────────────────────┤
│  DLQ (1x)                 │
├─────────────────────────────────────┤
│  Monitoring (1x)             │
└─────────────────────────────────────┘
```

### 🔄 **Disaster Recovery**
1. **Failover automático** para região secundária
2. **Restore point** diário verificado
3. **RTO < 5 minutos** para serviços críticos

---

## 📞 **Segurança Operacional**

### 🔒 **Hardening Checklist**
- [ ] Firewall configurado
- [ ] Rate limiting ativo
- [ ] Input validation rigoroso
- [ ] Logs de auditoria ativos
- [ ] Segredos rotacionados (90 dias)
- [ ] Scanner de vulnerabilidades semanal
- [ ] WAF configurado
- [ ] DDoS protection ativo

### 🛡️ **Response a Incidentes de Segurança**
1. **Isolar sistema** imediatamente
2. **Analisar logs** de acesso
3. **Verificar integridade** dos dados
4. **Notificar equipe** de segurança
5. **Documentar** todos os passos

---

## 📚 **Treinamento e Documentação**

### 🎓 **Procedimentos Padrão**
1. **Onboarding** de novos engenheiros
2. **Simulados** de incidentes trimestrais
3. **Documentação** atualizada mensalmente
4. **Review** de runbook trimestral

### 📖 **Conhecimento Compartilhado**
1. **Base de conhecimento** com soluções comuns
2. **Playbooks** específicos por serviço
3. **Vídeos** de demonstração de procedimentos
4. **Mentoria** técnica para equipe junior

---

## 📞 **Contatos e Escalation**

### 📞 **Matriz de Escalation**
| Nível | Tempo Resposta | Contato | Quando Escalar |
|--------|----------------|---------|---------------|
| P3 | Imediato | On-call | Sistema indisponível |
| P2 | 15 minutos | On-call | Performance crítica |
| P1 | 1 hora | Time líder | Degradation severa |
| P2 | 4 horas | Time líder | Incidente médio |
| P3 | 24 horas | Gerência | Incidente baixo |

### 📞 **Equipe de Plantão**
- **On-call Principal**: Engenheiro Sênior DevOps
- **On-call Secundário**: Engenheiro DevOps Pleno
- **Gerência**: Arquiteto de Sistemas
- **Segurança**: Especialista em Segurança

---

## 📊 **Métricas de Sucesso**

### 🎯 **KPIs Operacionais**
- **Uptime**: 99.9%
- **MTTR**: < 1 hora
- **MTBF**: > 720 horas
- **SLA Compliance**: 95%
- **Customer Satisfaction**: > 4.5/5

### 📈 **Métricas Técnicas**
- **Response Time**: P95 < 200ms
- **Throughput**: > 1000 transações/minuto
- **Error Rate**: < 0.5%
- **Resource Utilization**: < 80%
- **Queue Depth**: < 100

---

## 🔄 **Melhoria Contínua**

### 📋 **Retrospectives**
- **Semanais**: Friday 16:00
- **Mensais**: Primeira sexta-feira
- **Trimestrais**: Review completo

### 🎯 **Objectivos**
- Reduzir MTTR em 20% por trimestre
- Aumentar uptime para 99.95%
- Automatizar 80% dos incidentes comuns
- Reduzir custo operacional em 15%

---

## 📞 **Execução do Runbook**

### ⚡ **Em Produção**
1. **Seguir runbook estritamente**
2. **Documentar qualquer desvio**
3. **Comunicar proativamente**
4. **Learning contínuo**

### 🧪 **Em Testes/Homologação**
1. **Simular incidentes reais**
2. **Testar procedimentos de failover**
3. **Validar escalas automaticamente**
4. **Performance testing** mensal

---

## 📞 **Glossário**

- **DLQ**: Dead Letter Queue
- **MTTR**: Mean Time To Resolution
- **MTBF**: Mean Time Between Failures
- **RTO**: Recovery Time Objective
- **SLA**: Service Level Agreement
- **RPO**: Recovery Point Objective

---

**Versão**: 1.0  
**Última Atualização**: 2024-03-15  
**Próxima Revisão**: 2024-06-15

*Este runbook deve ser revisado e atualizado trimestralmente.*
