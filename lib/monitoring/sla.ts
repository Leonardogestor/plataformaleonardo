import { metricsCollector } from "./metrics"
import { pipelineLogger } from "@/lib/utils/logger"

export interface SLADefinition {
  name: string
  target: number // Valor alvo (ex: 95%)
  threshold: number // Limite crítico (ex: 90%)
  unit: string // Unidade (%, ms, etc.)
  period: number // Período em minutos
}

export interface SLAViolation {
  sla: string
  currentValue: number
  target: number
  threshold: number
  violationTime: Date
  severity: "CRITICAL" | "WARNING" | "INFO"
  duration?: number // Duração da violação
}

export class SLAMonitor {
  private slaDefinitions: Map<string, SLADefinition> = new Map()
  private activeViolations: Map<string, SLAViolation> = new Map()
  private violationHistory: SLAViolation[] = []
  private readonly MAX_VIOLATION_HISTORY = 1000

  constructor() {
    this.initializeSLADefinitions()
  }

  /**
   * Inicializa definições de SLA
   */
  private initializeSLADefinitions(): void {
    // Processing Time SLA
    this.slaDefinitions.set("processing_time_ms", {
      name: "processing_time_ms",
      target: 5000, // 5 segundos
      threshold: 10000, // 10 segundos
      unit: "ms",
      period: 60, // 1 hora
    })

    // Success Rate SLA
    this.slaDefinitions.set("success_rate", {
      name: "success_rate",
      target: 0.95, // 95%
      threshold: 0.9, // 90%
      unit: "%",
      period: 60, // 1 hora
    })

    // Error Rate SLA
    this.slaDefinitions.set("error_rate", {
      name: "error_rate",
      target: 0.05, // 5%
      threshold: 0.1, // 10%
      unit: "%",
      period: 60, // 1 hora
    })

    // Queue Depth SLA
    this.slaDefinitions.set("queue_depth", {
      name: "queue_depth",
      target: 100, // 100 jobs
      threshold: 500, // 500 jobs
      unit: "jobs",
      period: 15, // 15 minutos
    })

    // AI Response Time SLA
    this.slaDefinitions.set("ai_response_time", {
      name: "ai_response_time",
      target: 3000, // 3 segundos
      threshold: 8000, // 8 segundos
      unit: "ms",
      period: 30, // 30 minutos
    })
  }

  /**
   * Verifica todos os SLAs
   */
  async checkAllSLAs(): Promise<SLAViolation[]> {
    const violations: SLAViolation[] = []
    const now = new Date()

    for (const [slaName, definition] of this.slaDefinitions) {
      const violation = await this.checkSLA(slaName, definition, now)
      if (violation) {
        violations.push(violation)
      }
    }

    return violations
  }

  /**
   * Verifica um SLA específico
   */
  private async checkSLA(
    slaName: string,
    definition: SLADefinition,
    now: Date
  ): Promise<SLAViolation | null> {
    try {
      const currentValue = await this.getSLAValue(slaName, definition.period)

      if (currentValue === null) {
        return null
      }

      const violation = this.evaluateSLAViolation(slaName, definition, currentValue, now)

      if (violation) {
        this.handleViolation(violation)
      } else {
        this.clearViolation(slaName)
      }

      return violation
    } catch (error: any) {
      pipelineLogger.error("Failed to check SLA", {
        sla: slaName,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Obtém valor atual do SLA
   */
  private async getSLAValue(slaName: string, periodMinutes: number): Promise<number | null> {
    const cutoffTime = Date.now() - periodMinutes * 60 * 1000
    const cutoff = new Date(cutoffTime)

    switch (slaName) {
      case "processing_time_ms": {
        const metrics = metricsCollector.getMetrics("processing_time_ms", 100)
        const recentMetrics = metrics.filter((m) => m.timestamp >= cutoff)

        if (recentMetrics.length === 0) return null

        const values = recentMetrics.map((m) => Number(m.value))
        return this.calculatePercentile(values, 95) // P95
      }

      case "success_rate": {
        const kpis = metricsCollector.getKPIs()
        const successRate = parseFloat(kpis.pipeline_success_rate_24h)

        return successRate
      }

      case "error_rate": {
        const kpis = metricsCollector.getKPIs()
        const errorRate = parseFloat(kpis.error_rate_24h)

        return errorRate
      }

      case "queue_depth": {
        // Implementar verificação de tamanho da fila
        // Isso precisaria de integração com a fila
        return 50 // Placeholder
      }

      case "ai_response_time": {
        const metrics = metricsCollector.getMetrics("ai_response_time", 100)
        const recentMetrics = metrics.filter((m) => m.timestamp >= cutoff)

        if (recentMetrics.length === 0) return null

        const values = recentMetrics.map((m) => Number(m.value))
        return this.calculatePercentile(values, 95)
      }

      default:
        return null
    }
  }

  /**
   * Avalia se há violação do SLA
   */
  private evaluateSLAViolation(
    slaName: string,
    definition: SLADefinition,
    currentValue: number,
    now: Date
  ): SLAViolation | null {
    const isViolating = slaName.includes("rate")
      ? currentValue > definition.threshold
      : currentValue < definition.target

    if (!isViolating) {
      return null
    }

    const severity = this.calculateSeverity(slaName, definition, currentValue)
    const existingViolation = this.activeViolations.get(slaName)

    if (existingViolation) {
      // Atualizar violação existente
      existingViolation.currentValue = currentValue
      existingViolation.duration = now.getTime() - existingViolation.violationTime.getTime()

      return existingViolation
    }

    return {
      sla: slaName,
      currentValue,
      target: definition.target,
      threshold: definition.threshold,
      violationTime: now,
      severity,
      duration: 0,
    }
  }

  /**
   * Calcula severidade da violação
   */
  private calculateSeverity(
    slaName: string,
    definition: SLADefinition,
    currentValue: number
  ): "CRITICAL" | "WARNING" | "INFO" {
    if (slaName.includes("processing_time") || slaName.includes("response_time")) {
      // Tempo: maior que threshold = CRITICAL
      return currentValue > definition.threshold ? "CRITICAL" : "WARNING"
    }

    if (slaName.includes("success_rate")) {
      // Success rate: menor que threshold = CRITICAL
      return currentValue < definition.threshold ? "CRITICAL" : "WARNING"
    }

    if (slaName.includes("error_rate")) {
      // Error rate: maior que threshold = CRITICAL
      return currentValue > definition.threshold ? "CRITICAL" : "WARNING"
    }

    return "WARNING"
  }

  /**
   * Lida com violação ativa
   */
  private handleViolation(violation: SLAViolation): void {
    this.activeViolations.set(violation.sla, violation)

    // Adicionar ao histórico
    this.violationHistory.push(violation)
    if (this.violationHistory.length > this.MAX_VIOLATION_HISTORY) {
      this.violationHistory.shift()
    }

    // Log da violação
    pipelineLogger.error("SLA Violation", {
      sla: violation.sla,
      currentValue: violation.currentValue,
      target: violation.target,
      threshold: violation.threshold,
      severity: violation.severity,
      duration: violation.duration,
    })

    // Disparar alerta
    this.triggerAlert(violation)
  }

  /**
   * Limpa violação resolvida
   */
  private clearViolation(slaName: string): void {
    const violation = this.activeViolations.get(slaName)

    if (violation) {
      pipelineLogger.info("SLA Violation Resolved", {
        sla: slaName,
        duration: violation.duration,
        severity: violation.severity,
      })

      this.activeViolations.delete(slaName)
    }
  }

  /**
   * Dispara alerta de violação
   */
  private triggerAlert(violation: SLAViolation): void {
    // Implementar integração com sistema de alertas
    // Por enquanto, apenas log
    pipelineLogger.error("SLA Alert Triggered", {
      type: "sla_violation",
      severity: violation.severity,
      sla: violation.sla,
      message: `SLA ${violation.sla} violated: ${violation.currentValue} ${violation.severity === "CRITICAL" ? ">" : "<"} ${violation.threshold}`,
      timestamp: violation.violationTime.toISOString(),
    })

    // TODO: Implementar webhook/email/Slack
    // await this.sendAlert(violation)
  }

  /**
   * Calcula percentil
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)] || 0
  }

  /**
   * Obtém status atual dos SLAs
   */
  getSLAStatus(): Record<string, any> {
    const status: Record<string, any> = {}

    for (const [slaName, definition] of this.slaDefinitions) {
      const violation = this.activeViolations.get(slaName)

      status[slaName] = {
        definition,
        currentViolation: violation || null,
        status: violation ? "VIOLATING" : "COMPLIANT",
        lastCheck: new Date(),
      }
    }

    return status
  }

  /**
   * Obtém histórico de violações
   */
  getViolationHistory(hours: number = 24): SLAViolation[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000
    const cutoff = new Date(cutoffTime)

    return this.violationHistory.filter((v) => v.violationTime >= cutoff)
  }

  /**
   * Obtém métricas de compliance
   */
  getComplianceMetrics(): any {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const totalViolations = this.violationHistory.filter((v) => v.violationTime >= last24Hours)
    const criticalViolations = totalViolations.filter((v) => v.severity === "CRITICAL")
    const warningViolations = totalViolations.filter((v) => v.severity === "WARNING")

    const activeViolations = Array.from(this.activeViolations.values())
    const activeCritical = activeViolations.filter((v) => v.severity === "CRITICAL").length

    return {
      total_violations_24h: totalViolations.length,
      critical_violations_24h: criticalViolations.length,
      warning_violations_24h: warningViolations.length,
      active_violations: activeViolations.length,
      active_critical: activeCritical,
      compliance_rate:
        totalViolations.length > 0 ? ((24 - totalViolations.length) / 24) * 100 : 100,
      worst_sla: this.getWorstSLA(),
      avg_violation_duration: this.calculateAverageViolationDuration(),
    }
  }

  /**
   * Identifica pior SLA violado
   */
  private getWorstSLA(): string | null {
    const violations = Array.from(this.activeViolations.values())

    if (violations.length === 0) return null

    const criticalViolations = violations.filter((v) => v.severity === "CRITICAL")
    if (criticalViolations.length > 0) {
      return criticalViolations[0]?.sla || "processing_time_ms"
    }

    return violations[0]?.sla || "processing_time_ms"
  }

  /**
   * Calcula duração média das violações
   */
  private calculateAverageViolationDuration(): number {
    const violations = this.violationHistory.slice(-100) // Últimas 100 violações
    const durations = violations.filter((v) => v.duration !== undefined).map((v) => v.duration!)

    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  }
}

// Singleton para uso global
export const slaMonitor = new SLAMonitor()
