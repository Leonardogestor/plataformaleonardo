/**
 * API para processar documentos de investimentos
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { document } = await request.json()

    if (!document) {
      return NextResponse.json({ error: "Documento não fornecido" }, { status: 400 })
    }

    // TODO: Implementar processamento real de documentos de investimento
    // Por enquanto, apenas registrar que o documento foi recebido
    console.log("📄 Documento de investimento recebido:", document.name)
    
    // Salvar registro do processamento
    await prisma.document.create({
      data: {
        userId: session.user.id,
        name: `Investimento - ${document.name}`,
        fileName: document.name,
        mimeType: document.type || "application/pdf",
        fileSize: document.size || 0,
        status: DocumentStatus.PROCESSING,
        extractedText: "Documento de investimento aguardando processamento",
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: "Documento de investimento recebido para processamento" 
    })

  } catch (error) {
    console.error("❌ Erro ao processar documento de investimento:", error)
    return NextResponse.json({ 
      error: "Erro ao processar documento" 
    }, { status: 500 })
  }
}
