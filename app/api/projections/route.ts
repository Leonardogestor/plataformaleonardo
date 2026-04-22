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

    // Buscar dados reais do usuário para cálculo
    const [transactions, accounts, investments] = await Promise.all([
      // Transações dos últimos 3 meses para calcular média
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
            lte: now,
          },
        },
        select: { amount: true, type: true },
      }),
      // Saldos das contas
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { balance: true },
      }),
      // Total de investimentos
      prisma.investment.findMany({
        where: { userId: session.user.id },
        select: { currentValue: true },
      }),
    ])

    // Calcular médias reais (total dividido pelo número de meses, não de transações)
    const monthsCount = 3
    const incomeTransactions = transactions.filter((t) => t.type === "INCOME")
    const expenseTransactions = transactions.filter((t) => t.type === "EXPENSE")

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const avgIncome = totalIncome / monthsCount
    const avgExpense = totalExpense / monthsCount

    const totalAccounts = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
    const totalInvestments = investments.reduce(
      (sum, inv) => sum + Number(inv.currentValue || 0),
      0
    )
    const currentNetWorth = totalAccounts + totalInvestments

    const avgSaving = avgIncome - avgExpense
    const finalNetWorth = currentNetWorth + avgSaving * period

    // Buscar metas reais do usuário
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      select: { name: true, targetAmount: true, currentAmount: true, deadline: true },
    })

    const goalsData = goals.map((goal) => {
      const progress = Number(goal.currentAmount || 0) / Number(goal.targetAmount || 1)
      const monthsToGoal = goal.deadline
        ? Math.max(
            0,
            Math.ceil(
              (new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
            )
          )
        : null

      return {
        name: goal.name,
        status: progress >= 1 ? "atinge" : "não atinge",
        monthsToGoal,
        progress: Math.min(100, progress * 100),
      }
    })

    // Gerar insights baseados nos dados reais
    const insights = []
    if (maxImpact > 0) {
      insights.push(
        `Parcelados comprometem R$ ${maxImpact.toLocaleString()} por mês até ${endStr}.`
      )
    }
    if (avgSaving > 0) {
      const projectedGrowth = ((avgSaving * 60) / currentNetWorth) * 100
      insights.push(
        `Mantendo o padrão atual, seu patrimônio cresce ${projectedGrowth.toFixed(0)}% em 5 anos.`
      )
    }
    if (avgExpense > 0 && avgIncome > 0) {
      const expenseRatio = (avgExpense / avgIncome) * 100
      if (expenseRatio > 70) {
        insights.push(
          `Suas despesas representam ${expenseRatio.toFixed(0)}% da sua receita. Considere reduzir para aumentar investimentos.`
        )
      }
    }

    return NextResponse.json({
      period,
      scenario,
      summary: {
        avgIncome,
        avgExpense: avgExpense + maxImpact,
        avgSaving: avgSaving - maxImpact,
        finalNetWorth,
        status: avgSaving > 0 ? "dentro do planejado" : "abaixo do planejado",
      },
      series: Array.from({ length: period }, (_, i) => ({
        month: i + 1,
        netWorth: currentNetWorth + avgSaving * i - maxImpact * i,
        income: avgIncome,
        expense: avgExpense + maxImpact,
        saving: avgSaving - maxImpact,
        investment: totalInvestments + Math.max(0, avgSaving - maxImpact) * i * 0.7, // 70% da economia aplicada
      })),
      goals: goalsData,
      insights,
    })
  } catch (error) {
    console.error("Erro projeções:", error)
    return NextResponse.json({ error: "Erro ao calcular projeções" }, { status: 500 })
  }
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"
