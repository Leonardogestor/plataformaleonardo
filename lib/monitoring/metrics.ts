import { pipelineLogger } from "@/lib/utils/logger"

interface Metric {
  name: string
  value: number | string
  timestamp: Date
  tags?: Record<string, string>
}

interface AIUsage {
  tokens: number
  cost: number
  model: string
  userId: string
  timestamp: Date
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map()
  private aiUsage: AIUsage[] = []
  private readonly MAX_METRICS_PER_KEY = 1000
  private readonly MAX_AI_USAGE_RECORDS = 10000

  trackMetric(name: string, value: number | string, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    }

    const existing = this.metrics.get(name) || []
    existing.push(metric)

    // Mantém apenas últimas métricas
    if (existing.length > this.MAX_METRICS_PER_KEY) {
      existing.splice(0, existing.length - this.MAX_METRICS_PER_KEY)
    }

    this.metrics.set(name, existing)

    // Log imediato para métricas críticas
    if (name.includes("error") || name.includes("failure")) {
      pipelineLogger.error(`Critical metric: ${name}`, { value, tags })
    } else if (name.includes("success")) {
      pipelineLogger.info(`Success metric: ${name}`, { value, tags })
    }
  }

  trackAIUsage(usage: Omit<AIUsage, "timestamp">): void {
    const aiUsage: AIUsage = {
      ...usage,
      timestamp: new Date(),
    }

    this.aiUsage.push(aiUsage)

    // Mantém apenas registros recentes
    if (this.aiUsage.length > this.MAX_AI_USAGE_RECORDS) {
      this.aiUsage.splice(0, this.aiUsage.length - this.MAX_AI_USAGE_RECORDS)
    }

    // Log de uso de IA para controle de custos
    pipelineLogger.info("AI usage tracked", {
      tokens: usage.tokens,
      cost: usage.cost,
      model: usage.model,
      userId: usage.userId,
    })
  }

  getMetrics(name: string, limit: number = 100): Metric[] {
    const metrics = this.metrics.get(name) || []
    return metrics.slice(-limit)
  }

  getAIUsage(userId: string, hours: number = 24): AIUsage[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000
    const cutoff = new Date(cutoffTime)

    return this.aiUsage.filter((usage) => usage.userId === userId && usage.timestamp >= cutoff)
  }

  getKPIs(): Record<string, any> {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Pipeline Success Rate
    const pipelineMetrics = this.getMetrics("pipeline_success", 1000)
    const recentPipeline = pipelineMetrics.filter((m) => m.timestamp >= last24Hours)
    const successCount = recentPipeline.filter((m) => m.value === 1).length
    const totalPipeline = recentPipeline.length
    const successRate = totalPipeline > 0 ? (successCount / totalPipeline) * 100 : 0

    // Processing Time
    const timeMetrics = this.getMetrics("processing_time_ms", 100)
    const recentTime = timeMetrics.filter((m) => m.timestamp >= last24Hours)
    const avgProcessingTime =
      recentTime.length > 0
        ? recentTime.reduce((sum, m) => sum + Number(m.value), 0) / recentTime.length
        : 0

    // AI Usage
    const recentAIUsage = this.getAIUsage("all", 24)
    const totalTokens = recentAIUsage.reduce((sum, usage) => sum + usage.tokens, 0)
    const totalCost = recentAIUsage.reduce((sum, usage) => sum + usage.cost, 0)

    // Error Rate
    const errorMetrics = this.getMetrics("pipeline_error", 100)
    const recentErrors = errorMetrics.filter((m) => m.timestamp >= last24Hours)
    const errorRate = totalPipeline > 0 ? (recentErrors.length / totalPipeline) * 100 : 0

    return {
      pipeline_success_rate_24h: `${successRate.toFixed(2)}%`,
      avg_processing_time_ms_24h: Math.round(avgProcessingTime),
      ai_tokens_used_24h: totalTokens,
      ai_cost_24h: totalCost.toFixed(4),
      error_rate_24h: `${errorRate.toFixed(2)}%`,
      total_processed_24h: totalPipeline,
      fallback_usage_24h: this.getFallbackUsage(24),
    }
  }

  private getFallbackUsage(hours: number): Record<string, number> {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000
    const cutoff = new Date(cutoffTime)

    const fallbackMetrics = this.getMetrics("fallback_used", 100)
    const recentFallback = fallbackMetrics.filter((m) => m.timestamp >= cutoff)

    const usage = recentFallback.reduce(
      (acc, m) => {
        const type = m.tags?.type || "unknown"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return usage
  }

  clear(): void {
    this.metrics.clear()
    this.aiUsage = []
    pipelineLogger.info("Metrics cleared")
  }
}

// Singleton para uso global
export const metricsCollector = new MetricsCollector()

// Métricas específicas do pipeline
export const trackPipelineSuccess = (userId: string, processingTime: number) => {
  metricsCollector.trackMetric("pipeline_success", 1, {
    userId,
    processing_time_ms: processingTime.toString(),
  })
}

export const trackPipelineFailure = (userId: string, error: string, stage: string) => {
  metricsCollector.trackMetric("pipeline_error", 1, {
    userId,
    error,
    stage,
  })
}

export const trackProcessingTime = (stage: string, duration: number) => {
  metricsCollector.trackMetric(`processing_time_${stage}`, duration, {
    stage,
  })
}

export const trackFallbackUsage = (type: "regex" | "ai" | "ocr", processingTime: number) => {
  metricsCollector.trackMetric("fallback_used", 1, {
    type,
    processing_time_ms: processingTime.toString(),
  })
}

export const trackAIUsage = (tokens: number, cost: number, model: string, userId: string) => {
  metricsCollector.trackAIUsage({
    tokens,
    cost,
    model,
    userId,
  })
}
