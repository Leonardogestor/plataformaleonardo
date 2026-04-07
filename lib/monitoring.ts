/**
 * Monitoramento completo com Sentry e métricas personalizadas
 */

import { logger } from "./logger"

// Sentry types (para quando instalado)
interface SentryEvent {
  request?: {
    headers?: Record<string, string>
    data?: any
  }
  exception?: {
    values?: Array<{
      type: string
      value: string
      stacktrace?: any
    }>
  }
  contexts?: Record<string, any>
  tags?: Record<string, string>
}

interface SentryTransaction {
  contexts?: Record<string, any>
}

// Configuração Sentry (só ativa se o pacote estiver instalado)
export function initializeSentry() {
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    try {
      // Tentar importar Sentry (pode não estar instalado)
      const Sentry = require("@sentry/nextjs")

      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: process.env.npm_package_version || "1.0.0",

        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Session replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Configurações adicionais
        maxBreadcrumbs: 50,
        debug: false,

        // Filtros para não enviar dados sensíveis
        beforeSend(event: SentryEvent) {
          // Remover dados sensíveis
          if (event.request) {
            if (event.request.headers) {
              delete event.request.headers.authorization
              delete event.request.headers.cookie
            }
            if (event.request.data) {
              event.request.data = sanitizeData(event.request.data)
            }
          }

          // Não enviar erros de browsers antigos
          if (event.exception) {
            const userAgent = event.request?.headers?.["user-agent"] || ""
            if (isOldBrowser(userAgent)) {
              return null
            }
          }

          return event
        },

        // Contexto adicional
        beforeSendTransaction(event: SentryTransaction) {
          event.contexts = {
            ...event.contexts,
            app: {
              name: "lmg-platform",
              version: process.env.npm_package_version || "1.0.0",
            },
          }
          return event
        },
      })

      logger.info("Sentry initialized", "monitoring")
    } catch (error) {
      logger.warn("Sentry not available, using fallback logging", "monitoring", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Sanitização de dados sensíveis
function sanitizeData(data: any): any {
  if (!data || typeof data !== "object") return data

  const sensitive = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "credential",
    "ssn",
    "credit_card",
  ]
  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  const sanitizeValue = (value: any): any => {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue)
      }

      const result: any = {}
      for (const [key, val] of Object.entries(value)) {
        if (sensitive.some((s) => key.toLowerCase().includes(s))) {
          result[key] = "[REDACTED]"
        } else {
          result[key] = sanitizeValue(val)
        }
      }
      return result
    }
    return value
  }

  return sanitizeValue(sanitized)
}

function isOldBrowser(userAgent: string): boolean {
  const oldBrowsers = [/MSIE [6-9]/, /Firefox\/[2-9]/, /Chrome\/[1-4]/, /Safari\/[1-4]/]

  return oldBrowsers.some((regex) => regex.test(userAgent))
}

// Wrapper para Sentry com fallback
function getSentry() {
  try {
    return require("@sentry/nextjs")
  } catch {
    return null
  }
}

// Métricas personalizadas
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map()

  recordTiming(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)

    // Enviar para Sentry se configurado
    const Sentry = getSentry()
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.metrics.timing(name, duration)
    }

    // Log se for muito lento
    if (duration > 5000) {
      logger.warn(`Slow operation: ${name}`, "metrics", { duration })
    }
  }

  recordCounter(name: string, value: number = 1) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)

    // Enviar para Sentry se configurado
    const Sentry = getSentry()
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.metrics.increment(name, value)
    }
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  getAllStats() {
    const stats: Record<string, any> = {}
    for (const name of this.metrics.keys()) {
      stats[name] = this.getStats(name)
    }
    return stats
  }
}

export const metrics = new MetricsCollector()

// Wrapper para performance
export function withPerformanceTracking<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      metrics.recordTiming(name, duration)
      metrics.recordCounter(`${name}.success`)

      resolve(result)
    } catch (error) {
      const duration = Date.now() - startTime

      metrics.recordTiming(name, duration)
      metrics.recordCounter(`${name}.error`)

      // Enviar erro para Sentry
      const Sentry = getSentry()
      if (Sentry && process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          tags: {
            operation: name,
            duration: duration.toString(),
          },
        })
      }

      logger.error(`Operation failed: ${name}`, "performance", { duration }, error as Error)
      reject(error)
    }
  })
}

// Monitoramento de erros não capturados
export function setupGlobalErrorHandlers() {
  // Erros não capturados
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", "global", {}, error)

    const Sentry = getSentry()
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureException(error)
    }

    // Em produção, fechar gracefulmente
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    }
  })

  // Promises rejeitadas
  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))

    logger.error("Unhandled Rejection", "global", { promise: String(promise) }, error)

    const Sentry = getSentry()
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureException(error)
    }
  })

  logger.info("Global error handlers setup", "monitoring")
}

// Health check com métricas
export async function getMetricsHealthCheck() {
  const stats = metrics.getAllStats()
  const memoryUsage = process.memoryUsage()

  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    metrics: stats,
    sentry: {
      enabled: !!process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
    },
  }
}

// Middleware de monitoramento para API routes
export function createMonitoringMiddleware() {
  return async (request: Request, response: Response) => {
    const startTime = Date.now()
    const method = request.method
    const pathname = new URL(request.url).pathname

    try {
      // A requisição será processada pelo handler
      return response
    } finally {
      const duration = Date.now() - startTime
      const status = response.status

      metrics.recordTiming(`api.${method}.${pathname}`, duration)
      metrics.recordCounter(`api.requests`)

      if (status >= 400) {
        metrics.recordCounter(`api.errors`)
      }

      // Log de performance se for muito lento
      if (duration > 3000) {
        logger.warn(`Slow API: ${method} ${pathname}`, "api", {
          status,
          duration: `${duration}ms`,
        })
      }
    }
  }
}

// Inicializar monitoring
if (typeof window === "undefined") {
  initializeSentry()
  setupGlobalErrorHandlers()
}
