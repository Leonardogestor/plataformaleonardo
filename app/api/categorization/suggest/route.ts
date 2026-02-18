import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ruleMatchesTransaction } from "@/lib/categorization-analytics"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { description, type = "EXPENSE", amount = 0 } = body as {
      description?: string
      type?: string
      amount?: number
    }

    if (!description) {
      return NextResponse.json({ category: null })
    }

    const rules = await prisma.categoryRule.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: { matchCount: "desc" },
    })

    const typeStr = type === "INCOME" ? "INCOME" : "EXPENSE"
    const amountNum = Number(amount) || 0

    for (const rule of rules) {
      if (
        ruleMatchesTransaction(
          { pattern: rule.pattern, conditionJson: rule.conditionJson },
          description,
          typeStr,
          amountNum
        )
      ) {
        await prisma.categoryRule.update({
          where: { id: rule.id },
          data: { matchCount: { increment: 1 } },
        })

        return NextResponse.json({
          category: rule.category,
          ruleId: rule.id,
          pattern: rule.pattern,
        })
      }
    }

    return NextResponse.json({ category: null })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao sugerir categoria" }, { status: 500 })
  }
}
