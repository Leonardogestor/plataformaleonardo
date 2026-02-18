import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getDashboardMetrics,
  getCategoryBreakdown,
  getMonthlyEvolution,
  getRecentTransactions,
  getInsights,
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
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [metrics, categories, monthlyData, recentTransactions, insights] =
      await Promise.all([
        getDashboardMetrics(session.user.id),
        getCategoryBreakdown(session.user.id),
        getMonthlyEvolution(session.user.id),
        getRecentTransactions(session.user.id, 10),
        getInsights(session.user.id),
      ])

    return NextResponse.json({
      metrics,
      categories,
      monthlyData,
      recentTransactions,
      insights,
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
