/**
 * Async PDF processing pipeline: extract text → detect bank → parse → import transactions.
 * Called in background after upload; does not block the request.
 * Writes SyncLog and updates Document status (COMPLETED / FAILED).
 */

import { prisma } from "@/lib/db"
import { extractTextFromPdf } from "@/lib/document-extract"
import { parseStatementByBank, type NormalizedTransactionRow } from "@/lib/bank-parsers"
import { importTransactionsFromPdfWithDedup, type NormalizedTransaction } from "@/lib/transaction-import"

const DEFAULT_CATEGORY = "Outros"

/** Limite de transações por documento para evitar abuso e estouro de execução (ex: PDF com 10k+ linhas). */
const MAX_TRANSACTIONS_PER_DOCUMENT = 5000

function toNormalized(t: NormalizedTransactionRow): NormalizedTransaction {
  return {
    type: t.type,
    category: DEFAULT_CATEGORY,
    amount: t.amount,
    description: t.description,
    date: t.date,
  }
}

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
        data: { status: "FAILED", errorMessage: "Document or file URL not found", updatedAt: new Date() },
      })
      return
    }

    const userId = doc.userId

    const logEntry = await prisma.syncLog.create({
      data: {
        documentId,
        startedAt,
        status: "PROCESSING",
      },
    })
    syncLogId = logEntry.id

    const buffer = await fetch(doc.fileUrl).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab))
    const text = await extractTextFromPdf(buffer)

    if (!text || text.length < 10) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
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
          status: "FAILED",
          error: "Could not extract text from PDF",
        },
      })
      console.info(
        JSON.stringify({
          type: "pdf_processing",
          documentId,
          durationMs,
          transactionsProcessed: 0,
          status: "FAILED",
          error: "Could not extract text from PDF",
        })
      )
      return
    }

    const rows = parseStatementByBank(text)
    if (rows.length > MAX_TRANSACTIONS_PER_DOCUMENT) {
      console.info(
        JSON.stringify({
          type: "pdf_processing",
          documentId,
          message: "Transaction limit exceeded",
          totalRows: rows.length,
          limit: MAX_TRANSACTIONS_PER_DOCUMENT,
        })
      )
    }
    const capped = rows.slice(0, MAX_TRANSACTIONS_PER_DOCUMENT)
    const transactions = capped.map(toNormalized)

    const result = await importTransactionsFromPdfWithDedup(userId, transactions)
    const transactionsProcessed = result.success
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    const status = result.failed > 0 && result.success === 0 ? "FAILED" : "COMPLETED"
    const errorMessage =
      result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        errorMessage: status === "FAILED" ? errorMessage : null,
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
        data: { status: "FAILED", errorMessage: message, updatedAt: finishedAt },
      })
      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            finishedAt,
            durationMs,
            transactionsProcessed: 0,
            status: "FAILED",
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
        status: "FAILED",
        error: message,
      })
    )
  }
}
