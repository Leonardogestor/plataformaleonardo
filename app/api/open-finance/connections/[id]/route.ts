import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const { id } = await params

    const connection = await prisma.bankConnection.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!connection) {
      return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { account: { connectionId: id } },
        data: { accountId: null },
      }),
      prisma.account.deleteMany({ where: { connectionId: id } }),
      prisma.bankConnection.delete({ where: { id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[open-finance/connections DELETE]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao desconectar" },
      { status: 500 }
    )
  }
}
