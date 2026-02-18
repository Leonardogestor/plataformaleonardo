import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCategorizationMetrics } from "@/lib/categorization-analytics"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const metrics = await getCategorizationMetrics(session.user.id)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Erro ao calcular métricas de categorização:", error)
    return NextResponse.json(
      { error: "Erro ao calcular métricas" },
      { status: 500 }
    )
  }
}
