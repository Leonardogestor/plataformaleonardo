import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  getLiquidezPorTipo,
  calcCustoOportunidadeMensal,
  calcPercentualPatrimonioImprodutivo,
  type AccountType,
} from "@/lib/accounts-analytics"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const raw = await prisma.account.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { id: true, type: true, balance: true },
    })

    const accounts = raw.map((a) => ({
      id: a.id,
      type: a.type as AccountType,
      balance: Number(a.balance),
    }))

    const liquidez_por_conta = accounts.map((a) => ({
      accountId: a.id,
      liquidez: getLiquidezPorTipo(a.type),
    }))

    const custo_oportunidade_mensal = calcCustoOportunidadeMensal(accounts)
    const percentual_patrimonio_improdutivo = calcPercentualPatrimonioImprodutivo(accounts)

    return NextResponse.json({
      liquidez_por_conta,
      custo_oportunidade_mensal: Math.round(custo_oportunidade_mensal * 100) / 100,
      percentual_patrimonio_improdutivo: Math.round(percentual_patrimonio_improdutivo * 10) / 10,
    })
  } catch (error) {
    console.error("Erro ao calcular analytics de contas:", error)
    return NextResponse.json(
      { error: "Erro ao calcular analytics das contas" },
      { status: 500 }
    )
  }
}
