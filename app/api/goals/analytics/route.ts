import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDashboardMetrics } from "@/lib/dashboard-queries"
import {
  getClassificacaoEstrategica,
  calcImpactoNoPatrimonio,
  detectarConflitoEntreMetas,
  type GoalRow,
} from "@/lib/goals-analytics"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    const [goalsRaw, metrics] = await Promise.all([
      prisma.goal.findMany({
        where: { userId },
        orderBy: { deadline: "asc" },
      }),
      getDashboardMetrics(userId),
    ])

    const now = new Date()
    const goals: GoalRow[] = goalsRaw.map((g) => {
      const target = Number(g.targetAmount)
      const current = Number(g.currentAmount)
      const remaining = Math.max(0, target - current)
      const daysRemaining = Math.ceil(
        (new Date(g.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30))
      const monthlyTarget = remaining / monthsRemaining
      return {
        id: g.id,
        name: g.name,
        targetAmount: target,
        currentAmount: current,
        deadline: g.deadline,
        status: g.status,
        monthlyTarget,
        remaining,
      }
    })

    const classificacao_estrategica = goals.map((g) => ({
      goalId: g.id,
      classificacao: getClassificacaoEstrategica(g),
    }))

    const impacto_no_patrimonio = calcImpactoNoPatrimonio(goals, metrics.netWorth)

    const disponivelMensal = metrics.cashFlow
    const conflito_entre_metas = detectarConflitoEntreMetas(goals, disponivelMensal)

    return NextResponse.json({
      classificacao_estrategica,
      impacto_no_patrimonio: {
        totalComprometido: impacto_no_patrimonio.totalComprometido,
        percentualPatrimonio: Math.round(impacto_no_patrimonio.percentualPatrimonio * 10) / 10,
        patrimonioLiquido: impacto_no_patrimonio.patrimonioLiquido,
      },
      conflito_entre_metas: {
        conflito: conflito_entre_metas.conflito,
        totalNecessarioMensal: conflito_entre_metas.totalNecessarioMensal,
        disponivelMensal: conflito_entre_metas.disponivelMensal,
        deficit: conflito_entre_metas.deficit,
        metasEmConflito: conflito_entre_metas.metasEmConflito,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar analytics de metas:", error)
    return NextResponse.json(
      { error: "Erro ao calcular analytics das metas" },
      { status: 500 }
    )
  }
}
