/**
 * Versão temporária do processamento de PDF que funciona sem Blob Storage
 * Processa o buffer diretamente no momento do upload
 */

import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromPdf } from "@/lib/document-extract"
import { detectBankFromText } from "@/lib/bank-parsers"
import {
  importTransactionsFromPdfWithDedup,
  type NormalizedTransaction,
} from "@/lib/transaction-import"
import { hybridParseTransactions, refineTransactionsWithAI } from "@/lib/ai-transaction-parser"

const DEFAULT_CATEGORY = "Outros"
const MAX_TRANSACTIONS_PER_DOCUMENT = 5000

/**
 * Processa um PDF diretamente do buffer (sem salvar no Blob Storage)
 */
export async function processPdfFromBuffer(documentId: string, buffer: Buffer): Promise<void> {
  const startedAt = new Date()
  let syncLogId: string | null = null

  try {
    console.log("Processando PDF do buffer para documento:", documentId)

    // Criar log de processamento
    const logEntry = await prisma.syncLog.create({
      data: {
        documentId,
        startedAt,
        status: DocumentStatus.PROCESSING,
      },
    })
    syncLogId = logEntry.id

    // Extrair texto do PDF
    const text = await extractTextFromPdf(buffer)

    if (!text || text.length < 10) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: "Could not extract text from PDF",
          extractedText: text || null,
          updatedAt: finishedAt,
        },
      })
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          finishedAt,
          durationMs,
          transactionsProcessed: 0,
          status: DocumentStatus.FAILED,
          error: "Could not extract text from PDF",
        },
      })
      return
    }

    // Salvar o texto extraído no documento
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: text.slice(0, 100_000),
      },
    })

    // Processar transações usando apenas o parser de IA (OpenAI)
    let transactions: NormalizedTransaction[] = []
    let parsingMethod = "ai_only"
    const bank = detectBankFromText(text)
    const aiResult = await hybridParseTransactions(text, "pdf", bank)
    if (aiResult.transactions.length > 0) {
      transactions = aiResult.transactions.map((t) => ({
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        date: t.date,
      }))
      parsingMethod = "ai_only"
      console.info(`AI parsing (forçado) retornou ${transactions.length} transações`)
    } else {
      console.warn("AI parsing não encontrou transações.")
    }

    // Buscar o documento para obter o userId
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true },
    })

    if (!doc) {
      throw new Error("Documento não encontrado")
    }

    const result = await importTransactionsFromPdfWithDedup(doc.userId, transactions)
    const transactionsProcessed = result.success
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    const status =
      result.failed > 0 && result.success === 0 ? DocumentStatus.FAILED : DocumentStatus.COMPLETED
    const errorMessage = result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        errorMessage: status === DocumentStatus.FAILED ? errorMessage : null,
        updatedAt: finishedAt,
      },
    })

    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        finishedAt,
        durationMs,
        transactionsProcessed,
        status,
        error: errorMessage,
      },
    })

    console.info(
      JSON.stringify({
        type: "pdf_processing_buffer",
        documentId,
        durationMs,
        transactionsProcessed,
        status,
        parsingMethod,
      })
    )
  } catch (error) {
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const message = error instanceof Error ? error.message : String(error)

    try {
      await prisma.document.updateMany({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED, errorMessage: message, updatedAt: finishedAt },
      })
      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            finishedAt,
            durationMs,
            transactionsProcessed: 0,
            status: DocumentStatus.FAILED,
            error: message,
          },
        })
      }
    } catch (e) {
      console.error("Failed to update document/syncLog after PDF processing error", e)
    }

    console.info(
      JSON.stringify({
        type: "pdf_processing_buffer",
        documentId,
        durationMs,
        transactionsProcessed: 0,
        status: DocumentStatus.FAILED,
        error: message,
      })
    )
  }
}
