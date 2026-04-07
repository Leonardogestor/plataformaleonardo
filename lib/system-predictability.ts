/**
 * Previsibilidade do Sistema - Comportamento Consistente
 * Garante que o usuário possa confiar no sistema
 */

export interface PredictabilityConfig {
  responseTimeTarget: number // ms
  responseTimeVariance: number // % permitido
  queueProcessingTime: number // ms por item
  maxQueueLength: number
  consistencyThreshold: number // % de consistência
  reliabilityTarget: number // % de sucesso
}

export interface ConsistencyMetrics {
  responseTimeConsistency: number // % de requisições dentro do target
  queueConsistency: number // % de processamento dentro do tempo esperado
  featureConsistency: number // % de features disponíveis quando deveriam
  behaviorConsistency: number // % de comportamento consistente
  overallConsistency: number // média ponderada
}

export interface PredictabilityViolation {
  type: 'response_time' | 'queue_processing' | 'feature_availability' | 'behavior_change'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expected: string
  actual: string
  impact: string
  recommendation: string
  timestamp: number
}

class SystemPredictabilityManager {
  private static instance: SystemPredictabilityManager
  private config: PredictabilityConfig
  private violations: PredictabilityViolation[] = []
  private responseTimeHistory: number[] = []
  private queueHistory: Array<{ length: number; processingTime: number }> = []
  private featureHistory: Map<string, boolean[]> = new Map()
  private subscribers: Set<(violations: PredictabilityViolation[]) => void> = new Set()

  constructor() {
    this.config = {
      responseTimeTarget: 2000, // 2 segundos
      responseTimeVariance: 25, // 25% de variação permitida
      queueProcessingTime: 60000, // 1 minuto por item
      maxQueueLength: 20,
      consistencyThreshold: 85, // 85% de consistência
      reliabilityTarget: 95 // 95% de sucesso
    }

    this.startMonitoring()
  }

  static getInstance(): SystemPredictabilityManager {
    if (!this.instance) {
      this.instance = new SystemPredictabilityManager()
    }
    return this.instance
  }

  // Registrar tempo de resposta
  recordResponseTime(time: number): void {
    this.responseTimeHistory.push(time)
    
    // Manter apenas histórico recente (últimas 1000 requisições)
    if (this.responseTimeHistory.length > 1000) {
      this.responseTimeHistory.shift()
    }

    // Verificar violação de consistência
    this.checkResponseTimeConsistency(time)
  }

  // Registrar métricas de fila
  recordQueueMetrics(length: number, processingTime: number): void {
    this.queueHistory.push({ length, processingTime })
    
    // Manter apenas histórico recente
    if (this.queueHistory.length > 500) {
      this.queueHistory.shift()
    }

    // Verificar violação de consistência
    this.checkQueueConsistency(length, processingTime)
  }

  // Registrar disponibilidade de feature
  recordFeatureAvailability(feature: string, available: boolean): void {
    if (!this.featureHistory.has(feature)) {
      this.featureHistory.set(feature, [])
    }

    const history = this.featureHistory.get(feature)!
    history.push(available)
    
    // Manter apenas histórico recente
    if (history.length > 200) {
      history.shift()
    }

    // Verificar violação de consistência
    this.checkFeatureConsistency(feature, available)
  }

  // Verificar consistência de tempo de resposta
  private checkResponseTimeConsistency(currentTime: number): void {
    const target = this.config.responseTimeTarget
    const variance = this.config.responseTimeVariance / 100
    const maxAcceptable = target * (1 + variance)
    const minAcceptable = target * (1 - variance)

    if (currentTime > maxAcceptable) {
      const violation: PredictabilityViolation = {
        type: 'response_time',
        severity: currentTime > maxAcceptable * 2 ? 'critical' : 'high',
        description: 'Tempo de resposta acima do esperado',
        expected: `≤ ${target}ms (±${this.config.responseTimeVariance}%)`,
        actual: `${currentTime}ms`,
        impact: 'Usuários podem pensar que o sistema está lento ou quebrado',
        recommendation: currentTime > maxAcceptable * 2 ? 
          'Investigar gargalo imediatamente' : 
          'Monitorar performance e otimizar se persistir',
        timestamp: Date.now()
      }

      this.addViolation(violation)
    }
  }

  // Verificar consistência de fila
  private checkQueueConsistency(length: number, processingTime: number): void {
    // Verificar se a fila está crescendo anormalmente
    if (length > this.config.maxQueueLength) {
      const violation: PredictabilityViolation = {
        type: 'queue_processing',
        severity: length > this.config.maxQueueLength * 2 ? 'critical' : 'high',
        description: 'Fila de processamento muito longa',
        expected: `≤ ${this.config.maxQueueLength} itens`,
        actual: `${length} itens`,
        impact: 'Usuários podem pensar que o sistema travou ou que suas operações foram perdidas',
        recommendation: 'Aumentar capacidade de processamento ou implementar rate limit',
        timestamp: Date.now()
      }

      this.addViolation(violation)
    }

    // Verificar se tempo de processamento está consistente
    const expectedTime = this.config.queueProcessingTime
    const variance = expectedTime * 0.5 // 50% de variação permitida

    if (processingTime > expectedTime + variance) {
      const violation: PredictabilityViolation = {
        type: 'queue_processing',
        severity: processingTime > expectedTime * 2 ? 'high' : 'medium',
        description: 'Tempo de processamento de fila inconsistente',
        expected: `≈ ${expectedTime}ms (±50%)`,
        actual: `${processingTime}ms`,
        impact: 'Usuários não conseguem prever quanto tempo suas operações levarão',
        recommendation: 'Otimizar processamento ou ajustar expectativas via UI',
        timestamp: Date.now()
      }

      this.addViolation(violation)
    }
  }

  // Verificar consistência de feature
  private checkFeatureConsistency(feature: string, currentlyAvailable: boolean): void {
    const history = this.featureHistory.get(feature)
    if (!history || history.length < 10) return

    // Calcular taxa de disponibilidade recente
    const recentHistory = history.slice(-20)
    const availability = recentHistory.filter(available => available).length / recentHistory.length * 100

    // Se feature deveria estar disponível mas não está
    if (!currentlyAvailable && availability > 80) {
      const violation: PredictabilityViolation = {
        type: 'feature_availability',
        severity: 'high',
        description: `Feature ${feature} inesperadamente indisponível`,
        expected: 'Feature disponível (baseado no histórico)',
        actual: 'Feature indisponível',
        impact: 'Usuários podem pensar que o sistema tem bugs ou está quebrado',
        recommendation: 'Investigar causa da indisponibilidade e comunicar proativamente',
        timestamp: Date.now()
      }

      this.addViolation(violation)
    }
  }

  // Adicionar violação
  private addViolation(violation: PredictabilityViolation): void {
    // Verificar se violação similar já existe recentemente
    const recentSimilar = this.violations.find(v => 
      v.type === violation.type &&
      v.description === violation.description &&
      Date.now() - v.timestamp < 300000 // 5 minutos
    )

    if (!recentSimilar) {
      this.violations.push(violation)
      
      // Manter apenas violações recentes (última hora)
      const cutoff = Date.now() - (60 * 60 * 1000)
      this.violations = this.violations.filter(v => v.timestamp > cutoff)

      console.warn(`[Predictability] Violation: ${violation.description}`)
      
      // Notificar subscribers
      this.notifySubscribers()
    }
  }

  // Obter métricas de consistência
  getConsistencyMetrics(): ConsistencyMetrics {
    // Consistência de tempo de resposta
    const responseTimeConsistency = this.calculateResponseTimeConsistency()
    
    // Consistência de fila
    const queueConsistency = this.calculateQueueConsistency()
    
    // Consistência de features
    const featureConsistency = this.calculateFeatureConsistency()
    
    // Consistência de comportamento (baseada em violações)
    const behaviorConsistency = this.calculateBehaviorConsistency()
    
    // Consistência geral (média ponderada)
    const overallConsistency = (
      responseTimeConsistency * 0.3 +
      queueConsistency * 0.3 +
      featureConsistency * 0.2 +
      behaviorConsistency * 0.2
    )

    return {
      responseTimeConsistency,
      queueConsistency,
      featureConsistency,
      behaviorConsistency,
      overallConsistency
    }
  }

  // Calcular consistência de tempo de resposta
  private calculateResponseTimeConsistency(): number {
    if (this.responseTimeHistory.length < 10) return 100

    const target = this.config.responseTimeTarget
    const variance = this.config.responseTimeVariance / 100
    const maxAcceptable = target * (1 + variance)
    const minAcceptable = target * (1 - variance)

    const consistent = this.responseTimeHistory.filter(time => 
      time >= minAcceptable && time <= maxAcceptable
    ).length

    return (consistent / this.responseTimeHistory.length) * 100
  }

  // Calcular consistência de fila
  private calculateQueueConsistency(): number {
    if (this.queueHistory.length < 10) return 100

    const expectedTime = this.config.queueProcessingTime
    const variance = expectedTime * 0.5
    const minAcceptable = expectedTime - variance
    const maxAcceptable = expectedTime + variance

    const consistent = this.queueHistory.filter(item => 
      item.processingTime >= minAcceptable && 
      item.processingTime <= maxAcceptable &&
      item.length <= this.config.maxQueueLength
    ).length

    return (consistent / this.queueHistory.length) * 100
  }

  // Calcular consistência de features
  private calculateFeatureConsistency(): number {
    let totalConsistency = 0
    let featureCount = 0

    for (const [feature, history] of this.featureHistory) {
      if (history.length < 10) continue

      // Taxa de disponibilidade
      const availability = history.filter(available => available).length / history.length
      
      // Features críticas devem ter 95% de disponibilidade
      const criticalFeatures = ['pdf_processing', 'data_sync', 'dashboard']
      const expectedAvailability = criticalFeatures.includes(feature) ? 0.95 : 0.85
      
      totalConsistency += availability >= expectedAvailability ? 100 : (availability / expectedAvailability) * 100
      featureCount++
    }

    return featureCount > 0 ? totalConsistency / featureCount : 100
  }

  // Calcular consistência de comportamento
  private calculateBehaviorConsistency(): number {
    const recentViolations = this.violations.filter(v => 
      Date.now() - v.timestamp < (15 * 60 * 1000) // últimos 15 minutos
    )

    // Menos violações = mais consistência
    const highSeverityViolations = recentViolations.filter(v => 
      v.severity === 'high' || v.severity === 'critical'
    ).length

    const maxAcceptableViolations = 3 // no máximo 3 violações altas em 15 minutos
    
    if (highSeverityViolations <= maxAcceptableViolations) {
      return 100 - (highSeverityViolations / maxAcceptableViolations) * 20
    } else {
      return Math.max(0, 80 - (highSeverityViolations - maxAcceptableViolations) * 10)
    }
  }

  // Obter violações ativas
  getActiveViolations(): PredictabilityViolation[] {
    const cutoff = Date.now() - (15 * 60 * 1000) // últimos 15 minutos
    return this.violations.filter(v => v.timestamp > cutoff)
  }

  // Obter previsibilidade do sistema
  getSystemPredictability(): {
    score: number // 0-100
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const metrics = this.getConsistencyMetrics()
    const activeViolations = this.getActiveViolations()
    
    // Calcular score geral
    const score = metrics.overallConsistency
    
    // Determinar nível
    let level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    if (score >= 95) level = 'excellent'
    else if (score >= 85) level = 'good'
    else if (score >= 70) level = 'fair'
    else if (score >= 50) level = 'poor'
    else level = 'critical'
    
    // Identificar issues
    const issues: string[] = []
    
    if (metrics.responseTimeConsistency < 85) {
      issues.push('Tempos de resposta inconsistentes')
    }
    
    if (metrics.queueConsistency < 85) {
      issues.push('Processamento de fila imprevisível')
    }
    
    if (metrics.featureConsistency < 85) {
      issues.push('Features indisponíveis inesperadamente')
    }
    
    if (metrics.behaviorConsistency < 85) {
      issues.push('Comportamento do sistema instável')
    }
    
    // Gerar recomendações
    const recommendations: string[] = []
    
    if (score < 70) {
      recommendations.push('Investigar causas de inconsistência imediatamente')
      recommendations.push('Comunicar problemas aos usuários')
      recommendations.push('Implementar fallbacks mais robustos')
    } else if (score < 85) {
      recommendations.push('Monitorar padrões de inconsistência')
      recommendations.push('Otimizar operações variáveis')
    } else {
      recommendations.push('Manter monitoramento ativo')
      recommendations.push('Documentar padrões de comportamento')
    }
    
    return {
      score,
      level,
      issues,
      recommendations
    }
  }

  // Subscrever para violações
  subscribe(callback: (violations: PredictabilityViolation[]) => void): () => void {
    this.subscribers.add(callback)
    
    // Enviar violações atuais imediatamente
    callback(this.getActiveViolations())
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Notificar subscribers
  private notifySubscribers(): void {
    const activeViolations = this.getActiveViolations()
    this.subscribers.forEach(callback => {
      try {
        callback(activeViolations)
      } catch (error) {
        console.error('[Predictability] Error in subscriber callback:', error)
      }
    })
  }

  // Iniciar monitoramento
  private startMonitoring(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.performPredictabilityCheck()
      }, 30000) // Verificar a cada 30 segundos
    }
  }

  // Verificação de previsibilidade
  private performPredictabilityCheck(): void {
    const predictability = this.getSystemPredictability()
    
    if (predictability.level === 'critical') {
      console.error(`[Predictability] CRITICAL: System unpredictability detected (score: ${predictability.score})`)
      
      // Em produção, enviar alerta crítico
      this.sendPredictabilityAlert(predictability)
    }
  }

  // Enviar alerta de previsibilidade
  private sendPredictabilityAlert(predictability: any): void {
    // Em produção, integrar com sistema de alertas
    console.log(`[PredictabilityAlert] System unpredictability: ${predictability.level}`)
  }

  // Métodos de conveniência para ajuste de configuração
  updateConfig(newConfig: Partial<PredictabilityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('[Predictability] Config updated:', newConfig)
  }

  getCurrentConfig(): PredictabilityConfig {
    return { ...this.config }
  }
}

// Singleton global
export const systemPredictability = SystemPredictabilityManager.getInstance()

// Funções para uso fácil
export function recordResponseTime(time: number): void {
  systemPredictability.recordResponseTime(time)
}

export function recordQueueMetrics(length: number, processingTime: number): void {
  systemPredictability.recordQueueMetrics(length, processingTime)
}

export function recordFeatureAvailability(feature: string, available: boolean): void {
  systemPredictability.recordFeatureAvailability(feature, available)
}

export function getConsistencyMetrics(): ConsistencyMetrics {
  return systemPredictability.getConsistencyMetrics()
}

export function getSystemPredictability(): {
  score: number
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  issues: string[]
  recommendations: string[]
} {
  return systemPredictability.getSystemPredictability()
}

export function getActiveViolations(): PredictabilityViolation[] {
  return systemPredictability.getActiveViolations()
}

export function subscribeToViolations(
  callback: (violations: PredictabilityViolation[]) => void
): () => void {
  return systemPredictability.subscribe(callback)
}
