import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const conditionSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME"]).optional(),
    amountMin: z.number().optional(),
    amountMax: z.number().optional(),
    descriptionRegex: z.string().optional(),
  })
  .optional()

const ruleSchema = z.object({
  pattern: z.string().min(1),
  category: z.string().min(1),
  condition: conditionSchema,
})

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rules = await prisma.categoryRule.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isActive: "desc" }, { matchCount: "desc" }],
      select: {
        id: true,
        pattern: true,
        category: true,
        matchCount: true,
        isActive: true,
        conditionJson: true,
      },
    })

    return NextResponse.json(rules)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar regras" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ruleSchema.parse(body)
    const { pattern, category, condition } = parsed
    const conditionJson =
      condition && Object.keys(condition).length > 0
        ? JSON.stringify(condition)
        : null

    const existing = await prisma.categoryRule.findUnique({
      where: {
        userId_pattern: {
          userId: session.user.id,
          pattern: pattern.toLowerCase(),
        },
      },
    })

    if (existing) {
      const updated = await prisma.categoryRule.update({
        where: { id: existing.id },
        data: { category, isActive: true, conditionJson },
      })
      return NextResponse.json(updated)
    }

    const rule = await prisma.categoryRule.create({
      data: {
        userId: session.user.id,
        pattern: pattern.toLowerCase(),
        category,
        conditionJson,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar regra" }, { status: 500 })
  }
}
