/**
 * Async PDF processing pipeline: extract text → detect bank → parse → import transactions.
 * Called in background after upload; does not block the request.
 * Writes SyncLog and updates Document status (COMPLETED / FAILED).
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

/** Limite de transações por documento para evitar abuso e estouro de execução (ex: PDF com 10k+ linhas). */
const MAX_TRANSACTIONS_PER_DOCUMENT = 5000

/**
 * Process a document: fetch PDF from blob, extract text, parse, import transactions, update document and SyncLog.
 * Call this in a fire-and-forget way (void) so the request returns immediately.
 */
export async function processDocumentPdf(documentId: string): Promise<void> {
  const startedAt = new Date()
  let syncLogId: string | null = null

  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true, fileUrl: true, fileKey: true, mimeType: true },
    })

    if (!doc || !doc.fileUrl) {
      await prisma.document.updateMany({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: "Document or file URL not found",
          updatedAt: new Date(),
        },
      })
      return
    }

    const userId = doc.userId

    const logEntry = await prisma.syncLog.create({
      data: {
        documentId,
        startedAt,
        status: DocumentStatus.PROCESSING,
      },
    })
    syncLogId = logEntry.id

    const buffer = await fetch(doc.fileUrl)
      .then((r) => r.arrayBuffer())
      .then((ab) => Buffer.from(ab))
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
      console.info(
        JSON.stringify({
          type: "pdf_processing",
          documentId,
          durationMs,
          transactionsProcessed: 0,
          status: DocumentStatus.FAILED,
          error: "Could not extract text from PDF",
        })
      )
      return
    }

    // Sempre usar o parser de IA (OpenAI)
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

    const result = await importTransactionsFromPdfWithDedup(userId, transactions)
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
        extractedText: text.slice(0, 100_000),
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
        type: "pdf_processing",
        documentId,
        durationMs,
        transactionsProcessed,
        status,
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
        type: "pdf_processing",
        documentId,
        durationMs,
        transactionsProcessed: 0,
        status: DocumentStatus.FAILED,
        error: message,
      })
    )
  }
}
