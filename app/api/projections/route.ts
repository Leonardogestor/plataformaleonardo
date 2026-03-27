import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// API: /api/projections?period=12&scenario=baseline
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const period = Number(searchParams.get("period") || 12)
    const scenario = searchParams.get("scenario") || "baseline"
    // Buscar todas as transações futuras de parcelados do usuário
    const now = new Date()
    const futureTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        category: "Parcelado",
        date: { gte: now },
      },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    })

    // Agrupar por mês/ano
    const monthlyMap = new Map<string, number>()
    let lastDate = null
    for (const t of futureTransactions) {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(t.amount))
      if (!lastDate || d > lastDate) lastDate = d
    }
    // Maior valor mensal
    const maxImpact = Math.max(...Array.from(monthlyMap.values(), (v) => v || 0), 0)
    const endStr = lastDate ? lastDate.toLocaleDateString() : "-"

    return NextResponse.json({
      period,
      scenario,
      summary: {
        avgIncome: 5000,
        avgExpense: 3500 + maxImpact,
        avgSaving: 1500 - maxImpact,
        finalNetWorth: 80000,
        status: "dentro do planejado",
      },
      series: Array.from({ length: period }, (_, i) => ({
        month: i + 1,
        netWorth: 20000 + i * 1500 - maxImpact * i,
        income: 5000,
        expense: 3500 + maxImpact,
        saving: 1500 - maxImpact,
        investment: 10000 + i * 1000,
      })),
      goals: [
        { name: "Reserva de Emergência", status: "atinge", monthsToGoal: 8 },
        { name: "Viagem Europa", status: "não atinge", monthsToGoal: null },
      ],
      insights: [
        `Parcelados comprometem R$ ${maxImpact.toLocaleString()} por mês até ${endStr}.`,
        "Mantendo o padrão atual, seu patrimônio cresce 60% em 5 anos.",
        "A despesa atual reduz sua capacidade de aporte em 30%.",
      ],
    })
  } catch (error) {
    console.error("Erro projeções:", error)
    return NextResponse.json({ error: "Erro ao calcular projeções" }, { status: 500 })
  }
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"
