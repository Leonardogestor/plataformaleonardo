import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getDashboardMetrics,
  getCategoryBreakdown,
  getMonthlyEvolution,
  getRecentTransactions,
  getInsights,
  getRiscoConsolidado,
  getTendenciaPatrimonial,
  getInsightsEstrategicos,
  getIndependenciaFinanceira,
} from "@/lib/dashboard-queries"

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
  independencia_financeira: null as {
    patrimonioAtual: number
    despesaAnual: number
    patrimonioNecessario: number
    percentual: number
    mensagem: string
  } | null,
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      metrics,
      categories,
      monthlyData,
      recentTransactions,
      insights,
      risco_consolidado,
      tendencia_patrimonial,
      insightsEstrategicos,
      independencia_financeira,
    ] = await Promise.all([
      getDashboardMetrics(session.user.id),
      getCategoryBreakdown(session.user.id),
      getMonthlyEvolution(session.user.id),
      getRecentTransactions(session.user.id, 10),
      getInsights(session.user.id),
      getRiscoConsolidado(session.user.id),
      getTendenciaPatrimonial(session.user.id),
      getInsightsEstrategicos(session.user.id),
      getIndependenciaFinanceira(session.user.id),
    ])

    return NextResponse.json({
      metrics,
      categories,
      monthlyData,
      recentTransactions,
      insights,
      risco_consolidado,
      tendencia_patrimonial,
      impacto_longo_prazo: insightsEstrategicos.impacto_longo_prazo,
      decisao_recomendada: insightsEstrategicos.decisao_recomendada,
      independencia_financeira,
    })
  } catch (error) {
    console.error("Dashboard API Error:", error)
    // Se o banco estiver inacessível, retorna dados vazios para o dashboard ainda renderizar
    const isDbError =
      error instanceof Error &&
      (error.name === "PrismaClientInitializationError" ||
        error.message?.includes("Can't reach database") ||
        error.message?.includes("Connection refused"))
    if (isDbError) {
      return NextResponse.json(emptyDashboardData)
    }
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    )
  }
}
