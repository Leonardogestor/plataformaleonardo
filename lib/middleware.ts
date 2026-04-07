/**
 * Middleware para rate limiting em endpoints críticos
 */

import { NextRequest, NextResponse } from "next/server"
import { checkDocumentsLimit, checkSyncLimit, checkAPILimit } from "@/lib/rate-limit"

export async function rateLimitMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Extrair userId da sessão ou token
  const authorization = request.headers.get("authorization")
  const userId = authorization?.replace("Bearer ", "") || "anonymous"

  // Rate limiting para uploads de documentos
  if (pathname.startsWith("/api/documents") && request.method === "POST") {
    const result = await checkDocumentsLimit(request)
    if (result.limited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Limite de uploads excedido. Tente novamente em alguns minutos.",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(
              Date.now() / 1000 + (result.retryAfter || 60)
            ).toString(),
          },
        }
      )
    }
  }

  // Rate limiting para syncs
  if (pathname.startsWith("/api/accounts/sync") && request.method === "POST") {
    const result = await checkSyncLimit(request)
    if (result.limited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Limite de sincronizações excedido. Tente novamente em alguns minutos.",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(
              Date.now() / 1000 + (result.retryAfter || 60)
            ).toString(),
          },
        }
      )
    }
  }

  // Rate limiting geral de API
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const result = await checkAPILimit(request)
    if (result.limited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Limite de chamadas da API excedido. Tente novamente em alguns minutos.",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(
              Date.now() / 1000 + (result.retryAfter || 60)
            ).toString(),
          },
        }
      )
    }
  }

  return null // Continue com a requisição
}
