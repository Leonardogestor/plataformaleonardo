/**
 * Monitoramento Inteligente - Detecção de Padrões e Alertas Críticos
 * Foco em erros reais vs ruído, priorização automatizada
 */

import { logger } from "./logger"

// Função para obter Sentry (compatível com monitor.ts)
function getSentry() {
  try {
    return require("@sentry/nextjs")
  } catch {
    return null
  }
}

export interface AlertRule {
  name: string
  condition: (error: any, context: any) => boolean
  severity: "low" | "medium" | "high" | "critical"
  cooldown: number // ms entre alertas do mesmo tipo
  action: (error: any, context: any) => void
}

export interface ErrorPattern {
  type: string
  frequency: number
  lastOccurrence: number
  severity: "low" | "medium" | "high" | "critical"
  context: Record<string, any>
  count: number
}

export interface MonitoringMetrics {
  totalErrors: number
  criticalErrors: number
  errorRate: number
  topErrors: Array<{ pattern: string; count: number; severity: string }>
  performance: {
    avgResponseTime: number
    slowQueries: number
    timeouts: number
  }
  userImpact: {
    affectedUsers: number
    blockedUsers: number
    failedLogins: number
  }
}

class IntelligentMonitoring {
  private alertRules: Map<string, AlertRule> = new Map()
  private errorPatterns: Map<string, ErrorPattern> = new Map()
  private alertCooldowns: Map<string, number> = new Map()
  private metrics: MonitoringMetrics = {
    totalErrors: 0,
    criticalErrors: 0,
    errorRate: 0,
    topErrors: [],
    performance: {
      avgResponseTime: 0,
      slowQueries: 0,
      timeouts: 0,
    },
    userImpact: {
      affectedUsers: 0,
      blockedUsers: 0,
      failedLogins: 0,
    },
  }

  constructor() {
    this.setupDefaultAlertRules()
    this.setupPeriodicCleanup()
  }

  private setupDefaultAlertRules() {
    // 1. Alta taxa de erros em curto período
    this.addAlertRule({
      name: "high_error_rate",
      condition: (error, context) => {
        const recentErrors = this.getRecentErrors(60000) // Último minuto
        return recentErrors.length > 10
      },
      severity: "critical",
      cooldown: 300000, // 5 minutos
      action: (error, context) => {
        this.sendCriticalAlert("Alta taxa de erros detectada", {
          errorCount: this.getRecentErrors(60000).length,
          timeWindow: "1 minuto",
          topError: this.getTopErrorPattern(),
        })
      },
    })

    // 2. Falhas de autenticação em massa
    this.addAlertRule({
      name: "mass_auth_failures",
      condition: (error, context) => {
        return context.type === "auth" && this.getRecentAuthFailures(300000) > 5
      },
      severity: "high",
      cooldown: 600000, // 10 minutos
      action: (error, context) => {
        this.sendAlert(
          "Múltiplas falhas de autenticação",
          {
            failureCount: this.getRecentAuthFailures(300000),
            timeWindow: "5 minutos",
            recommendation: "Verificar se há ataque de força bruta",
          },
          "high"
        )
      },
    })

    // 3. Timeout em APIs críticas
    this.addAlertRule({
      name: "critical_api_timeout",
      condition: (error, context) => {
        return (
          error?.message?.includes("timeout") &&
          ["dashboard", "auth", "transactions"].includes(context.endpoint)
        )
      },
      severity: "high",
      cooldown: 180000, // 3 minutos
      action: (error, context) => {
        this.sendAlert(
          `Timeout em API crítica: ${context.endpoint}`,
          {
            endpoint: context.endpoint,
            userId: context.userId,
            duration: error.duration,
          },
          "high"
        )
      },
    })

    // 4. Rate limit atingido por usuário legítimo
    this.addAlertRule({
      name: "legitimate_user_blocked",
      condition: (error, context) => {
        return context.type === "rate_limit" && context.userTrustScore > 0.7 // Usuário confiável
      },
      severity: "medium",
      cooldown: 300000, // 5 minutos
      action: (error, context) => {
        this.sendAlert(
          `Usuário confiável bloqueado por rate limit`,
          {
            userId: context.userId,
            endpoint: context.endpoint,
            trustScore: context.userTrustScore,
            recommendation: "Ajustar limites para usuários VIP",
          },
          "medium"
        )
      },
    })

    // 5. PDF processing falhando em massa
    this.addAlertRule({
      name: "mass_pdf_failures",
      condition: (error, context) => {
        return context.type === "pdf_processing" && this.getRecentPDFErrors(600000) > 3 // 10 minutos
      },
      severity: "high",
      cooldown: 600000, // 10 minutos
      action: (error, context) => {
        this.sendAlert(
          "Múltiplas falhas no processamento de PDF",
          {
            failureCount: this.getRecentPDFErrors(600000),
            timeWindow: "10 minutos",
            recommendation: "Verificar limites da OpenAI ou formato dos PDFs",
          },
          "high"
        )
      },
    })

    // 6. Conexões SSE instáveis
    this.addAlertRule({
      name: "sse_instability",
      condition: (error, context) => {
        return context.type === "sse" && this.getRecentSSEErrors(300000) > 5 // 5 minutos
      },
      severity: "medium",
      cooldown: 300000, // 5 minutos
      action: (error, context) => {
        this.sendAlert(
          "Instabilidade detectada em conexões SSE",
          {
            errorCount: this.getRecentSSEErrors(300000),
            timeWindow: "5 minutos",
            affectedUsers: this.getAffectedUsersBySSE(),
          },
          "medium"
        )
      },
    })
  }

  addAlertRule(rule: AlertRule) {
    this.alertRules.set(rule.name, rule)
  }

  // Processar erro e verificar regras
  async processError(error: any, context: any = {}) {
    const timestamp = Date.now()

    // Ignorar erros conhecidos como ruído
    if (this.isNoiseError(error, context)) {
      return
    }

    // Atualizar métricas
    this.updateMetrics(error, context)

    // Detectar padrão
    const pattern = this.detectErrorPattern(error, context)
    this.updateErrorPattern(pattern)

    // Verificar regras de alerta
    for (const [name, rule] of this.alertRules) {
      if (this.shouldTriggerAlert(rule, timestamp)) {
        try {
          if (rule.condition(error, context)) {
            rule.action(error, context)
            this.alertCooldowns.set(name, timestamp + rule.cooldown)
          }
        } catch (alertError) {
          logger.error("Error executing alert rule", "monitoring", {
            ruleName: name,
            error: alertError instanceof Error ? alertError.message : String(alertError),
          })
        }
      }
    }

    // Enviar para Sentry se disponível
    const Sentry = getSentry()
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          errorType: pattern.type,
          severity: pattern.severity,
          component: context.component || "unknown",
        },
        extra: {
          context,
          pattern,
          metrics: this.getRelevantMetrics(pattern.type),
        },
      })
    }

    // Log estruturado
    logger.error("Error processed", "monitoring", {
      errorType: pattern.type,
      severity: pattern.severity,
      context,
      pattern,
      timestamp,
    })
  }

  // Identificar erros que são ruído
  private isNoiseError(error: any, context: any): boolean {
    // Erros de cliente esperados
    if (context.type === "client_validation") {
      return true
    }

    // Erros de rede temporários
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") {
      return true
    }

    // Erros de parsing em PDFs corrompidos (esperado)
    if (context.type === "pdf_processing" && error?.message?.includes("corrupt")) {
      return true
    }

    // Usuário digitando senha errada (esperado)
    if (context.type === "auth" && error?.message?.includes("credentials")) {
      return true
    }

    return false
  }

  // Detectar padrão de erro
  private detectErrorPattern(error: any, context: any): ErrorPattern {
    const type = this.getErrorType(error, context)
    const existing = this.errorPatterns.get(type)

    const severity = this.calculateSeverity(error, context)

    if (existing) {
      existing.count++
      existing.lastOccurrence = Date.now()
      existing.frequency = this.calculateFrequency(existing)
      existing.severity = severity > existing.severity ? severity : existing.severity // Pior severidade

      return existing
    }

    const newPattern: ErrorPattern = {
      type,
      frequency: 1,
      lastOccurrence: Date.now(),
      severity,
      context: this.extractContext(error, context),
      count: 1,
    }

    this.errorPatterns.set(type, newPattern)
    return newPattern
  }

  private getErrorType(error: any, context: any): string {
    // Priorizar tipo do contexto
    if (context.type) return context.type

    // Baseado no componente
    if (context.component) return `${context.component}_error`

    // Baseado na mensagem de erro
    const message = error?.message || String(error)

    if (message.includes("timeout")) return "timeout"
    if (message.includes("network")) return "network"
    if (message.includes("database")) return "database"
    if (message.includes("auth")) return "auth"
    if (message.includes("pdf")) return "pdf_processing"
    if (message.includes("rate limit")) return "rate_limit"
    if (message.includes("sse")) return "sse"

    return "unknown"
  }

  private calculateSeverity(error: any, context: any): "low" | "medium" | "high" | "critical" {
    // Erros críticos
    if (context.type === "database" || context.type === "auth") {
      return "critical"
    }

    // Erros altos
    if (context.type === "pdf_processing" || context.type === "timeout") {
      return "high"
    }

    // Erros médios
    if (context.type === "rate_limit" || context.type === "sse") {
      return "medium"
    }

    // Baseado no status HTTP
    if (context.status >= 500) return "critical"
    if (context.status >= 400) return "medium"

    // Baseado no impacto
    if (context.impact === "user_blocked") return "high"
    if (context.impact === "data_loss") return "critical"

    return "low"
  }

  private extractContext(error: any, context: any): Record<string, any> {
    const extracted: Record<string, any> = {
      component: context.component,
      endpoint: context.endpoint,
      userId: context.userId,
    }

    // Extrair informações relevantes do erro
    if (error?.status) extracted.httpStatus = error.status
    if (error?.code) extracted.errorCode = error.code
    if (error?.duration) extracted.duration = error.duration

    // Sanitizar dados sensíveis
    if (extracted.userId) {
      extracted.userId = extracted.userId.toString().substring(0, 8) + "..."
    }

    return extracted
  }

  private updateErrorPattern(pattern: ErrorPattern) {
    this.errorPatterns.set(pattern.type, pattern)
  }

  private calculateFrequency(pattern: ErrorPattern): number {
    const timeWindow = 300000 // 5 minutos
    const recentCount = this.getRecentErrorsByType(pattern.type, timeWindow)
    return recentCount / (timeWindow / 60000) // por minuto
  }

  private shouldTriggerAlert(rule: AlertRule, timestamp: number): boolean {
    const cooldown = this.alertCooldowns.get(rule.name)
    return !cooldown || timestamp >= cooldown
  }

  // Métodos de consulta
  private getRecentErrors(timeWindow: number): any[] {
    // Implementar cache de erros recentes
    return []
  }

  private getRecentErrorsByType(type: string, timeWindow: number): number {
    const pattern = this.errorPatterns.get(type)
    if (!pattern) return 0

    // Calcular baseado no timestamp e frequência
    return Math.floor(pattern.frequency * (timeWindow / 60000))
  }

  private getRecentAuthFailures(timeWindow: number): number {
    return this.getRecentErrorsByType("auth", timeWindow)
  }

  private getRecentPDFErrors(timeWindow: number): number {
    return this.getRecentErrorsByType("pdf_processing", timeWindow)
  }

  private getRecentSSEErrors(timeWindow: number): number {
    return this.getRecentErrorsByType("sse", timeWindow)
  }

  private getTopErrorPattern(): string {
    let topPattern = ""
    let maxCount = 0

    for (const [type, pattern] of this.errorPatterns) {
      if (pattern.count > maxCount) {
        maxCount = pattern.count
        topPattern = type
      }
    }

    return topPattern
  }

  private getAffectedUsersBySSE(): number {
    // Implementar rastreamento de usuários afetados
    return 0
  }

  private updateMetrics(error: any, context: any) {
    this.metrics.totalErrors++

    const severity = this.calculateSeverity(error, context)
    if (severity === "critical") {
      this.metrics.criticalErrors++
    }

    // Atualizar métricas de usuário
    if (context.userId) {
      this.metrics.userImpact.affectedUsers++

      if (context.type === "auth") {
        this.metrics.userImpact.failedLogins++
      }

      if (context.impact === "user_blocked") {
        this.metrics.userImpact.blockedUsers++
      }
    }
  }

  private getRelevantMetrics(errorType: string): Record<string, any> {
    return {
      totalErrors: this.metrics.totalErrors,
      errorRate: this.metrics.errorRate,
      patternCount: this.errorPatterns.get(errorType)?.count || 0,
    }
  }

  // Alertas
  private sendCriticalAlert(message: string, data: any) {
    this.sendAlert(message, data, "critical")

    // Alertas críticos podem ter ações adicionais
    logger.error("CRITICAL ALERT", "monitoring", { message, data })

    // Poderia enviar para Slack, PagerDuty, etc.
  }

  private sendAlert(message: string, data: any, severity: string) {
    logger.warn("ALERT", "monitoring", {
      message,
      data,
      severity,
      timestamp: new Date().toISOString(),
    })

    // Enviar para sistemas externos se configurado
    if (process.env.WEBHOOK_ALERT_URL) {
      fetch(process.env.WEBHOOK_ALERT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          data,
          severity,
          timestamp: new Date().toISOString(),
          service: "lmg-platform",
        }),
      }).catch((error) => {
        logger.error("Failed to send webhook alert", "monitoring", { error })
      })
    }
  }

  // Obter métricas atuais
  getCurrentMetrics(): MonitoringMetrics {
    // Calcular taxa de erro
    const totalRequests = this.metrics.totalErrors + 1000 // Estimativa de requisições totais
    this.metrics.errorRate = Math.round((this.metrics.totalErrors / totalRequests) * 100)

    // Top errors
    this.metrics.topErrors = Array.from(this.errorPatterns.entries())
      .map(([type, pattern]) => ({
        pattern: type,
        count: pattern.count,
        severity: pattern.severity,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return this.metrics
  }

  // Limpeza periódica
  private setupPeriodicCleanup() {
    if (typeof setInterval !== "undefined") {
      setInterval(
        () => {
          this.cleanup()
        },
        15 * 60 * 1000
      ) // A cada 15 minutos
    }
  }

  private cleanup() {
    const now = Date.now()
    const cutoff = now - 24 * 60 * 60 * 1000 // 24 horas

    // Limpar padrões antigos
    for (const [type, pattern] of this.errorPatterns) {
      if (pattern.lastOccurrence < cutoff) {
        this.errorPatterns.delete(type)
      }
    }

    // Limpar cooldowns expirados
    for (const [name, cooldown] of this.alertCooldowns) {
      if (cooldown < now) {
        this.alertCooldowns.delete(name)
      }
    }

    logger.info("Monitoring cleanup completed", "monitoring", {
      patternsKept: this.errorPatterns.size,
      activeCooldowns: this.alertCooldowns.size,
    })
  }
}

// Singleton global
export const intelligentMonitoring = new IntelligentMonitoring()

// Wrapper para uso fácil
export function trackError(error: any, context?: any) {
  intelligentMonitoring.processError(error, context)
}

export function trackPerformance(operation: string, duration: number, context?: any) {
  if (duration > 3000) {
    // Mais de 3 segundos
    trackError(new Error(`Slow operation: ${operation}`), {
      type: "performance",
      component: operation,
      duration,
      ...context,
    })
  }
}

export function trackUserAction(action: string, userId: string, success: boolean, context?: any) {
  if (!success) {
    trackError(new Error(`User action failed: ${action}`), {
      type: "user_action",
      component: action,
      userId,
      ...context,
    })
  }
}
