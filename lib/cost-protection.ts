/**
 * Proteção de Custo - Controle de Gastos Invisíveis
 * Monitora e limita custos de IA, PDF, APIs e múltiplas chamadas
 */

import { logger } from "./logger"

export interface CostTracker {
  userId: string
  service: string
  operation: string
  cost: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface CostLimit {
  userId: string
  service: string
  period: "hourly" | "daily" | "monthly"
  limit: number
  current: number
  alertThreshold: number
}

export interface CostProtectionConfig {
  // Limites por usuário (USD)
  OPENAI_DAILY_LIMIT: number
  OPENAI_MONTHLY_LIMIT: number
  PDF_DAILY_LIMIT: number
  PDF_MONTHLY_LIMIT: number
  API_DAILY_LIMIT: number
  API_MONTHLY_LIMIT: number

  // Limites globais (USD)
  GLOBAL_DAILY_LIMIT: number
  GLOBAL_HOURLY_LIMIT: number

  // Configurações de alerta
  ALERT_THRESHOLD_PERCENTAGE: number
  BLOCK_THRESHOLD_PERCENTAGE: number

  // Throttling
  COST_THROTTLE_ENABLED: boolean
  THROTTLE_MULTIPLIER: number
}

const DEFAULT_CONFIG: CostProtectionConfig = {
  OPENAI_DAILY_LIMIT: 10,
  OPENAI_MONTHLY_LIMIT: 100,
  PDF_DAILY_LIMIT: 5,
  PDF_MONTHLY_LIMIT: 50,
  API_DAILY_LIMIT: 20,
  API_MONTHLY_LIMIT: 200,
  GLOBAL_DAILY_LIMIT: 1000,
  GLOBAL_HOURLY_LIMIT: 100,
  ALERT_THRESHOLD_PERCENTAGE: 0.8, // 80%
  BLOCK_THRESHOLD_PERCENTAGE: 0.95, // 95%
  COST_THROTTLE_ENABLED: true,
  THROTTLE_MULTIPLIER: 0.5, // Reduz para 50% quando próximo do limite
}

class CostProtection {
  private config: CostProtectionConfig
  private userCosts: Map<
    string,
    Map<string, Array<{ cost: number; timestamp: number; metadata?: Record<string, any> }>>
  > = new Map() // userId -> service -> costs[]
  private globalCosts: Map<
    string,
    Array<{ cost: number; timestamp: number; metadata?: Record<string, any> }>
  > = new Map() // service -> costs[]
  private costLimits: Map<string, CostLimit> = new Map()
  private alertsSent: Set<string> = new Set()

  constructor(config: Partial<CostProtectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupPeriodicCleanup()
  }

  // Calcular custo de operação OpenAI
  calculateOpenAICost(tokens: number, model: string = "gpt-4o-mini"): number {
    const costs = {
      "gpt-4o-mini": 0.002, // $0.002 por 1K tokens
      "gpt-4": 0.03, // $0.03 por 1K tokens
      "gpt-3.5-turbo": 0.001, // $0.001 por 1K tokens
    }

    const costPer1K = (costs as any)[model] || costs["gpt-4o-mini"]
    return (tokens / 1000) * costPer1K
  }

  // Calcular custo de processamento de PDF
  calculatePDFCost(fileSize: number, pages: number, usesAI: boolean = true): number {
    let cost = 0.01 // Custo base de processamento

    // Custo por tamanho
    cost += (fileSize / (1024 * 1024)) * 0.005 // $0.005 por MB

    // Custo por página
    cost += pages * 0.002 // $0.002 por página

    // Custo de IA se usado
    if (usesAI) {
      cost += pages * 0.01 // $0.01 por página com IA
    }

    return Math.min(cost, 0.5) // Máximo $0.50 por PDF
  }

  // Calcular custo de API call
  calculateAPICost(endpoint: string, responseTime: number): number {
    // Custo base por chamada
    let cost = 0.001

    // Custo por tempo de processamento
    cost += (responseTime / 1000) * 0.0001 // $0.0001 por segundo

    // Custo por complexidade do endpoint
    const complexEndpoints = ["dashboard", "reports", "analytics"]
    if (complexEndpoints.some((ep) => endpoint.includes(ep))) {
      cost *= 2
    }

    return cost
  }

  // Registrar custo
  async trackCost(
    userId: string,
    service: string,
    operation: string,
    cost: number,
    metadata?: Record<string, any>
  ): Promise<{
    allowed: boolean
    reason?: string
    remaining?: number
    alert?: boolean
  }> {
    const timestamp = Date.now()

    // Verificar limites antes de registrar
    const limitCheck = this.checkLimits(userId, service, cost)

    if (!limitCheck.allowed) {
      logger.warn("Cost limit exceeded", "cost", {
        userId,
        service,
        cost,
        currentUsage: limitCheck.current,
        limit: limitCheck.limit,
        reason: limitCheck.reason,
      })

      return {
        allowed: false,
        reason: limitCheck.reason,
        remaining: limitCheck.remaining,
      }
    }

    // Aplicar throttling se necessário
    if (limitCheck.shouldThrottle) {
      cost *= this.config.THROTTLE_MULTIPLIER
      logger.info("Cost throttling applied", "cost", {
        userId,
        service,
        originalCost: cost / this.config.THROTTLE_MULTIPLIER,
        throttledCost: cost,
      })
    }

    // Registrar custo
    this.registerCost(userId, service, cost, timestamp, metadata)

    // Verificar se deve enviar alerta
    const alert = this.shouldSendAlert(userId, service, limitCheck.current, limitCheck.limit)

    if (alert) {
      this.sendCostAlert(userId, service, limitCheck.current, limitCheck.limit)
    }

    return {
      allowed: true,
      remaining: limitCheck.remaining,
      alert,
    }
  }

  private registerCost(
    userId: string,
    service: string,
    cost: number,
    timestamp: number,
    metadata?: Record<string, any>
  ) {
    // Registrar custo do usuário
    if (!this.userCosts.has(userId)) {
      this.userCosts.set(userId, new Map())
    }

    const userServices = this.userCosts.get(userId)!
    if (!userServices.has(service)) {
      userServices.set(service, [])
    }

    userServices.get(service)!.push({ cost, timestamp, metadata })

    // Registrar custo global
    if (!this.globalCosts.has(service)) {
      this.globalCosts.set(service, [])
    }

    this.globalCosts.get(service)!.push({ cost, timestamp, metadata })
  }

  private checkLimits(
    userId: string,
    service: string,
    cost: number
  ): {
    allowed: boolean
    current: number
    limit: number
    remaining: number
    reason?: string
    shouldThrottle: boolean
  } {
    const now = Date.now()

    // Verificar limites do usuário
    const userCosts = this.userCosts.get(userId)
    if (!userCosts) {
      return {
        allowed: true,
        current: 0,
        limit: this.getLimit(userId, service, "daily"),
        remaining: this.getLimit(userId, service, "daily"),
        shouldThrottle: false,
      }
    }

    const serviceCosts = userCosts.get(service) || []

    // Calcular custos em diferentes períodos
    const hourly = this.calculateCostInPeriod(serviceCosts, now, 60 * 60 * 1000)
    const daily = this.calculateCostInPeriod(serviceCosts, now, 24 * 60 * 60 * 1000)
    const monthly = this.calculateCostInPeriod(serviceCosts, now, 30 * 24 * 60 * 60 * 1000)

    // Obter limites
    const dailyLimit = this.getLimit(userId, service, "daily")
    const monthlyLimit = this.getLimit(userId, service, "monthly")
    const hourlyLimit = this.getLimit(userId, service, "hourly")

    // Verificar se excede algum limite
    if (daily + cost > dailyLimit) {
      return {
        allowed: false,
        current: daily,
        limit: dailyLimit,
        remaining: dailyLimit - daily,
        reason: `Daily limit exceeded ($${daily.toFixed(2)} + $${cost.toFixed(2)} > $${dailyLimit.toFixed(2)})`,
        shouldThrottle: false,
      }
    }

    if (monthly + cost > monthlyLimit) {
      return {
        allowed: false,
        current: monthly,
        limit: monthlyLimit,
        remaining: monthlyLimit - monthly,
        reason: `Monthly limit exceeded ($${monthly.toFixed(2)} + $${cost.toFixed(2)} > $${monthlyLimit.toFixed(2)})`,
        shouldThrottle: false,
      }
    }

    // Verificar throttling
    const alertThreshold = dailyLimit * this.config.ALERT_THRESHOLD_PERCENTAGE
    const shouldThrottle = daily + cost > alertThreshold

    return {
      allowed: true,
      current: daily,
      limit: dailyLimit,
      remaining: dailyLimit - daily,
      shouldThrottle,
    }
  }

  private calculateCostInPeriod(costs: any[], now: number, periodMs: number): number {
    const cutoff = now - periodMs
    return costs
      .filter((cost) => cost.timestamp > cutoff)
      .reduce((total, cost) => total + cost.cost, 0)
  }

  private getLimit(
    userId: string,
    service: string,
    period: "hourly" | "daily" | "monthly"
  ): number {
    const cacheKey = `${userId}:${service}:${period}`

    if (this.costLimits.has(cacheKey)) {
      return this.costLimits.get(cacheKey)!.limit
    }

    // Definir limites baseado no serviço e período
    let limit = 0

    switch (service) {
      case "openai":
        limit =
          period === "daily"
            ? this.config.OPENAI_DAILY_LIMIT
            : period === "monthly"
              ? this.config.OPENAI_MONTHLY_LIMIT
              : 5
        break
      case "pdf":
        limit =
          period === "daily"
            ? this.config.PDF_DAILY_LIMIT
            : period === "monthly"
              ? this.config.PDF_MONTHLY_LIMIT
              : 2
        break
      case "api":
        limit =
          period === "daily"
            ? this.config.API_DAILY_LIMIT
            : period === "monthly"
              ? this.config.API_MONTHLY_LIMIT
              : 10
        break
      default:
        limit = period === "daily" ? 20 : period === "monthly" ? 200 : 5
    }

    // Ajustar limites para usuários especiais (VIP, etc.)
    if (this.isPremiumUser(userId)) {
      limit *= 2 // Dobra o limite para usuários premium
    }

    this.costLimits.set(cacheKey, {
      userId,
      service,
      period,
      limit,
      current: 0,
      alertThreshold: limit * this.config.ALERT_THRESHOLD_PERCENTAGE,
    })

    return limit
  }

  private isPremiumUser(userId: string): boolean {
    // Implementar lógica para detectar usuários premium
    // Por enquanto, retorna false para todos
    return false
  }

  private shouldSendAlert(
    userId: string,
    service: string,
    current: number,
    limit: number
  ): boolean {
    const alertKey = `${userId}:${service}:alert`
    const alertThreshold = limit * this.config.ALERT_THRESHOLD_PERCENTAGE

    if (current < alertThreshold) {
      return false
    }

    // Evitar enviar múltiplos alertas
    if (this.alertsSent.has(alertKey)) {
      return false
    }

    // Marcar que alerta foi enviado
    this.alertsSent.add(alertKey)

    // Limpar após 1 hora
    setTimeout(
      () => {
        this.alertsSent.delete(alertKey)
      },
      60 * 60 * 1000
    )

    return true
  }

  private sendCostAlert(userId: string, service: string, current: number, limit: number) {
    const percentage = Math.round((current / limit) * 100)

    logger.warn("Cost alert triggered", "cost", {
      userId: userId.substring(0, 8) + "...",
      service,
      current: current.toFixed(2),
      limit: limit.toFixed(2),
      percentage: `${percentage}%`,
      recommendation: this.getCostRecommendation(service, percentage),
    })

    // Enviar alerta para sistemas externos se configurado
    if (process.env.COST_ALERT_WEBHOOK) {
      fetch(process.env.COST_ALERT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cost_alert",
          userId,
          service,
          current,
          limit,
          percentage,
          timestamp: new Date().toISOString(),
        }),
      }).catch((error) => {
        logger.error("Failed to send cost alert webhook", "cost", { error })
      })
    }
  }

  private getCostRecommendation(service: string, percentage: number): string {
    if (percentage >= 95) {
      return "CRITICAL: Imediatamente bloquear operações para este usuário/serviço"
    }

    if (percentage >= 80) {
      return "WARNING: Aplicar throttling e notificar usuário sobre limite"
    }

    if (service === "openai") {
      return "Considerar usar modelo mais econômico ou reduzir tamanho do texto"
    }

    if (service === "pdf") {
      return "Limitar tamanho de arquivos ou otimizar processamento"
    }

    return "Monitorar uso de perto"
  }

  // Obter estatísticas de custo
  getCostStats(): {
    global: Record<string, { total: number; hourly: number; daily: number; monthly: number }>
    users: Array<{ userId: string; totalCost: number; topService: string }>
    alerts: number
  } {
    const now = Date.now()
    const global: Record<string, any> = {}

    // Calcular estatísticas globais
    for (const [service, costs] of this.globalCosts) {
      const total = costs.reduce((sum, cost) => sum + cost.cost, 0)
      const hourly = this.calculateCostInPeriod(costs, now, 60 * 60 * 1000)
      const daily = this.calculateCostInPeriod(costs, now, 24 * 60 * 60 * 1000)
      const monthly = this.calculateCostInPeriod(costs, now, 30 * 24 * 60 * 60 * 1000)

      global[service] = { total, hourly, daily, monthly }
    }

    // Calcular estatísticas por usuário
    const users: Array<{ userId: string; totalCost: number; topService: string }> = []

    for (const [userId, services] of this.userCosts) {
      let totalCost = 0
      let topService = ""
      let maxCost = 0

      for (const [service, costs] of services) {
        const serviceTotal = costs.reduce((sum, cost) => sum + cost.cost, 0)
        totalCost += serviceTotal

        if (serviceTotal > maxCost) {
          maxCost = serviceTotal
          topService = service
        }
      }

      users.push({
        userId: userId.substring(0, 8) + "...",
        totalCost,
        topService,
      })
    }

    // Ordenar por maior custo
    users.sort((a, b) => b.totalCost - a.totalCost)

    return {
      global,
      users: users.slice(0, 10), // Top 10 usuários
      alerts: this.alertsSent.size,
    }
  }

  // Limpeza periódica
  private setupPeriodicCleanup() {
    if (typeof setInterval !== "undefined") {
      setInterval(
        () => {
          this.cleanup()
        },
        60 * 60 * 1000
      ) // A cada hora
    }
  }

  private cleanup() {
    const now = Date.now()
    const cutoff = now - 30 * 24 * 60 * 60 * 1000 // 30 dias

    let cleanedUsers = 0
    let cleanedGlobal = 0

    // Limpar custos do usuário
    for (const [userId, services] of this.userCosts) {
      let hasRecentCosts = false

      for (const [service, costs] of services) {
        const recentCosts = costs.filter((cost) => cost.timestamp > cutoff)
        if (recentCosts.length > 0) {
          services.set(service, recentCosts)
          hasRecentCosts = true
        } else {
          services.delete(service)
        }
      }

      if (!hasRecentCosts) {
        this.userCosts.delete(userId)
        cleanedUsers++
      }
    }

    // Limpar custos globais
    for (const [service, costs] of this.globalCosts) {
      const recentCosts = costs.filter((cost) => cost.timestamp > cutoff)
      if (recentCosts.length > 0) {
        this.globalCosts.set(service, recentCosts)
      } else {
        this.globalCosts.delete(service)
        cleanedGlobal++
      }
    }

    logger.info("Cost protection cleanup completed", "cost", {
      cleanedUsers,
      cleanedGlobal,
      totalUsers: this.userCosts.size,
      totalServices: this.globalCosts.size,
    })
  }
}

// Singleton global
export const costProtection = new CostProtection()

// Wrappers para uso fácil
export async function trackOpenAICost(
  userId: string,
  tokens: number,
  model: string = "gpt-4o-mini",
  metadata?: Record<string, any>
) {
  const cost = costProtection.calculateOpenAICost(tokens, model)
  return await costProtection.trackCost(userId, "openai", "completion", cost, {
    tokens,
    model,
    ...metadata,
  })
}

export async function trackPDFCost(
  userId: string,
  fileSize: number,
  pages: number,
  usesAI: boolean = true,
  metadata?: Record<string, any>
) {
  const cost = costProtection.calculatePDFCost(fileSize, pages, usesAI)
  return await costProtection.trackCost(userId, "pdf", "processing", cost, {
    fileSize,
    pages,
    usesAI,
    ...metadata,
  })
}

export async function trackAPICost(
  userId: string,
  endpoint: string,
  responseTime: number,
  metadata?: Record<string, any>
) {
  const cost = costProtection.calculateAPICost(endpoint, responseTime)
  return await costProtection.trackCost(userId, "api", endpoint, cost, {
    endpoint,
    responseTime,
    ...metadata,
  })
}

// Middleware para APIs
export function withCostTracking(userId: string, service: string, operation: string) {
  return async (fn: () => Promise<any>, metadata?: Record<string, any>) => {
    const startTime = Date.now()

    try {
      const result = await fn()
      const responseTime = Date.now() - startTime

      // Rastrear custo da API
      await trackAPICost(userId, operation, responseTime, metadata)

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Mesmo em erro, rastrear custo
      await trackAPICost(userId, operation, responseTime, { ...metadata, error: true })

      throw error
    }
  }
}
