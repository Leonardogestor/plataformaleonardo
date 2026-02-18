import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { calcCardsAnalytics } from "@/lib/cards-analytics"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const userId = session.user.id

    const [cards, groupsRaw] = await Promise.all([
      prisma.card.findMany({
        where: { userId, isActive: true },
        select: { id: true, limit: true },
      }),
      prisma.installmentGroup.findMany({
        where: { userId },
        include: { transactions: true },
      }),
    ])

    const cardsRows = cards.map((c) => ({
      id: c.id,
      limit: Number(c.limit),
    }))

    const groupsRows = groupsRaw.map((g) => {
      const txs = g.transactions ?? []
      const totalPaid = txs.reduce((s, t) => s + Number(t.amount), 0)
      return {
        id: g.id,
        cardId: g.cardId,
        totalValue: Number(g.totalValue),
        totalInstallments: g.totalInstallments,
        totalPaid,
        paidCount: txs.length,
      }
    })

    const result = calcCardsAnalytics(cardsRows, groupsRows)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching cards analytics:", error)
    return NextResponse.json(
      { error: "Erro ao calcular analytics dos cartões" },
      { status: 500 }
    )
  }
}
