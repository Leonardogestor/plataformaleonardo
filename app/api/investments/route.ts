import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const investmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum([
    "STOCKS",
    "BONDS",
    "REAL_ESTATE",
    "FIXED_INCOME",
    "CRYPTO",
    "FUNDS",
    "INTERNATIONAL",
    "OTHER",
  ]),
  amount: z.number().positive("Valor investido deve ser positivo"),
  currentValue: z.number().positive("Valor atual deve ser positivo"),
  quantity: z.number().positive().optional(),
  institution: z.string().min(1, "Instituição é obrigatória"),
  ticker: z.string().optional(),
  acquiredAt: z.string(),
  maturityDate: z.string().optional(),
  profitability: z.number().optional(),
})

export async function GET(_: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(investments)
  } catch (error) {
    console.error("Error fetching investments:", error)
    return NextResponse.json({ error: "Erro ao buscar investimentos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = investmentSchema.parse(body)

    const investment = await prisma.investment.create({
      data: {
        ...validatedData,
        acquiredAt: new Date(validatedData.acquiredAt),
        maturityDate: validatedData.maturityDate ? new Date(validatedData.maturityDate) : null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(investment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating investment:", error)
    return NextResponse.json({ error: "Erro ao criar investimento" }, { status: 500 })
  }
}
