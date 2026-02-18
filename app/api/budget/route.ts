import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// API: /api/budget?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    if (!month) {
      return NextResponse.json({ error: "Mês não informado" }, { status: 400 })
    }
    // Parse YYYY-MM
    const [year, m] = month.split("-").map(Number)
    if (!Number.isFinite(year) || !Number.isFinite(m)) {
      return NextResponse.json({ error: "Mês inválido" }, { status: 400 })
    }
    const y = year as number
    const mm = m as number
    const start = new Date(y, mm - 1, 1)
    const end = new Date(y, mm, 1)

    // Busca orçamentos definidos pelo usuário
    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id, month },
      select: { category: true, amount: true },
    })

    // Busca transações do mês (receitas e despesas)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: start, lt: end },
      },
      select: { type: true, category: true, amount: true },
    })
    const spentMap = new Map<string, number>()
    let receita_mes = 0
    transactions.forEach((t) => {
      const amount = Number(t.amount)
      if (t.type === "INCOME") {
        receita_mes += amount
      } else if (t.type === "EXPENSE") {
        spentMap.set(t.category, (spentMap.get(t.category) || 0) + amount)
      }
    })

    // Monta lista de categorias
    const allCategories = Array.from(
      new Set([...budgets.map((b) => b.category), ...transactions.map((t) => t.category)])
    )
    const total_orcamento = budgets.reduce((s, b) => s + Number(b.amount), 0)
    const disponivel_para_metas = receita_mes - total_orcamento

    const categories = allCategories.map((category) => {
      const budget = budgets.find((b) => b.category === category)?.amount || 0
      const spent = spentMap.get(category) || 0
      return { category, budget, spent }
    })

    // Impacto em metas: metas ativas e aporte mensal necessário
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { id: true, name: true, targetAmount: true, currentAmount: true, deadline: true },
    })
    const now = new Date()
    const metas = goals.map((g) => {
      const target = Number(g.targetAmount)
      const current = Number(g.currentAmount)
      const remaining = Math.max(0, target - current)
      const deadline = new Date(g.deadline)
      const monthsRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      const monthlyTarget = remaining / monthsRemaining
      return { id: g.id, name: g.name, monthlyTarget, remaining }
    })
    const total_necessario_metas = metas.reduce((s, m) => s + m.monthlyTarget, 0)
    const impacto_em_metas = {
      receita_mes,
      total_orcamento,
      disponivel_para_metas,
      total_necessario_metas,
      metas,
    }

    return NextResponse.json({ categories, impacto_em_metas })
  } catch (error) {
    console.error("Erro orçamento:", error)
    return NextResponse.json({ error: "Erro ao buscar orçamento" }, { status: 500 })
  }
}
