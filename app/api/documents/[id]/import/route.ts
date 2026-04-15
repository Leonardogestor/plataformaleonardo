import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { detectBankFromText } from "@/lib/bank-parsers"
import {
  parseTransactionsWithAI,
  convertToNormalizedTransaction,
} from "@/lib/ai-transaction-parser"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const document = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        extractedText: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    const alreadyLinked = await prisma.transaction.count({
      where: { userId: session.user.id, documentId: id },
    })

    if (alreadyLinked > 0) {
      return NextResponse.json({
        message: "Documento já importado anteriormente",
        results: {
          success: 0,
          failed: 0,
          alreadyImported: true,
          importedCount: alreadyLinked,
        },
      })
    }

    const documentWindow = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      select: { createdAt: true },
    })

    if (documentWindow) {
      const windowStart = new Date(documentWindow.createdAt.getTime() - 5 * 60 * 1000)
      const windowEnd = new Date(documentWindow.createdAt.getTime() + 5 * 60 * 1000)
      const legacyTransactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          documentId: null,
          externalTransactionId: { startsWith: "pdf:" },
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        select: { id: true },
        take: 2000,
      })

      if (legacyTransactions.length > 0) {
        await prisma.transaction.updateMany({
          where: { id: { in: legacyTransactions.map((transaction) => transaction.id) } },
          data: { documentId: id },
        })

        return NextResponse.json({
          message: "Importação concluída",
          results: {
            success: legacyTransactions.length,
            failed: 0,
            errors: [],
            alreadyImported: false,
            importedCount: legacyTransactions.length,
            linkedExisting: true,
          },
        })
      }
    }

    if (!document.extractedText || document.extractedText.trim().length < 10) {
      return NextResponse.json(
        { error: "Documento sem texto extraído suficiente para importação" },
        { status: 400 }
      )
    }

    const bank = detectBankFromText(document.extractedText)
    const parsed = await parseTransactionsWithAI(document.extractedText, "pdf", bank)

    if (parsed.transactions.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma transação identificada no documento" },
        { status: 422 }
      )
    }

    // Converte para NormalizedTransaction
    const normalizedTransactions = parsed.transactions.map((tx) =>
      convertToNormalizedTransaction(tx, id)
    )

    const result = await importTransactionsFromPdfWithDedup(session.user.id, normalizedTransactions)

    const linkedCount = await prisma.transaction.count({
      where: { userId: session.user.id, documentId: id },
    })

    return NextResponse.json({
      message: "Importação concluída",
      results: {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        alreadyImported: false,
        importedCount: linkedCount,
      },
    })
  } catch (error) {
    console.error("Erro ao importar transações do documento:", error)
    return NextResponse.json({ error: "Erro ao importar transações do documento" }, { status: 500 })
  }
}
