import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "../../../lib/ProjectionsEngine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = Number(searchParams.get("period") || 60)
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const userId = session.user.id

    // Tentar snapshot consolidado primeiro (sem query extra ao banco)
    const snapshot = await prisma.financialSummary.findUnique({
      where: { userId_month_year: { userId, month, year } },
      select: {
        evolucaoPatrimonial: true,
        saldoAcumulado: true,
        aporteMedio: true,
        totalExpenses: true,
        idade: true,
      },
    })

    if (snapshot?.evolucaoPatrimonial) {
      return NextResponse.json({ evolucaoPatrimonial: snapshot.evolucaoPatrimonial })
    }

    // Fallback: calcular com dados mínimos necessários — sem carregar todas as transações
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 1)

    const [accounts, anamnesis, investmentSum, expenseSum] = await Promise.all([
      prisma.account.findMany({
        where: { userId, isActive: true },
        select: { balance: true },
      }),
      prisma.userAnamnesis.findUnique({ where: { userId } }),
      // Soma de investimentos do mês — sem carregar linhas individuais
      prisma.transaction.aggregate({
        where: { userId, type: "INVESTMENT", date: { gte: startOfMonth, lt: endOfMonth } },
        _sum: { amount: true },
      }),
      // Soma de despesas do mês para calcular despesasMensais
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: { gte: startOfMonth, lt: endOfMonth } },
        _sum: { amount: true },
      }),
    ])

    let idade = 35
    if (anamnesis?.birthDate) {
      const birthDate = new Date(anamnesis.birthDate)
      const hoje = new Date()
      idade = hoje.getFullYear() - birthDate.getFullYear()
      const m = hoje.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < birthDate.getDate())) idade--
    }

    const patrimonioAtual = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
    const aporteMensal = Number(investmentSum._sum.amount ?? 0)
    const despesasMensais = Number(expenseSum._sum.amount ?? 0)

    const taxaBase = 0.004 // ~4.8% a.a. (referência CDI moderado)

    const pessimista = ProjectionsEngine.calcularProjecao(period, {
      patrimonioAtual,
      aporteMensal: aporteMensal * 0.7, // 30% menos aporte
      taxaJurosMensal: taxaBase * 0.6,  // 60% do rendimento base
      idade,
      despesasMensais: despesasMensais * 1.15, // 15% mais despesas
    })

    const base = ProjectionsEngine.calcularProjecao(period, {
      patrimonioAtual,
      aporteMensal,
      taxaJurosMensal: taxaBase,
      idade,
      despesasMensais,
    })

    const otimista = ProjectionsEngine.calcularProjecao(period, {
      patrimonioAtual,
      aporteMensal: aporteMensal * 1.3, // 30% mais aporte
      taxaJurosMensal: taxaBase * 1.5,  // 50% mais rendimento
      idade,
      despesasMensais: despesasMensais * 0.9, // 10% menos despesas
    })

    return NextResponse.json({ pessimista, base, otimista })
  } catch (error) {
    console.error("Erro projeções:", error)
    return NextResponse.json({ error: "Erro ao calcular projeções" }, { status: 500 })
  }
}
