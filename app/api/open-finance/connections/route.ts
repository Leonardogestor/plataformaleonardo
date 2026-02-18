import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const connections = await prisma.bankConnection.findMany({
      where: { userId: session.user.id },
      include: {
        accounts: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            institution: true,
            balance: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const list = connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      error: c.error,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      accounts: c.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        balance: Number(a.balance),
      })),
    }))

    return NextResponse.json({ connections: list })
  } catch (error) {
    console.error("[open-finance/connections GET]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar conexões" },
      { status: 500 }
    )
  }
}
