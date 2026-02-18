import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const DIAS_ALERTA = 30

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const now = new Date()
    const limite = new Date(now)
    limite.setDate(limite.getDate() + DIAS_ALERTA)

    const documentos = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        vencimentoAt: {
          gte: now,
          lte: limite,
        },
      },
      orderBy: { vencimentoAt: "asc" },
    })

    const vencidos = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        vencimentoAt: { lt: now },
      },
      orderBy: { vencimentoAt: "asc" },
    })

    return NextResponse.json({
      proximosVencimentos: documentos,
      vencidos,
    })
  } catch (error) {
    console.error("Erro ao buscar alertas de vencimento:", error)
    return NextResponse.json(
      { error: "Erro ao buscar alertas" },
      { status: 500 }
    )
  }
}
