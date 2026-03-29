/**
 * Excel processing pipeline: extract data → parse → import transactions.
 * Called in background after upload; does not block the request.
 * Writes SyncLog and updates Document status (COMPLETED / FAILED).
 */

import { prisma } from "@/lib/db"
import {
  importTransactionsFromPdfWithDedup,
  type NormalizedTransaction,
} from "@/lib/transaction-import"
import { hybridParseTransactions, refineTransactionsWithAI } from "@/lib/ai-transaction-parser"
import * as XLSX from "xlsx"

const DEFAULT_CATEGORY = "Outros"
const MAX_TRANSACTIONS_PER_DOCUMENT = 5000

function toNormalizedTransaction(row: any): NormalizedTransaction {
  return {
    type: row.type || "EXPENSE",
    category: row.category || DEFAULT_CATEGORY,
    amount: parseFloat(row.amount) || 0,
    description: row.description || "",
    date: new Date(row.date).toISOString() || new Date().toISOString(),
  }
}

/**
 * Process an Excel/CSV file: fetch from blob, parse, import transactions, update document and SyncLog.
 * Call this in a fire-and-forget way (void) so the request returns immediately.
 */
export async function processDocumentExcel(documentId: string): Promise<void> {
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
          status: "FAILED",
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
        status: "PROCESSING",
      },
    })
    syncLogId = logEntry.id

    // Download and parse Excel/CSV file
    const buffer = await fetch(doc.fileUrl)
      .then((r) => r.arrayBuffer())
      .then((ab) => Buffer.from(ab))
    const workbook = XLSX.read(buffer, { type: "buffer" })

    // Get first worksheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error("No worksheet found in Excel file")
    }
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error("Worksheet data not found")
    }

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (!jsonData || jsonData.length < 2) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage: "Could not extract data from Excel/CSV file",
          extractedText: JSON.stringify(jsonData) || null,
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
          error: "Could not extract data from Excel/CSV file",
        },
      })
      return
    }

    // Parse rows with headers
    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1).map((row: any) => {
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header.toLowerCase()] = row[index]
      })
      return obj
    })

    if (rows.length > MAX_TRANSACTIONS_PER_DOCUMENT) {
      console.info(
        JSON.stringify({
          type: "excel_processing",
          documentId,
          message: "Transaction limit exceeded",
          totalRows: rows.length,
          limit: MAX_TRANSACTIONS_PER_DOCUMENT,
        })
      )
    }

    // Try traditional parsing first
    let transactions: NormalizedTransaction[] = []
    let parsingMethod = "traditional"

    try {
      const capped = rows.slice(0, MAX_TRANSACTIONS_PER_DOCUMENT)
      transactions = capped.map(toNormalizedTransaction)

      // If traditional parsing failed or returned too few transactions, try AI
      if (transactions.length === 0) {
        console.info(
          `Traditional Excel parsing returned ${transactions.length} transactions, trying AI fallback`
        )
        const aiResult = await hybridParseTransactions(JSON.stringify(jsonData, null, 2), "excel")

        if (aiResult.transactions.length > 0) {
          transactions = aiResult.transactions.map((t) => ({
            type: t.type,
            category: t.category,
            amount: t.amount,
            description: t.description,
            date: t.date,
          }))
          parsingMethod = "ai_fallback"
          console.info(`AI parsing recovered ${transactions.length} transactions`)
        }
      } else {
        // Refine traditional parsing with AI
        const refinedResult = await refineTransactionsWithAI(
          transactions.map((t) => ({
            type: t.type,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            confidence: 0.8,
          }))
        )

        if (refinedResult.summary.confidence > 0.7) {
          transactions = refinedResult.transactions.map((t) => ({
            type: t.type,
            category: t.category,
            amount: t.amount,
            description: t.description,
            date: t.date,
          }))
          parsingMethod = "ai_refined"
        }
      }
    } catch (error) {
      console.warn(`Traditional Excel parsing failed, trying AI parsing:`, error)
      const aiResult = await hybridParseTransactions(JSON.stringify(jsonData, null, 2), "excel")

      transactions = aiResult.transactions.map((t) => ({
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        date: t.date,
      }))
      parsingMethod = "ai_only"
    }

    const result = await importTransactionsFromPdfWithDedup(userId, transactions)
    const transactionsProcessed = result.success
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    const status = result.failed > 0 && result.success === 0 ? "FAILED" : "COMPLETED"
    const errorMessage = result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        errorMessage: status === "FAILED" ? errorMessage : null,
        extractedText: JSON.stringify(jsonData).slice(0, 100_000),
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
        type: "excel_processing",
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
      console.error("Failed to update document/syncLog after Excel processing error", e)
    }

    console.info(
      JSON.stringify({
        type: "excel_processing",
        documentId,
        durationMs,
        transactionsProcessed: 0,
        status: "FAILED",
        error: message,
      })
    )
  }
}
