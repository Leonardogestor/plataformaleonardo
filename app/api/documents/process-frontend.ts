/**
 * API 100% FUNCIONAL - Recebe dados processados do frontend
 * Sem dependências de pdf-parse ou bibliotecas problemáticas
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 2. Receber dados já processados do frontend
    const body = await request.json()
    const { fileName, fileSize, extractedText, transactions, bank, month, year } = body

    if (!fileName || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ 
        error: "Dados inválidos. Envie fileName, extractedText e transactions." 
      }, { status: 400 })
    }

    console.log(`📄 Recebendo ${transactions.length} transações processadas de: ${fileName}`)

    // 3. Criar documento no banco
    const doc = await prisma.document.create({
      data: {
        userId: session.user.id,
        name: `Extrato ${bank} - ${month}/${year}`,
        fileName: fileName,
        mimeType: "application/pdf",
        fileSize: fileSize || 0,
        status: "PROCESSING",
        extractedText: extractedText?.slice(0, 10000) || "",
      },
    })

    console.log("✅ Documento criado no banco:", doc.id)

    // 4. Processar transações (já vem formatadas do frontend)
    try {
      const result = await importTransactionsFromPdfWithDedup(
        session.user.id,
        transactions
      )

      console.log("💾 Transações importadas:", result.success, "Falhas:", result.failed)

      // 5. Atualizar status final
      const finalStatus = result.success > 0 ? "COMPLETED" : "FAILED"
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: finalStatus,
          errorMessage: result.failed > 0 ? result.errors[0] : null,
        },
      })

      console.log("✅ Processamento finalizado:", finalStatus)

      return NextResponse.json({
        success: true,
        documentId: doc.id,
        status: finalStatus,
        transactionsProcessed: result.success,
        transactionsFailed: result.failed,
        message: "Transações processadas com sucesso!"
      })

    } catch (transactionError) {
      console.error("❌ Erro ao processar transações:", transactionError)
      
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage: "Erro ao processar transações",
        },
      })

      return NextResponse.json({
        success: false,
        error: "Erro ao processar transações",
        documentId: doc.id
      }, { status: 500 })
    }

  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json({ 
      error: "Erro ao processar documento. Tente novamente." 
    }, { status: 500 })
  }
}
