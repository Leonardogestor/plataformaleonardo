/**
 * Estados do Sistema - Clareza Total para o Usuário
 * Padronização de comportamentos e comunicação visual
 */

export enum SystemState {
  NORMAL = 'normal',
  SLOW = 'slow',
  LIMITED = 'limited',
  UNAVAILABLE = 'unavailable'
}

export interface SystemStateConfig {
  name: string
  description: string
  userMessage: string
  visualIndicators: {
    color: string
    icon: string
    animation?: string
  }
  behavior: {
    features: Record<string, 'full' | 'limited' | 'disabled'>
    performance: 'fast' | 'slow' | 'very_slow'
    reliability: 'high' | 'medium' | 'low'
  }
  thresholds: {
    responseTime: number // ms
    errorRate: number // %
    queueLength: number
    serviceAvailability: number // %
  }
  actions: string[]
}

class SystemStateManager {
  private static instance: SystemStateManager
  private currentState: SystemState = SystemState.NORMAL
  private stateHistory: Array<{
    state: SystemState
    timestamp: number
    reason: string
    metrics: Record<string, number>
  }> = []
  private subscribers: Set<(state: SystemState, config: SystemStateConfig) => void> = new Set()

  private stateConfigs: Record<SystemState, SystemStateConfig> = {
    [SystemState.NORMAL]: {
      name: 'Normal',
      description: 'Sistema operando normalmente',
      userMessage: 'Tudo funcionando perfeitamente!',
      visualIndicators: {
        color: 'green',
        icon: '✅'
      },
      behavior: {
        features: {
          pdf_processing: 'full',
          ai_analysis: 'full',
          data_sync: 'full',
          dashboard: 'full'
        },
        performance: 'fast',
        reliability: 'high'
      },
      thresholds: {
        responseTime: 1000,
        errorRate: 2,
        queueLength: 5,
        serviceAvailability: 95
      },
      actions: [
        'Monitorar métricas',
        'Manter performance otimizada',
        'Verificar saúde dos serviços'
      ]
    },

    [SystemState.SLOW]: {
      name: 'Lento',
      description: 'Sistema respondendo lentamente',
      userMessage: 'O sistema está mais lento que o normal, mas continua funcionando.',
      visualIndicators: {
        color: 'yellow',
        icon: '🐌',
        animation: 'pulse'
      },
      behavior: {
        features: {
          pdf_processing: 'limited',
          ai_analysis: 'limited',
          data_sync: 'full',
          dashboard: 'full'
        },
        performance: 'slow',
        reliability: 'medium'
      },
      thresholds: {
        responseTime: 3000,
        errorRate: 5,
        queueLength: 15,
        serviceAvailability: 85
      },
      actions: [
        'Aumentar timeouts',
        'Limitar operações pesadas',
        'Notificar usuários sobre lentidão',
        'Investigar causa da lentidão'
      ]
    },

    [SystemState.LIMITED]: {
      name: 'Limitado',
      description: 'Funcionalidades limitadas para manter estabilidade',
      userMessage: 'Algumas funcionalidades estão temporariamente limitadas para garantir estabilidade.',
      visualIndicators: {
        color: 'orange',
        icon: '⚠️',
        animation: 'bounce'
      },
      behavior: {
        features: {
          pdf_processing: 'disabled',
          ai_analysis: 'limited',
          data_sync: 'limited',
          dashboard: 'full'
        },
        performance: 'slow',
        reliability: 'medium'
      },
      thresholds: {
        responseTime: 5000,
        errorRate: 10,
        queueLength: 30,
        serviceAvailability: 70
      },
      actions: [
        'Desativar features não essenciais',
        'Limitar taxa de requisições',
        'Usar cache agressivamente',
        'Priorizar operações críticas'
      ]
    },

    [SystemState.UNAVAILABLE]: {
      name: 'Indisponível',
      description: 'Serviços críticos indisponíveis',
      userMessage: 'Estamos enfrentando dificuldades técnicas. Funcionalidades essenciais mantidas.',
      visualIndicators: {
        color: 'red',
        icon: '🚨',
        animation: 'flash'
      },
      behavior: {
        features: {
          pdf_processing: 'disabled',
          ai_analysis: 'disabled',
          data_sync: 'disabled',
          dashboard: 'limited'
        },
        performance: 'very_slow',
        reliability: 'low'
      },
      thresholds: {
        responseTime: 10000,
        errorRate: 20,
        queueLength: 50,
        serviceAvailability: 50
      },
      actions: [
        'Modo emergência',
        'Apenas funcionalidades críticas',
        'Fallbacks máximos',
        'Comunicação proativa'
      ]
    }
  }

  constructor() {
    this.startStateMonitoring()
  }

  static getInstance(): SystemStateManager {
    if (!this.instance) {
      this.instance = new SystemStateManager()
    }
    return this.instance
  }

  // Atualizar estado do sistema
  updateState(newState: SystemState, reason: string, metrics: Record<string, number>): void {
    const oldState = this.currentState
    
    if (newState !== oldState) {
      this.currentState = newState
      
      // Registrar no histórico
      this.stateHistory.push({
        state: newState,
        timestamp: Date.now(),
        reason,
        metrics
      })
      
      // Manter apenas histórico recente (últimas 24 horas)
      const cutoff = Date.now() - (24 * 60 * 60 * 1000)
      this.stateHistory = this.stateHistory.filter(entry => entry.timestamp > cutoff)
      
      console.log(`[SystemState] ${oldState} → ${newState}: ${reason}`)
      
      // Notificar subscribers
      this.notifySubscribers()
    }
  }

  // Obter estado atual
  getCurrentState(): SystemState {
    return this.currentState
  }

  // Obter configuração do estado atual
  getCurrentConfig(): SystemStateConfig {
    return this.stateConfigs[this.currentState]
  }

  // Verificar se feature está disponível
  isFeatureAvailable(feature: string): boolean {
    const config = this.getCurrentConfig()
    const availability = config.behavior.features[feature]
    return availability !== 'disabled'
  }

  // Verificar se feature está limitada
  isFeatureLimited(feature: string): boolean {
    const config = this.getCurrentConfig()
    const availability = config.behavior.features[feature]
    return availability === 'limited'
  }

  // Obter mensagem para usuário
  getUserMessage(): string {
    return this.getCurrentConfig().userMessage
  }

  // Obter indicadores visuais
  getVisualIndicators(): {
    color: string
    icon: string
    animation?: string
  } {
    return this.getCurrentConfig().visualIndicators
  }

  // Avaliar estado baseado em métricas
  evaluateState(metrics: {
    avgResponseTime: number
    errorRate: number
    queueLength: number
    serviceAvailability: number
  }): SystemState {
    // Verificar UNAVAILABLE primeiro
    if (
      metrics.serviceAvailability < 50 ||
      metrics.errorRate > 20 ||
      metrics.avgResponseTime > 10000 ||
      metrics.queueLength > 50
    ) {
      return SystemState.UNAVAILABLE
    }

    // Verificar LIMITED
    if (
      metrics.serviceAvailability < 70 ||
      metrics.errorRate > 10 ||
      metrics.avgResponseTime > 5000 ||
      metrics.queueLength > 30
    ) {
      return SystemState.LIMITED
    }

    // Verificar SLOW
    if (
      metrics.serviceAvailability < 85 ||
      metrics.errorRate > 5 ||
      metrics.avgResponseTime > 3000 ||
      metrics.queueLength > 15
    ) {
      return SystemState.SLOW
    }

    // Verificar NORMAL
    if (
      metrics.serviceAvailability >= 95 &&
      metrics.errorRate <= 2 &&
      metrics.avgResponseTime <= 1000 &&
      metrics.queueLength <= 5
    ) {
      return SystemState.NORMAL
    }

    // Se não encaixar em nenhum, manter estado atual
    return this.currentState
  }

  // Subscrever para mudanças de estado
  subscribe(callback: (state: SystemState, config: SystemStateConfig) => void): () => void {
    this.subscribers.add(callback)
    
    // Enviar estado atual imediatamente
    callback(this.currentState, this.getCurrentConfig())
    
    // Retornar função de unsubscribe
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Obter histórico de estados
  getStateHistory(): Array<{
    state: SystemState
    timestamp: number
    reason: string
    metrics: Record<string, number>
  }> {
    return [...this.stateHistory]
  }

  // Obter estatísticas de estados
  getStateStatistics(): {
    currentState: SystemState
    timeInCurrentState: number
    stateDistribution: Record<SystemState, number> // percentual
    lastStateChange: number
    totalStateChanges: number
  } {
    const now = Date.now()
    const lastChange = this.stateHistory[this.stateHistory.length - 1]
    
    // Calcular tempo no estado atual
    const timeInCurrentState = lastChange ? now - lastChange.timestamp : now
    
    // Calcular distribuição de estados
    const stateCounts: Record<SystemState, number> = {
      [SystemState.NORMAL]: 0,
      [SystemState.SLOW]: 0,
      [SystemState.LIMITED]: 0,
      [SystemState.UNAVAILABLE]: 0
    }
    
    let totalTime = 0
    let previousTimestamp = this.stateHistory[0]?.timestamp || now
    
    this.stateHistory.forEach((entry, index) => {
      const duration = index === 0 ? 
        (entry.timestamp - previousTimestamp) :
        (entry.timestamp - previousTimestamp)
      
      stateCounts[entry.state] += duration
      totalTime += duration
      previousTimestamp = entry.timestamp
    })
    
    // Adicionar tempo do estado atual
    stateCounts[this.currentState] += timeInCurrentState
    totalTime += timeInCurrentState
    
    // Calcular percentuais
    const stateDistribution: Record<SystemState, number> = {
      [SystemState.NORMAL]: 0,
      [SystemState.SLOW]: 0,
      [SystemState.LIMITED]: 0,
      [SystemState.UNAVAILABLE]: 0
    }
    
    if (totalTime > 0) {
      Object.keys(stateCounts).forEach(state => {
        stateDistribution[state as SystemState] = (stateCounts[state as SystemState] / totalTime) * 100
      })
    }
    
    return {
      currentState: this.currentState,
      timeInCurrentState,
      stateDistribution,
      lastStateChange: lastChange?.timestamp || now,
      totalStateChanges: this.stateHistory.length
    }
  }

  // Notificar subscribers
  private notifySubscribers(): void {
    const config = this.getCurrentConfig()
    this.subscribers.forEach(callback => {
      try {
        callback(this.currentState, config)
      } catch (error) {
        console.error('[SystemState] Error in subscriber callback:', error)
      }
    })
  }

  // Iniciar monitoramento automático
  private startStateMonitoring(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.checkAndUpdateState()
      }, 30000) // Verificar a cada 30 segundos
    }
  }

  // Verificar e atualizar estado baseado em métricas atuais
  private checkAndUpdateState(): void {
    // Em produção, estas métricas viriam do sistema de monitoramento
    const mockMetrics = {
      avgResponseTime: Math.random() * 2000 + 500,
      errorRate: Math.random() * 5,
      queueLength: Math.floor(Math.random() * 10),
      serviceAvailability: 95 + Math.random() * 5
    }
    
    const evaluatedState = this.evaluateState(mockMetrics)
    
    if (evaluatedState !== this.currentState) {
      this.updateState(evaluatedState, 'Automatic evaluation', mockMetrics)
    }
  }
}

// Singleton global
export const systemStateManager = SystemStateManager.getInstance()

// Funções para uso fácil
export function getSystemState(): SystemState {
  return systemStateManager.getCurrentState()
}

export function getSystemConfig(): SystemStateConfig {
  return systemStateManager.getCurrentConfig()
}

export function isFeatureAvailable(feature: string): boolean {
  return systemStateManager.isFeatureAvailable(feature)
}

export function isFeatureLimited(feature: string): boolean {
  return systemStateManager.isFeatureLimited(feature)
}

export function getSystemMessage(): string {
  return systemStateManager.getUserMessage()
}

export function getSystemVisuals(): {
  color: string
  icon: string
  animation?: string
} {
  return systemStateManager.getVisualIndicators()
}
