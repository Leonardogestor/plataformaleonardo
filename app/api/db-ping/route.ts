import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Keep-alive para Neon (evitar que o branch suspenda por inatividade).
 * Chamar a cada ~5 min via Vercel Cron ou cron externo (ex.: cron-job.org).
 * Em produção, proteja com header/secret para não ser chamado por qualquer um.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("db-ping failed:", e)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
