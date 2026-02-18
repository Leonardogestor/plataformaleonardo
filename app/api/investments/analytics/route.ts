import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  normalizeInvestmentRow,
  calcRiscoConsolidadoPortfolio,
  calcIndiceSharpe,
  calcConcentracaoPorAtivo,
  calcRendaPassivaMensal,
  calcSugestaoRebalanceamento,
} from "@/lib/investment-analytics"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const raw = await prisma.investment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    const investments = raw.map((i) =>
      normalizeInvestmentRow({
        id: i.id,
        name: i.name,
        type: i.type,
        amount: i.amount,
        currentValue: i.currentValue,
        profitability: i.profitability,
        acquiredAt: i.acquiredAt,
      })
    )

    const risco_consolidado_portfolio = calcRiscoConsolidadoPortfolio(investments)
    const indice_sharpe = calcIndiceSharpe(investments)
    const concentracao_por_ativo = calcConcentracaoPorAtivo(investments)
    const renda_passiva_mensal = calcRendaPassivaMensal(investments)
    const sugestao_rebalanceamento = calcSugestaoRebalanceamento(
      investments,
      concentracao_por_ativo
    )

    return NextResponse.json({
      risco_consolidado_portfolio,
      indice_sharpe,
      concentracao_por_ativo,
      renda_passiva_mensal,
      sugestao_rebalanceamento,
    })
  } catch (error) {
    console.error("Error fetching investment analytics:", error)
    return NextResponse.json(
      { error: "Erro ao calcular analytics dos investimentos" },
      { status: 500 }
    )
  }
}
