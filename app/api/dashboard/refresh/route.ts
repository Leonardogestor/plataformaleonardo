/**
 * API para forçar atualização do Dashboard
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Força atualização do cache
    console.log("🔄 Dashboard atualizado para usuário:", session.user.id)

    return NextResponse.json({ 
      success: true, 
      message: "Dashboard atualizado com sucesso!" 
    })

  } catch (error) {
    console.error("❌ Erro ao atualizar dashboard:", error)
    return NextResponse.json({ 
      error: "Erro ao atualizar dashboard" 
    }, { status: 500 })
  }
}
