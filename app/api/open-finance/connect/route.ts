import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createConnectToken } from "@/lib/pluggy"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Open Finance não configurado. Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET." },
        { status: 500 }
      )
    }
    const accessToken = await createConnectToken(session.user.id, { avoidDuplicates: true })
    return NextResponse.json({ accessToken })
  } catch (error) {
    console.error("[open-finance/connect]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar link de conexão" },
      { status: 500 }
    )
  }
}
