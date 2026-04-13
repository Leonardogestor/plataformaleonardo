import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { DocumentStatus } from "@prisma/client"

const contributionSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  date: z.string().datetime().optional(),
  note: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
    })

    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const validated = contributionSchema.parse(body)

    const [contribution, updatedGoal] = await prisma.$transaction([
      prisma.goalContribution.create({
        data: {
          goalId: params.id,
          amount: validated.amount,
          date: validated.date ? new Date(validated.date) : new Date(),
          note: validated.note,
        },
      }),
      prisma.goal.update({
        where: { id: params.id },
        data: {
          currentAmount: {
            increment: validated.amount,
          },
        },
      }),
    ])

    // Verificar se a meta foi atingida
    if (Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount)) {
      await prisma.goal.update({
        where: { id: params.id },
        data: { status: DocumentStatus.COMPLETED },
      })
    }

    return NextResponse.json({ contribution, goal: updatedGoal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Erro ao adicionar contribuição:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
    })

    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })
    }

    const contributions = await prisma.goalContribution.findMany({
      where: { goalId: params.id },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(contributions)
  } catch (error) {
    console.error("Erro ao buscar contribuições:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
