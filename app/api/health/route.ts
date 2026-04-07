import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Função simples para adicionar headers de segurança
function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  return response
}

/**
 * GET /api/health
 * Production health check for uptime monitoring (e.g. Uptime Robot, Better Uptime).
 * Returns 200 when app is up; 500 when DB check fails (if performed).
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString()

    // Teste de conexão com banco
    await prisma.$queryRaw`SELECT 1`

    const response = NextResponse.json(
      {
        status: "ok",
        timestamp,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: 200 }
    )

    return addSecurityHeaders(response)
  } catch (error) {
    const timestamp = new Date().toISOString()

    console.error(
      JSON.stringify({
        type: "health_check",
        status: "error",
        message: "Database connectivity check failed",
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      })
    )

    const response = NextResponse.json(
      {
        status: "error",
        timestamp,
        environment: process.env.NODE_ENV,
      },
      { status: 500 }
    )

    return addSecurityHeaders(response)
  }
}
