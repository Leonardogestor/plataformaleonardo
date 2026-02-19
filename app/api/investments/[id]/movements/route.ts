import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params
  if (!id) return NextResponse.json({ error: "ID do investimento ausente." }, { status: 400 })
  try {
    const movements = await prisma.investmentMovement.findMany({
      where: { investmentId: id },
      orderBy: { date: "desc" },
    })
    return NextResponse.json(movements)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar movimentos." }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id: investmentId } = params
  if (!investmentId) {
    return NextResponse.json({ error: "ID do investimento ausente." }, { status: 400 })
  }
  try {
    const body = await request.json()
    const amount = Number(body?.amount)
    const type = body?.type === "RETIRADA" ? "RETIRADA" : "APORTE"
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido." }, { status: 400 })
    }
    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId: session.user.id },
    })
    if (!investment) {
      return NextResponse.json({ error: "Investimento não encontrado." }, { status: 404 })
    }
    const amountNum = Number(investment.amount)
    const currentNum = Number(investment.currentValue)
    const delta = type === "APORTE" ? amount : -amount
    await prisma.$transaction([
      prisma.investmentMovement.create({
        data: {
          investmentId,
          amount,
          type,
        },
      }),
      prisma.investment.update({
        where: { id: investmentId },
        data: {
          amount: amountNum + (type === "APORTE" ? amount : -amount),
          currentValue: currentNum + delta,
        },
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error creating movement:", error)
    return NextResponse.json({ error: "Erro ao registrar movimento." }, { status: 500 })
  }
}
