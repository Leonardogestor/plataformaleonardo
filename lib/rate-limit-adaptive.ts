/**
 * Rate Limiting Adaptativo - Comportamento Real de Usuários
 * Diferencia por tipo de operação, usuário e comportamento
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Cache de instâncias para performance
const rateLimitCache = new Map<string, Ratelimit>()

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getRatelimit(key: string, config: { window: string; limit: number }): Ratelimit | null {
  if (rateLimitCache.has(key)) {
    return rateLimitCache.get(key)!
  }

  const redis = getRedis()
  if (!redis) return null

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, parseInt(config.window) as any),
    prefix: `rl:${key}`,
    analytics: true, // Habilitar analytics do Upstash
  })

  rateLimitCache.set(key, ratelimit)
  return ratelimit
}

export interface RateLimitConfig {
  window: string
  limit: number
  blockDuration?: number // Duração do bloqueio em segundos
}

// Configurações diferenciadas por tipo de operação
export const RATE_LIMIT_CONFIGS = {
  // Leitura - permissivo para não bloquear UX
  GET: { window: "1 m", limit: 1000 }, // 1000 leituras/minuto

  // Escrita - mais restritivo
  POST: { window: "1 m", limit: 60 }, // 60 escritas/minuto
  PUT: { window: "1 m", limit: 30 }, // 30 atualizações/minuto

  // Autenticação - muito restritivo
  AUTH: { window: "5 m", limit: 10, blockDuration: 300 }, // 10 tentativas/5min, bloqueio 5min

  // Upload - controlado por custo
  UPLOAD: { window: "5 m", limit: 5, blockDuration: 600 }, // 5 uploads/5min, bloqueio 10min

  // PDF processing - muito restritivo por custo
  PDF_PROCESS: { window: "1 h", limit: 20, blockDuration: 1800 }, // 20/hora, bloqueio 30min

  // SSE - uma conexão por usuário
  SSE: { window: "1 m", limit: 1 }, // 1 conexão SSE/minuto por usuário

  // React Query - permissivo mas controlado
  REACT_QUERY: { window: "1 m", limit: 200 }, // 200 requisições/minuto
} as const

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS

async function getUserIdentifier(request: Request): Promise<string> {
  try {
    // Priorizar usuário autenticado
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      return `user:${session.user.id}`
    }
  } catch (error) {
    // Ignorar erro de sessão
  }

  // Fallback para IP + User-Agent (mais específico que só IP)
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "unknown"
  const userAgent = request.headers.get("user-agent")?.slice(0, 50) || "unknown"

  return `ip:${ip}:${userAgent}`
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  reset: number
  retryAfter?: number
  identifier: string
  type: RateLimitType
  adaptive?: {
    isPremium: boolean
    adjustedLimit: number
    reason: string
  }
}

export class AdaptiveRateLimiter {
  private static instance: AdaptiveRateLimiter
  private userBehaviorCache = new Map<
    string,
    {
      requestCount: number
      lastRequest: number
      suspiciousScore: number
    }
  >()

  static getInstance(): AdaptiveRateLimiter {
    if (!this.instance) {
      this.instance = new AdaptiveRateLimiter()
    }
    return this.instance
  }

  // Análise de comportamento do usuário
  private analyzeUserBehavior(identifier: string): {
    isPremium: boolean
    adjustedLimit: number
    reason: string
  } {
    const behavior = this.userBehaviorCache.get(identifier)

    if (!behavior) {
      // Novo usuário - limite padrão
      this.userBehaviorCache.set(identifier, {
        requestCount: 0,
        lastRequest: Date.now(),
        suspiciousScore: 0,
      })
      return { isPremium: false, adjustedLimit: 1, reason: "new_user" }
    }

    const now = Date.now()
    const timeSinceLastRequest = now - behavior.lastRequest

    // Atualizar comportamento
    behavior.requestCount++
    behavior.lastRequest = now

    // Detectar comportamento suspeito
    if (timeSinceLastRequest < 100) {
      // Menos de 100ms entre requests
      behavior.suspiciousScore += 10
    } else if (timeSinceLastRequest > 60000) {
      // Mais de 1min
      behavior.suspiciousScore = Math.max(0, behavior.suspiciousScore - 5)
    }

    // Usuários com bom comportamento ganham limites maiores
    if (behavior.requestCount > 100 && behavior.suspiciousScore < 20) {
      return { isPremium: true, adjustedLimit: 2, reason: "trusted_user" }
    }

    if (behavior.suspiciousScore > 50) {
      return { isPremium: false, adjustedLimit: 0.5, reason: "suspicious_behavior" }
    }

    return { isPremium: false, adjustedLimit: 1, reason: "standard" }
  }

  async checkRateLimit(
    request: Request,
    type: RateLimitType,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const config = { ...RATE_LIMIT_CONFIGS[type], ...customConfig }
    const identifier = await getUserIdentifier(request)
    const ratelimit = getRatelimit(type, config)

    if (!ratelimit) {
      // Sem Redis - sem rate limiting (development)
      return {
        limited: false,
        remaining: config.limit,
        reset: Date.now() + 60000,
        identifier,
        type,
      }
    }

    // Análise adaptativa
    const adaptive = this.analyzeUserBehavior(identifier)
    const adjustedLimit = Math.floor(config.limit * adaptive.adjustedLimit)

    const result = await ratelimit.limit(identifier, {
      rate: adjustedLimit,
    })

    // Se for bloqueado, adicionar penalidade
    if (!result.success && config.blockDuration) {
      const blockKey = `block:${identifier}:${type}`
      const redis = getRedis()
      if (redis) {
        await redis.set(blockKey, "1", { ex: config.blockDuration })
      }
    }

    return {
      limited: !result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
      identifier,
      type,
      adaptive,
    }
  }

  // Verificar se usuário está bloqueado
  async isBlocked(identifier: string, type: RateLimitType): Promise<boolean> {
    const redis = getRedis()
    if (!redis) return false

    const blockKey = `block:${identifier}:${type}`
    const blocked = await redis.get(blockKey)
    return blocked === "1"
  }

  // Limpar cache de comportamento (periodicamente)
  cleanupBehaviorCache() {
    const now = Date.now()
    for (const [key, behavior] of this.userBehaviorCache.entries()) {
      if (now - behavior.lastRequest > 24 * 60 * 60 * 1000) {
        // 24h
        this.userBehaviorCache.delete(key)
      }
    }
  }
}

// Singleton global
export const rateLimiter = AdaptiveRateLimiter.getInstance()

// Middleware wrapper para uso fácil
export async function withAdaptiveRateLimit(
  request: Request,
  type: RateLimitType,
  customConfig?: Partial<RateLimitConfig>
) {
  return await rateLimiter.checkRateLimit(request, type, customConfig)
}

// Funções específicas para cada tipo de operação
export const rateLimit = {
  get: (request: Request) => withAdaptiveRateLimit(request, "GET"),
  post: (request: Request) => withAdaptiveRateLimit(request, "POST"),
  put: (request: Request) => withAdaptiveRateLimit(request, "PUT"),
  auth: (request: Request) => withAdaptiveRateLimit(request, "AUTH"),
  upload: (request: Request) => withAdaptiveRateLimit(request, "UPLOAD"),
  pdfProcess: (request: Request) => withAdaptiveRateLimit(request, "PDF_PROCESS"),
  sse: (request: Request) => withAdaptiveRateLimit(request, "SSE"),
  reactQuery: (request: Request) => withAdaptiveRateLimit(request, "REACT_QUERY"),
}

// Limpeza periódica (executar a cada hora)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      rateLimiter.cleanupBehaviorCache()
    },
    60 * 60 * 1000
  )
}
