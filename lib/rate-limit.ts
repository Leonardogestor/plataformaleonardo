/**
 * Rate limit inteligente por usuário autenticado vs IP
 * Limites ajustados para usuários reais sem bloqueio indevido
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

let ratelimitDocuments: Ratelimit | null = null
let ratelimitSync: Ratelimit | null = null
let ratelimitAPI: Ratelimit | null = null
let ratelimitAuth: Ratelimit | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// Rate limits ajustados para produção
function getRatelimitDocuments(): Ratelimit | null {
  if (ratelimitDocuments) return ratelimitDocuments
  const redis = getRedis()
  if (!redis) return null
  ratelimitDocuments = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "5 m"), // 20 uploads a cada 5 minutos
    prefix: "rl:documents",
  })
  return ratelimitDocuments
}

function getRatelimitSync(): Ratelimit | null {
  if (ratelimitSync) return ratelimitSync
  const redis = getRedis()
  if (!redis) return null
  ratelimitSync = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "5 m"), // 15 syncs a cada 5 minutos
    prefix: "rl:sync",
  })
  return ratelimitSync
}

function getRatelimitAPI(): Ratelimit | null {
  if (ratelimitAPI) return ratelimitAPI
  const redis = getRedis()
  if (!redis) return null
  ratelimitAPI = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, "1 m"), // 300 chamadas por minuto
    prefix: "rl:api",
  })
  return ratelimitAPI
}

function getRatelimitAuth(): Ratelimit | null {
  if (ratelimitAuth) return ratelimitAuth
  const redis = getRedis()
  if (!redis) return null
  ratelimitAuth = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 tentativas de login por minuto
    prefix: "rl:auth",
  })
  return ratelimitAuth
}

export type RateLimitResult = { limited: false } | { limited: true; retryAfter?: number }

/**
 * Extrai identificador único: userId se autenticado, senão IP
 */
async function getIdentifier(request: Request): Promise<string> {
  try {
    // Tentar obter sessão do usuário
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      return `user:${session.user.id}`
    }
  } catch (error) {
    // Ignorar erro de sessão
  }

  // Fallback para IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "unknown"
  return `ip:${ip}`
}

/**
 * Rate limit para uploads de documentos
 */
export async function checkDocumentsLimit(request: Request): Promise<RateLimitResult> {
  const identifier = await getIdentifier(request)
  const rl = getRatelimitDocuments()
  if (!rl) return { limited: false }

  const { success, reset } = await rl.limit(identifier)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

/**
 * Rate limit para syncs Open Finance
 */
export async function checkSyncLimit(request: Request): Promise<RateLimitResult> {
  const identifier = await getIdentifier(request)
  const rl = getRatelimitSync()
  if (!rl) return { limited: false }

  const { success, reset } = await rl.limit(identifier)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

/**
 * Rate limit geral de API
 */
export async function checkAPILimit(request: Request): Promise<RateLimitResult> {
  const identifier = await getIdentifier(request)
  const rl = getRatelimitAPI()
  if (!rl) return { limited: false }

  const { success, reset } = await rl.limit(identifier)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

/**
 * Rate limit para tentativas de login
 */
export async function checkAuthLimit(request: Request): Promise<RateLimitResult> {
  const identifier = await getIdentifier(request)
  const rl = getRatelimitAuth()
  if (!rl) return { limited: false }

  const { success, reset } = await rl.limit(identifier)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

/**
 * Middleware wrapper para rate limiting
 */
export function withRateLimit<T extends Request>(
  request: T,
  checker: (request: T) => Promise<RateLimitResult>
) {
  return checker(request)
}
