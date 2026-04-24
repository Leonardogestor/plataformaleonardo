import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardService, mapTransactionsToEngineInputs } from "@/lib/dashboard-service"

type IndependenciaFinanceira = {
  patrimonioAtual: number
  despesaAnual: number
  patrimonioNecessario: number
  percentual: number
  mensagem: string
}

const emptyDashboardData = {
  metrics: {
    netWorth: 0,
    monthIncome: 0,
    monthExpense: 0,
    cashFlow: 0,
    savingsRate: 0,
  },
  categories: [],
  monthlyData: [],
  recentTransactions: [],
  insights: [],
  risco_consolidado: "moderado" as const,
  tendencia_patrimonial: "estável" as const,
  impacto_longo_prazo: null as string | null,
  decisao_recomendada: null as string | null,
  independencia_financeira: null as IndependenciaFinanceira | null,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters for month and year
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    // Validate month and year
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      return NextResponse.json({ error: "Invalid month or year parameters" }, { status: 400 })
    }

    // Tenta buscar snapshot consolidado primeiro
    const snapshot = await import("@/lib/db").then(({ prisma }) =>
      prisma.financialSummary.findUnique({
        where: { userId_month_year: { userId: session.user.id, month, year } },
      })
    )
    if (snapshot) {
      return NextResponse.json(snapshot)
    }

    // Fallback: cálculo dinâmico
    const dashboardData = await DashboardService.getDashboardData(session.user.id, month, year)
    // Se não houver dados para o mês, buscar média dos últimos 3 meses com dados
    const hasData =
      dashboardData &&
      (dashboardData.receita > 0 ||
        dashboardData.despesasOperacionais > 0 ||
        dashboardData.investimento > 0)
    if (hasData) {
      return NextResponse.json({ ...dashboardData, isEstimated: false })
    }

    // Buscar os últimos 3 meses com dados reais — limite inferior de 3 meses para evitar full table scan
    const { prisma } = await import("@/lib/db")
    const threeMonthsAgo = new Date(year, month - 4, 1) // 3 meses antes do mês solicitado
    const lastMonths = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: threeMonthsAgo,
          lt: new Date(year, month, 1),
        },
      },
      select: { amount: true, type: true, category: true, date: true },
      orderBy: { date: "desc" },
    })
    // Agrupar por mês/ano
    const monthMap = new Map<string, typeof lastMonths>()
    for (const t of lastMonths) {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!monthMap.has(key)) monthMap.set(key, [])
      monthMap.get(key)!.push(t)
    }
    const monthsWithData = Array.from(monthMap.values()).slice(0, 3)
    if (monthsWithData.length === 0) {
      // Nenhum dado histórico: retornar estado vazio amigável
      return NextResponse.json({ ...emptyDashboardData, isEstimated: true })
    }
    // Calcular média dos meses
    let sum = { receita: 0, despesasOperacionais: 0, investimento: 0, resultado: 0, savingsRate: 0 }
    for (const txs of monthsWithData) {
      const { receita, despesasOperacionais, investimento } = mapTransactionsToEngineInputs(txs)
      const resultado = receita - despesasOperacionais
      const savingsRate = receita > 0 ? resultado / receita : 0
      sum.receita += receita
      sum.despesasOperacionais += despesasOperacionais
      sum.investimento += investimento
      sum.resultado += resultado
      sum.savingsRate += savingsRate
    }
    const n = monthsWithData.length
    const avg = {
      receita: sum.receita / n,
      despesasOperacionais: sum.despesasOperacionais / n,
      investimento: sum.investimento / n,
      resultado: sum.resultado / n,
      savingsRate: sum.savingsRate / n,
      isEstimated: true,
      month,
      year,
    }
    return NextResponse.json(avg)
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 })
  }
}
