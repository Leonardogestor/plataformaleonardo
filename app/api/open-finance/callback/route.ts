import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  getPluggyItemStatus,
  getPluggyAccounts,
  getPluggyTransactions,
} from "@/lib/pluggy"

function mapPluggyAccountType(subtype: string): "CHECKING" | "SAVINGS" | "INVESTMENT" | "CASH" | "OTHER" {
  switch (subtype) {
    case "CHECKING_ACCOUNT":
      return "CHECKING"
    case "SAVINGS_ACCOUNT":
      return "SAVINGS"
    case "CREDIT_CARD":
      return "OTHER"
    default:
      return "OTHER"
  }
}

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
    const body = await request.json()
    const itemId = body?.itemId
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId obrigatório" }, { status: 400 })
    }

    const userId = session.user.id

    const [item, pluggyAccounts] = await Promise.all([
      getPluggyItemStatus(itemId),
      getPluggyAccounts(itemId),
    ])

    const institutionName =
      (item as { connector?: { name?: string } })?.connector?.name ?? "Banco"
    const status = (item as { status?: string })?.status ?? "UPDATED"
    const executionStatus = (item as { executionStatus?: string })?.executionStatus ?? "SUCCESS"
    const errorMsg = (item as { error?: { message?: string } })?.error?.message ?? null
    const consentExpiresAt = (item as { consentExpiresAt?: string })?.consentExpiresAt
      ? new Date((item as { consentExpiresAt: string }).consentExpiresAt)
      : null

    const connectionStatus =
      executionStatus === "SUCCESS"
        ? "ACTIVE"
        : executionStatus === "LOGIN_ERROR"
          ? "LOGIN_ERROR"
          : status === "UPDATED"
            ? "ACTIVE"
            : "OUTDATED"

    let connection = await prisma.bankConnection.findUnique({
      where: { itemId },
    })
    if (connection) {
      if (connection.userId !== userId) {
        return NextResponse.json({ error: "Esta conexão pertence a outro usuário" }, { status: 403 })
      }
      connection = await prisma.bankConnection.update({
        where: { itemId },
        data: {
          status: connectionStatus,
          error: errorMsg,
          consentExpiresAt: consentExpiresAt ?? undefined,
          lastSyncAt: new Date(),
        },
      })
    } else {
      connection = await prisma.bankConnection.create({
        data: {
          userId,
          itemId,
          provider: "PLUGGY",
          status: connectionStatus,
          error: errorMsg,
          consentExpiresAt: consentExpiresAt ?? undefined,
          lastSyncAt: new Date(),
        },
      })
    }

    const bankAccounts = (pluggyAccounts as any[]).filter(
      (a) => a.type === "BANK" || a.type === "CREDIT"
    )
    const accountIdToOurId = new Map<string, string>()

    for (const acc of bankAccounts) {
      const subtype = acc.subtype ?? "OTHER"
      const ourType = mapPluggyAccountType(subtype)
      const balance = Number(acc.balance ?? 0)
      const name = acc.name ?? acc.marketingName ?? `${institutionName} - ${subtype}`

      const created = await prisma.account.upsert({
        where: { externalAccountId: acc.id },
        create: {
          userId,
          connectionId: connection.id,
          externalAccountId: acc.id,
          name,
          type: ourType,
          institution: institutionName,
          balance,
          currency: acc.currencyCode ?? "BRL",
          isActive: true,
        },
        update: {
          name,
          balance,
          institution: institutionName,
          isActive: true,
        },
      })
      accountIdToOurId.set(acc.id, created.id)
    }

    const fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - 3)
    const fromStr = fromDate.toISOString().slice(0, 10)

    for (const [pluggyAccountId, ourAccountId] of accountIdToOurId) {
      let transactions: any[] = []
      try {
        transactions = await getPluggyTransactions(pluggyAccountId, fromStr)
      } catch (e) {
        console.warn("[open-finance/callback] transactions for account", pluggyAccountId, e)
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
            userId,
            accountId: ourAccountId,
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
    }

    return NextResponse.json({
      ok: true,
      connectionId: connection.id,
      accountsCount: accountIdToOurId.size,
    })
  } catch (error) {
    console.error("[open-finance/callback]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao vincular conta" },
      { status: 500 }
    )
  }
}
