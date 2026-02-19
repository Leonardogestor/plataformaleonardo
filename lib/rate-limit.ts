/**
 * Rate limit por usuário para endpoints pesados (upload PDF, reprocess, sync manual).
 * Usa Upstash Redis quando UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN estão definidos;
 * caso contrário não aplica limite (dev ou sem Redis).
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let ratelimitDocuments: Ratelimit | null = null
let ratelimitSync: Ratelimit | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getRatelimitDocuments(): Ratelimit | null {
  if (ratelimitDocuments) return ratelimitDocuments
  const redis = getRedis()
  if (!redis) return null
  ratelimitDocuments = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
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
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:sync",
  })
  return ratelimitSync
}

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfter?: number }

/**
 * Limite: 10 uploads ou reprocessamentos de documento por usuário por minuto (sliding window).
 */
export async function checkDocumentsLimit(userId: string): Promise<RateLimitResult> {
  const rl = getRatelimitDocuments()
  if (!rl) return { limited: false }
  const { success, reset } = await rl.limit(userId)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

/**
 * Limite: 10 syncs manuais (Open Finance) por usuário por minuto (sliding window).
 */
export async function checkSyncLimit(userId: string): Promise<RateLimitResult> {
  const rl = getRatelimitSync()
  if (!rl) return { limited: false }
  const { success, reset } = await rl.limit(userId)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}
