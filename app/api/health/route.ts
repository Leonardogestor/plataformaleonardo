import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/health
 * Production health check for uptime monitoring (e.g. Uptime Robot, Better Uptime).
 * Returns 200 when app is up; 500 when DB check fails (if performed).
 */
export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: "ok", timestamp },
      { status: 200 }
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "health_check",
        status: "error",
        message: "Database connectivity check failed",
        timestamp,
      })
    )
    return NextResponse.json(
      { status: "error", timestamp },
      { status: 500 }
    )
  }
}
