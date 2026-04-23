import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "@/lib/ProjectionsEngine"

// Endpoint para disparar recálculo global das projeções (dummy, placeholder)
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    // Buscar dados necessários do Prisma
    const userId = session.user.id
    const transactions = await prisma.transaction.findMany({ where: { userId } })
    const accounts = await prisma.account.findMany({ where: { userId } })
    const investments = await prisma.investment.findMany({ where: { userId } })
    // Chamar o ProjectionsEngine centralizado
    const projections = ProjectionsEngine.calcularProjecao(12, { transactions, accounts, investments })
    return NextResponse.json({ projections })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao recalcular projeções" }, { status: 500 })
  }
}
