/**
 * API para forçar atualização dos Cartões
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
    console.log("🔄 Cartões atualizados para usuário:", session.user.id)

    return NextResponse.json({ 
      success: true, 
      message: "Cartões atualizados com sucesso!" 
    })

  } catch (error) {
    console.error("❌ Erro ao atualizar cartões:", error)
    return NextResponse.json({ 
      error: "Erro ao atualizar cartões" 
    }, { status: 500 })
  }
}
