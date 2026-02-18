import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/planning?startMonth=YYYY-MM&endMonth=YYYY-MM
// Retorna matriz: meses e por categoria o planejado x realizado por mês
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let startMonth = searchParams.get("startMonth")
    let endMonth = searchParams.get("endMonth")

    const now = new Date()
    if (!endMonth) {
      endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    }
    if (!startMonth) {
      const parts = endMonth.split("-").map(Number)
      const y = parts[0] ?? now.getFullYear()
      const m = parts[1] ?? now.getMonth() + 1
      const d = new Date(y, m - 1, 1)
      d.setMonth(d.getMonth() - 5)
      startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    }

    const startParts = startMonth.split("-").map(Number)
    const endParts = endMonth.split("-").map(Number)
    const sy = startParts[0] ?? 0
    const sm = startParts[1] ?? 1
    const ey = endParts[0] ?? 0
    const em = endParts[1] ?? 1
    if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(ey) || !Number.isFinite(em)) {
      return NextResponse.json({ error: "Meses inválidos" }, { status: 400 })
    }

    const months: string[] = []
    let y = sy
    let m = sm
    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${String(m).padStart(2, "0")}`)
      if (m === 12) {
        m = 1
        y++
      } else {
        m++
      }
    }

    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        month: { in: months },
      },
      select: { category: true, month: true, amount: true },
    })

    const allCategories = new Set<string>()
    const plannedByCatMonth = new Map<string, Map<string, number>>()
    budgets.forEach((b) => {
      allCategories.add(b.category)
      if (!plannedByCatMonth.has(b.category)) {
        plannedByCatMonth.set(b.category, new Map())
      }
      plannedByCatMonth.get(b.category)!.set(b.month, Number(b.amount))
    })

    const startDate = new Date(sy, sm - 1, 1)
    const endDate = new Date(ey, em, 0)
    endDate.setHours(23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      select: { category: true, amount: true, date: true },
    })

    const actualByCatMonth = new Map<string, Map<string, number>>()
    transactions.forEach((t) => {
      const month = t.date.toISOString().slice(0, 7)
      allCategories.add(t.category)
      if (!actualByCatMonth.has(t.category)) {
        actualByCatMonth.set(t.category, new Map())
      }
      const map = actualByCatMonth.get(t.category)!
      map.set(month, (map.get(month) || 0) + Number(t.amount))
    })

    const categories = Array.from(allCategories).sort().map((category) => {
      const byMonth = months.map((month) => {
        const planned = plannedByCatMonth.get(category)?.get(month) ?? 0
        const actual = actualByCatMonth.get(category)?.get(month) ?? 0
        return { month, planned, actual }
      })
      return { category, byMonth }
    })

    return NextResponse.json({ months, categories })
  } catch (error) {
    console.error("Erro planejamento:", error)
    return NextResponse.json({ error: "Erro ao buscar planejamento" }, { status: 500 })
  }
}
