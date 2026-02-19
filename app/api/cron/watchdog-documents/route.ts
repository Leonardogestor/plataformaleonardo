import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Watchdog: documentos em PROCESSING há mais de 10 minutos viram FAILED.
 * Evita "zumbis" quando o processamento é encerrado antes de terminar (timeout, kill, cold start).
 *
 * Chamar a cada 5–10 min via cron externo (ex: cron-job.org) com CRON_SECRET.
 * Proteção: Authorization: Bearer <CRON_SECRET> ou ?secret=<CRON_SECRET>
 * (Vercel Cron não envia headers customizados; use cron externo ou reencaminhar para fila.)
 */
const STALE_MINUTES = 10
const STALE_MS = STALE_MINUTES * 60 * 1000

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7) === secret
  const urlSecret = request.nextUrl.searchParams.get("secret")
  return urlSecret === secret
}

/** Se CRON_SECRET não estiver definido, não executa (evita execução acidental em dev). */
function isCronConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET)
}

export async function GET(request: NextRequest) {
  if (!isCronConfigured()) {
    return NextResponse.json({ ok: true, skipped: "CRON_SECRET not set" })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - STALE_MS)
    const updated = await prisma.document.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: cutoff },
      },
      data: {
        status: "FAILED",
        errorMessage: "Processing timeout (watchdog)",
        updatedAt: new Date(),
      },
    })

    if (updated.count > 0) {
      console.info(
        JSON.stringify({
          type: "watchdog_documents",
          message: "Stale PROCESSING documents marked as FAILED",
          count: updated.count,
          staleMinutes: STALE_MINUTES,
        })
      )
    }

    return NextResponse.json({ ok: true, markedFailed: updated.count })
  } catch (error) {
    console.error("[cron/watchdog-documents]", error)
    return NextResponse.json({ error: "Watchdog failed" }, { status: 500 })
  }
}
