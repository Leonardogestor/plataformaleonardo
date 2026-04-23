import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "../../../lib/ProjectionsEngine"

// API: /api/projections?period=12&scenario=baseline
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const period = Number(searchParams.get("period") || 12)
    // Buscar dados reais do usuário
    const userId = session.user.id
    const transactions = await prisma.transaction.findMany({ where: { userId } })
    const accounts = await prisma.account.findMany({ where: { userId } })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    // Dados de entrada para o motor
    const dados = {
      transactions,
      accounts,
      idade: user?.age || 35,
    }
    // Rodar os 3 cenários
    const pessimista = ProjectionsEngine.calcularProjecao(period, { ...dados, scenario: "pessimista" })
    const base = ProjectionsEngine.calcularProjecao(period, { ...dados, scenario: "base" })
    const otimista = ProjectionsEngine.calcularProjecao(period, { ...dados, scenario: "otimista" })
    return NextResponse.json({ pessimista, base, otimista })
  } catch (error) {
    console.error("Erro projeções:", error)
    return NextResponse.json({ error: "Erro ao calcular projeções" }, { status: 500 })
  }
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"
