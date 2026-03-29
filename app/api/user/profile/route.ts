import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  age: z.string().min(1, "Idade é obrigatória"),
  gender: z.enum(["male", "female", "other"]),
  location: z.string().min(3, "Localização é obrigatória"),
  isEmployed: z.boolean(),
  employmentType: z.string().optional(),
  monthlyIncome: z.string().optional(),
  hasInvestments: z.boolean(),
  investmentGoals: z.array(z.string()),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = profileSchema.parse(body)

    // Salvar ou atualizar perfil do usuário
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        // Se o modelo User não tiver campo profile, vamos salvar como JSON em outro campo ou criar tabela separada
      },
    })

    // Salvar perfil em tabela separada se existir, ou criar metas baseadas no perfil
    if (validatedData.investmentGoals.length > 0) {
      await prisma.goal.deleteMany({
        where: { userId: session.user.id },
      })

      const goals = validatedData.investmentGoals.map((goal, index) => ({
        userId: session.user.id,
        name: goal,
        targetAmount: getDefaultTargetAmount(goal),
        currentAmount: 0,
        deadline: getDefaultTargetDate(goal),
        priority: index + 1,
        category: mapGoalToCategory(goal) as any,
      }))

      await prisma.goal.createMany({
        data: goals,
      })
    }

    return NextResponse.json({
      message: "Perfil configurado com sucesso",
      user: {
        id: user.id,
        name: user.name,
        setupCompleted: true,
      },
    })
  } catch (error) {
    console.error("Erro ao configurar perfil:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "Erro ao configurar perfil",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Erro ao buscar perfil:", error)
    return NextResponse.json(
      {
        error: "Erro ao buscar perfil",
      },
      { status: 500 }
    )
  }
}

// Funções auxiliares
function getDefaultTargetAmount(goal: string): number {
  const targets: Record<string, number> = {
    Aposentadoria: 1000000,
    "Comprar imóvel": 300000,
    Viagem: 15000,
    Educação: 50000,
    "Reserva de emergência": 20000,
    "Carro próprio": 50000,
    "Independência financeira": 500000,
  }
  return targets[goal] || 10000
}

function getDefaultTargetDate(goal: string): Date {
  const now = new Date()
  const months: Record<string, number> = {
    Aposentadoria: 360, // 30 anos
    "Comprar imóvel": 60, // 5 anos
    Viagem: 12, // 1 ano
    Educação: 24, // 2 anos
    "Reserva de emergência": 12, // 1 ano
    "Carro próprio": 36, // 3 anos
    "Independência financeira": 120, // 10 anos
  }

  const targetMonths = months[goal] || 12
  return new Date(now.setMonth(now.getMonth() + targetMonths))
}

function mapGoalToCategory(goal: string): string {
  const categories: Record<string, string> = {
    Aposentadoria: "long_term",
    "Comprar imóvel": "major_purchase",
    Viagem: "lifestyle",
    Educação: "education",
    "Reserva de emergência": "emergency",
    "Carro próprio": "major_purchase",
    "Independência financeira": "long_term",
  }
  return categories[goal] || "general"
}
