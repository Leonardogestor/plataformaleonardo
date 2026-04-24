import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { OrchestrationService } from "@/lib/orchestration-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const { month, year } = await request.json()
    try {
      await OrchestrationService.syncAll(session.user.id, month, year)
      return NextResponse.json({ success: true, message: "Plataforma 100% Atualizada" })
    } catch (prismaError) {
      console.error(
        "[Sync/Launch] Erro Prisma:",
        JSON.stringify(prismaError, Object.getOwnPropertyNames(prismaError))
      )
      return NextResponse.json(
        { error: "Erro Prisma ao sincronizar", details: prismaError instanceof Error ? prismaError.message : String(prismaError) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erro na sincronização total:", error)
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 })
  }
}
