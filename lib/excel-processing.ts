/**
 * Excel processing pipeline: extract data → parse → import transactions.
 * Called in background after upload; does not block the request.
 * Writes SyncLog and updates Document status (COMPLETED / FAILED).
 */

import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import {
  importTransactionsFromPdfWithDedup,
  type NormalizedTransaction,
} from "@/lib/transaction-import"
import {
  hybridParseTransactions,
  refineTransactionsWithAI,
  convertToNormalizedTransaction,
} from "@/lib/ai-transaction-parser"
import * as XLSX from "xlsx"

const DEFAULT_CATEGORY = "Outros"
const MAX_TRANSACTIONS_PER_DOCUMENT = 5000

function toNormalizedTransaction(row: any): NormalizedTransaction {
  // Parse amount with Brazilian format support
  let amount = 0
  if (typeof row.amount === "number") {
    amount = Math.abs(row.amount)
  } else if (typeof row.amount === "string") {
    const amountStr = String(row.amount)
    // Remove R$ and spaces
    let clean = amountStr.replace(/[R$\$\€\£\s]/g, "")
    // Brazilian format: 1.234,56 -> 1234.56
    clean = clean.replace(/\./g, "").replace(/,/g, ".")
    // Remove any other non-numeric characters except dot and minus
    clean = clean.replace(/[^\d.-]/g, "")
    amount = parseFloat(clean) || 0
  }

  return {
    type: row.type || "EXPENSE",
    category: row.category || DEFAULT_CATEGORY,
    amount: amount,
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
          status: DocumentStatus.FAILED,
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
          status: DocumentStatus.FAILED,
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
          transactions = aiResult.transactions
            .filter((t) => t.type === "INCOME" || t.type === "EXPENSE")
            .map((t) => {
              const normalized = convertToNormalizedTransaction(t)
              return {
                type: normalized.type,
                category: normalized.category,
                amount: normalized.amount,
                description: normalized.description,
                date: normalized.date,
              }
            })
          parsingMethod = "ai_fallback"
          console.info(`AI parsing recovered ${transactions.length} transactions`)
        }
      } else {
        // Refine traditional parsing with AI
        // Filtra TRANSFER, pois o AI/refinador só aceita INCOME/EXPENSE
        const filteredForAI = transactions
          .filter((t) => t.type === "INCOME" || t.type === "EXPENSE")
          .map((t) => ({
            type: t.type as "INCOME" | "EXPENSE",
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            confidence: 0.8,
          }))
        const refinedResult = await refineTransactionsWithAI(filteredForAI)

        if (refinedResult.summary.confidence > 0.7) {
          transactions = refinedResult.transactions.map((t) => {
            const normalized = convertToNormalizedTransaction(t)
            return {
              type: normalized.type,
              category: normalized.category,
              amount: normalized.amount,
              description: normalized.description,
              date: normalized.date,
            }
          })
          parsingMethod = "ai_refined"
        }
      }
    } catch (error) {
      console.warn(`Traditional Excel parsing failed, trying AI parsing:`, error)
      const aiResult = await hybridParseTransactions(JSON.stringify(jsonData, null, 2), "excel")

      transactions = aiResult.transactions
        .filter((t) => t.type === "INCOME" || t.type === "EXPENSE")
        .map((t) => {
          const normalized = convertToNormalizedTransaction(t)
          return {
            type: normalized.type,
            category: normalized.category,
            amount: normalized.amount,
            description: normalized.description,
            date: normalized.date,
          }
        })
      parsingMethod = "ai_only"
    }

    const result = await importTransactionsFromPdfWithDedup(userId, transactions)
    const transactionsProcessed = result.success
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    // 🔥 ATUALIZAÇÃO AUTOMÁTICA DE SALDOS
    console.log("🔄 Atualizando saldos das contas após importação...")

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          select: {
            amount: true,
            type: true,
          },
        },
      },
    })

    for (const account of accounts) {
      const correctBalance = account.transactions.reduce((balance, transaction) => {
        const amount = Number(transaction.amount)
        return balance + (transaction.type === "INCOME" ? amount : -amount)
      }, 0)

      const currentBalance = Number(account.balance)
      if (Math.abs(currentBalance - correctBalance) > 0.01) {
        await prisma.account.update({
          where: { id: account.id },
          data: { balance: correctBalance },
        })
        console.log(
          `💰 Saldo atualizado: Conta ${account.name} → R$ ${correctBalance.toLocaleString("pt-BR")}`
        )
      }
    }

    // 🔥 INVALIDAR CACHE DO CLIENTE
    console.log("🗑️ Cache invalidado - cliente precisará recarregar")

    const status =
      result.failed > 0 && result.success === 0 ? DocumentStatus.FAILED : DocumentStatus.COMPLETED
    const errorMessage = result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        errorMessage: status === DocumentStatus.FAILED ? errorMessage : null,
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
      console.error("Failed to update document/syncLog after Excel processing error", e)
    }

    console.info(
      JSON.stringify({
        type: "excel_processing",
        documentId,
        durationMs,
        transactionsProcessed: 0,
        status: DocumentStatus.FAILED,
        error: message,
      })
    )
  }
}
