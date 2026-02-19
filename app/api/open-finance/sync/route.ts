import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { syncItemTransactions } from "@/lib/pluggy-sync"
import { checkSyncLimit } from "@/lib/rate-limit"

/**
 * Manual sync: delegates to syncItemTransactions so the same lock, incremental
 * sync, and balance logic apply. If item is already syncing, we return success
 * without waiting (sync will complete in background).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const limit = await checkSyncLimit(session.user.id)
    if (limit.limited) {
      const retryAfter = limit.retryAfter ?? 60
      return NextResponse.json(
        { error: "Muitas sincronizações. Aguarde alguns minutos antes de tentar novamente." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const connectionId = body?.connectionId
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId obrigatório" }, { status: 400 })
    }

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: session.user.id },
      select: { itemId: true },
    })
    if (!connection) {
      return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 })
    }

    await syncItemTransactions(connection.itemId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[open-finance/sync]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar" },
      { status: 500 }
    )
  }
}
