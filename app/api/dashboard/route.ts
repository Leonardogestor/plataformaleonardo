import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

import { DashboardService } from "@/lib/dashboard-service"

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

    // Usar o DashboardService para consolidar os dados do motor
    const dashboardData = await DashboardService.getDashboardData(session.user.id, month, year)
    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 })
  }
}
