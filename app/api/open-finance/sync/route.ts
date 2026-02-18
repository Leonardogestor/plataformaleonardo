import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  getPluggyItemStatus,
  getPluggyAccounts,
  getPluggyTransactions,
} from "@/lib/pluggy"

function mapPluggyTransactionType(type: string): "INCOME" | "EXPENSE" | "TRANSFER" {
  if (type === "CREDIT") return "INCOME"
  if (type === "DEBIT") return "EXPENSE"
  return "EXPENSE"
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const body = await request.json().catch(() => ({}))
    const connectionId = body?.connectionId
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId obrigatório" }, { status: 400 })
    }

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, userId: session.user.id },
      include: { accounts: true },
    })
    if (!connection) {
      return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 })
    }

    const item = await getPluggyItemStatus(connection.itemId)
    const executionStatus = (item as { executionStatus?: string })?.executionStatus
    const errorMsg = (item as { error?: { message?: string } })?.error?.message ?? null

    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        status: executionStatus === "SUCCESS" ? "ACTIVE" : executionStatus === "LOGIN_ERROR" ? "LOGIN_ERROR" : "UPDATING",
        error: errorMsg,
        lastSyncAt: new Date(),
      },
    })

    const pluggyAccounts = await getPluggyAccounts(connection.itemId)
    const ourAccountsByExternalId = new Map(
      connection.accounts.map((a) => [a.externalAccountId, a])
    )

    const fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - 3)
    const fromStr = fromDate.toISOString().slice(0, 10)

    for (const acc of pluggyAccounts as any[]) {
      const ourAccount = ourAccountsByExternalId.get(acc.id)
      if (!ourAccount) continue
      let transactions: any[] = []
      try {
        transactions = await getPluggyTransactions(acc.id, fromStr)
      } catch {
        continue
      }
      for (const tx of transactions) {
        const extId = tx.id
        const amount = Math.abs(Number(tx.amount))
        const type = mapPluggyTransactionType(tx.type ?? "DEBIT")
        const description = tx.description ?? tx.descriptionRaw ?? "Transação"
        const date = tx.date ? new Date(tx.date) : new Date()
        const category = tx.category ?? "Outros"

        await prisma.transaction.upsert({
          where: { externalTransactionId: extId },
          create: {
            userId: session.user.id,
            accountId: ourAccount.id,
            date,
            description,
            amount,
            type,
            category,
            subcategory: null,
            externalTransactionId: extId,
            isPending: tx.status === "PENDING",
          },
          update: {
            amount,
            description,
            category,
            isPending: tx.status === "PENDING",
          },
        })
      }
      await prisma.account.update({
        where: { id: ourAccount.id },
        data: { balance: Number(acc.balance ?? 0) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[open-finance/sync]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar" },
      { status: 500 }
    )
  }
}
