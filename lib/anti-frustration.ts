/**
 * Anti-Frustração - Evita que usuário pense "bugou", "travou", "não funcionou"
 * Feedback visual, mensagens claras, estados intermediários
 */

export interface FrustrationPoint {
  id: string
  type: "loading" | "processing" | "waiting" | "error" | "uncertainty"
  severity: "low" | "medium" | "high" | "critical"
  trigger: string
  userThought: string // O que o usuário pode pensar
  solution: string // Como resolver
  implementation: string // Como implementar
}

export interface AntiFrustrationConfig {
  showProgress: boolean
  showEstimatedTime: boolean
  showStatus: boolean
  allowCancellation: boolean
  provideAlternatives: boolean
  communicationStyle: "reassuring" | "informative" | "proactive"
}

class AntiFrustrationManager {
  private static instance: AntiFrustrationManager
  private frustrationPoints: Map<string, FrustrationPoint> = new Map()
  private activeMitigations: Map<string, string> = new Map()
  private config: AntiFrustrationConfig

  constructor() {
    this.config = {
      showProgress: true,
      showEstimatedTime: true,
      showStatus: true,
      allowCancellation: true,
      provideAlternatives: true,
      communicationStyle: "reassuring",
    }

    this.initializeFrustrationPoints()
  }

  static getInstance(): AntiFrustrationManager {
    if (!this.instance) {
      this.instance = new AntiFrustrationManager()
    }
    return this.instance
  }

  private initializeFrustrationPoints(): void {
    // Pontos de frustração identificados
    const points: FrustrationPoint[] = [
      {
        id: "pdf_upload_silent",
        type: "uncertainty",
        severity: "high",
        trigger: "Upload de PDF sem feedback",
        userThought: "O upload não funcionou? O arquivo foi perdido?",
        solution: "Mostrar progresso real e status claro",
        implementation: "ProgressBar + StatusMessage + QueuePosition",
      },
      {
        id: "long_processing_no_feedback",
        type: "uncertainty",
        severity: "high",
        trigger: "Processamento longo sem indicadores",
        userThought: "O sistema travou? Está funcionando?",
        solution: "Indicadores de progresso e tempo estimado",
        implementation: "CircularProgress + EstimatedTime + Heartbeat",
      },
      {
        id: "sudden_error",
        type: "error",
        severity: "critical",
        trigger: "Erro técnico inesperado",
        userThought: "Buguei! O sistema está quebrado!",
        solution: "Mensagem amigável com ação clara",
        implementation: "FriendlyErrorMessage + RetryButton + AlternativeAction",
      },
      {
        id: "infinite_loading",
        type: "loading",
        severity: "high",
        trigger: "Loading infinito sem progresso",
        userThought: "Vai carregar para sempre? Travou?",
        solution: "Loading com progresso e timeout",
        implementation: "SkeletonLoader + ProgressBar + TimeoutMessage",
      },
      {
        id: "queue_position_unknown",
        type: "waiting",
        severity: "medium",
        trigger: "Fila sem posição visível",
        userThought: "Estou na fila? Quando será minha vez?",
        solution: "Mostrar posição e tempo estimado",
        implementation: "QueueIndicator + PositionBadge + EstimatedWait",
      },
      {
        id: "feature_suddenly_disabled",
        type: "uncertainty",
        severity: "medium",
        trigger: "Feature desabilitada sem aviso",
        userThought: "Por que parou de funcionar? Era bug?",
        solution: "Comunicar mudança claramente",
        implementation: "FeatureBanner + StatusMessage + Explanation",
      },
      {
        id: "slow_response_no_indication",
        type: "loading",
        severity: "medium",
        trigger: "Resposta lenta sem indicador",
        userThought: "Está lento ou não funcionando?",
        solution: "Indicador de lentidão",
        implementation: "SlowResponseIndicator + ReassuranceMessage",
      },
      {
        id: "operation_cancelled_silently",
        type: "uncertainty",
        severity: "high",
        trigger: "Operação cancelada sem aviso",
        userThought: "O que aconteceu? Perdi meu trabalho?",
        solution: "Notificar cancelamento claramente",
        implementation: "CancellationNotice + DataRecoveryOption",
      },
      {
        id: "inconsistent_state",
        type: "uncertainty",
        severity: "high",
        trigger: "Estado inconsistente na UI",
        userThought: "O sistema está confuso? Qual é o estado real?",
        solution: "Manter consistência visual",
        implementation: "StateSynchronization + LoadingStates",
      },
      {
        id: "no_retry_option",
        type: "error",
        severity: "medium",
        trigger: "Erro sem opção de retry",
        userThought: "Tenho que começar tudo de novo?",
        solution: "Oferecer retry com contexto",
        implementation: "RetryButton + ContextPreservation",
      },
    ]

    points.forEach((point) => {
      this.frustrationPoints.set(point.id, point)
    })
  }

  // Detectar ponto de frustração
  detectFrustration(trigger: string): FrustrationPoint | null {
    if (!trigger) return null

    for (const point of this.frustrationPoints.values()) {
      if (
        trigger.includes(point.trigger.toLowerCase()) ||
        point.trigger.toLowerCase().includes(trigger)
      ) {
        return point
      }
    }
    return null
  }

  // Ativar mitigação para ponto de frustração
  activateMitigation(pointId: string, context?: any): string {
    const point = this.frustrationPoints.get(pointId)
    if (!point) return ""

    const mitigationId = `mitigation_${pointId}_${Date.now()}`

    // Gerar mensagem de mitigação
    const message = this.generateMitigationMessage(point, context)

    // Armazenar mitigação ativa
    this.activeMitigations.set(mitigationId, message)

    // Remover após tempo apropriado
    setTimeout(() => {
      this.activeMitigations.delete(mitigationId)
    }, this.getMitigationDuration(point))

    console.log(`[AntiFrustration] Activated mitigation for ${pointId}: ${message}`)

    return message
  }

  // Gerar mensagem de mitigação
  private generateMitigationMessage(point: FrustrationPoint, context?: any): string {
    const style = this.config.communicationStyle

    switch (point.type) {
      case "loading":
        if (style === "reassuring") {
          return "Estamos processando sua solicitação. Isso pode levar alguns instantes."
        } else if (style === "informative") {
          return "Processando... Por favor, aguarde."
        } else {
          return "Sua operação está em andamento."
        }

      case "processing":
        if (style === "reassuring") {
          return "Seus dados estão sendo processados com segurança. Quase pronto!"
        } else if (style === "informative") {
          return "Processando seus dados..."
        } else {
          return "Operação em progresso."
        }

      case "waiting":
        if (style === "reassuring") {
          return "Você está na fila. Sua vez chegará em breve. Agradecemos a paciência!"
        } else if (style === "informative") {
          return "Aguardando processamento..."
        } else {
          return "Posicionado na fila."
        }

      case "error":
        if (style === "reassuring") {
          return "Ocorreu uma dificuldade, mas podemos resolver. Tente novamente ou contate o suporte."
        } else if (style === "informative") {
          return "Erro detectado. Por favor, tente novamente."
        } else {
          return "Erro na operação."
        }

      case "uncertainty":
        if (style === "reassuring") {
          return "Entendemos a incerteza. Estamos verificando o status para você."
        } else if (style === "informative") {
          return "Verificando status..."
        } else {
          return "Status desconhecido."
        }

      default:
        return "Processando..."
    }
  }

  // Obter duração da mitigação
  private getMitigationDuration(point: FrustrationPoint): number {
    switch (point.severity) {
      case "critical":
        return 30000 // 30 segundos
      case "high":
        return 20000 // 20 segundos
      case "medium":
        return 15000 // 15 segundos
      case "low":
        return 10000 // 10 segundos
      default:
        return 15000
    }
  }

  // Obter mitigações ativas
  getActiveMitigations(): Array<{ id: string; message: string; timestamp: number }> {
    const mitigations = []

    for (const [id, message] of this.activeMitigations) {
      mitigations.push({
        id,
        message,
        timestamp: parseInt(id.split("_")[2] || "0"),
      })
    }

    return mitigations.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Verificar se mitigação está ativa
  isMitigationActive(pointId: string): boolean {
    for (const id of this.activeMitigations.keys()) {
      if (id.includes(pointId)) {
        return true
      }
    }
    return false
  }

  // Obter todos os pontos de frustração
  getFrustrationPoints(): FrustrationPoint[] {
    return Array.from(this.frustrationPoints.values())
  }

  // Obter pontos de frustração por severidade
  getFrustrationPointsBySeverity(
    severity: "low" | "medium" | "high" | "critical"
  ): FrustrationPoint[] {
    return Array.from(this.frustrationPoints.values()).filter(
      (point) => point.severity === severity
    )
  }

  // Obter recomendações anti-frustração
  getRecommendations(): Array<{
    point: string
    priority: "high" | "medium" | "low"
    recommendation: string
    implementation: string
  }> {
    const recommendations = []

    for (const point of this.frustrationPoints.values()) {
      let priority: "high" | "medium" | "low"

      if (point.severity === "critical") {
        priority = "high"
      } else if (point.severity === "high") {
        priority = "medium"
      } else {
        priority = "low"
      }

      recommendations.push({
        point: point.id,
        priority,
        recommendation: point.solution,
        implementation: point.implementation,
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // Atualizar configuração
  updateConfig(newConfig: Partial<AntiFrustrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log("[AntiFrustration] Config updated:", newConfig)
  }

  // Obter configuração atual
  getConfig(): AntiFrustrationConfig {
    return { ...this.config }
  }

  // Verificar se implementação está completa
  checkImplementationCompleteness(): {
    score: number // 0-100
    missing: string[]
    implemented: string[]
  } {
    const requiredImplementations = [
      "ProgressBar + StatusMessage + QueuePosition",
      "CircularProgress + EstimatedTime + Heartbeat",
      "FriendlyErrorMessage + RetryButton + AlternativeAction",
      "SkeletonLoader + ProgressBar + TimeoutMessage",
      "QueueIndicator + PositionBadge + EstimatedWait",
      "FeatureBanner + StatusMessage + Explanation",
      "SlowResponseIndicator + ReassuranceMessage",
      "CancellationNotice + DataRecoveryOption",
      "StateSynchronization + LoadingStates",
      "RetryButton + ContextPreservation",
    ]

    // Em produção, verificar o que está implementado
    const implemented = requiredImplementations // Simulação - na prática verificaria o código

    const missing = requiredImplementations.filter((impl) => !implemented.includes(impl))
    const score = (implemented.length / requiredImplementations.length) * 100

    return {
      score,
      missing,
      implemented,
    }
  }

  // Gerar checklist de anti-frustração
  generateAntiFrustrationChecklist(): {
    critical: string[]
    high: string[]
    medium: string[]
    low: string[]
  } {
    const checklist = {
      critical: [] as string[],
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[],
    }

    for (const point of this.frustrationPoints.values()) {
      const item = `✓ ${point.solution} (${point.implementation})`

      switch (point.severity) {
        case "critical":
          checklist.critical.push(item)
          break
        case "high":
          checklist.high.push(item)
          break
        case "medium":
          checklist.medium.push(item)
          break
        case "low":
          checklist.low.push(item)
          break
      }
    }

    return checklist
  }
}

// Singleton global
export const antiFrustration = AntiFrustrationManager.getInstance()

// Funções para uso fácil
export function detectAndMitigateFrustration(trigger: string | undefined, context?: any): string {
  if (!trigger) return ""

  const point = antiFrustration.detectFrustration(trigger)
  if (point) {
    return antiFrustration.activateMitigation(point.id, context)
  }
  return ""
}

export function getActiveMitigations(): Array<{ id: string; message: string; timestamp: number }> {
  return antiFrustration.getActiveMitigations()
}

export function getFrustrationRecommendations(): Array<{
  point: string
  priority: "high" | "medium" | "low"
  recommendation: string
  implementation: string
}> {
  return antiFrustration.getRecommendations()
}

export function checkAntiFrustrationImplementation(): {
  score: number
  missing: string[]
  implemented: string[]
} {
  return antiFrustration.checkImplementationCompleteness()
}

// Wrappers para cenários comuns
export function handleUploadStart(): string {
  return detectAndMitigateFrustration("pdf_upload_silent", {
    fileName: "document.pdf",
    fileSize: "2.3MB",
  })
}

export function handleLongProcessing(): string {
  return detectAndMitigateFrustration("long_processing_no_feedback", {
    operation: "PDF Processing",
    estimatedTime: 45000,
  })
}

export function handleQueuePosition(position: number, total: number): string {
  return detectAndMitigateFrustration("queue_position_unknown", {
    position,
    total,
    estimatedWait: position * 30000,
  })
}

export function handleSlowResponse(): string {
  return detectAndMitigateFrustration("slow_response_no_indication", {
    responseTime: 4500,
    operation: "Data Loading",
  })
}

export function handleError(error: Error, operation: string): string {
  return detectAndMitigateFrustration("sudden_error", {
    error: error.message,
    operation,
    canRetry: true,
  })
}

export function handleFeatureDisabled(feature: string): string {
  return detectAndMitigateFrustration("feature_suddenly_disabled", {
    feature,
    reason: "System maintenance",
    eta: "15 minutes",
  })
}
