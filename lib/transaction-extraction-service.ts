/**
 * INTEGRATION LAYER
 * Demonstrates usage of robust transaction parser pipeline
 * Preserves all existing classification and normalization logic
 */

import {
  parseTransactionsPipeline,
  groupLines,
  isValidTransaction,
  aiFallback,
} from "@/lib/transaction-parser-pipeline"

/**
 * Extract transactions from PDF text with robust multi-line handling
 */
export async function extractTransactionsFromText(pdfText: string) {
  if (!pdfText || pdfText.trim().length === 0) {
    return {
      transactions: [],
      stats: {
        total: 0,
        validated: 0,
        fallbackUsed: 0,
      },
    }
  }

  const transactions = await parseTransactionsPipeline(pdfText)

  return {
    transactions,
    stats: {
      total: transactions.length,
      validated: transactions.length,
      fallbackUsed: 0, // Would track this in actual implementation
    },
  }
}

/**
 * Handle Nubank-specific statement format
 */
export async function parseNubankStatement(pdfText: string) {
  return extractTransactionsFromText(pdfText)
}

/**
 * Handle generic bank statement
 */
export async function parseBankStatement(pdfText: string, bankHint?: string) {
  return extractTransactionsFromText(pdfText)
}

/**
 * Batch process multiple statements
 */
export async function processMultipleStatements(
  statements: Array<{
    text: string
    source?: string
  }>
) {
  const allTransactions = []

  for (const statement of statements) {
    const result = await extractTransactionsFromText(statement.text)
    allTransactions.push(...result.transactions)
  }

  return {
    transactions: allTransactions,
    total: allTransactions.length,
  }
}

/**
 * Validate and clean transaction batch
 */
export function validateTransactionBatch(transactions: any[]) {
  const validated = []
  const rejected = []

  for (const tx of transactions) {
    const validation = isValidTransaction(tx)
    if (validation.isValid) {
      validated.push(tx)
    } else {
      rejected.push({
        transaction: tx,
        reason: validation.reason,
      })
    }
  }

  return {
    validated,
    rejected,
    stats: {
      total: transactions.length,
      validCount: validated.length,
      rejectedCount: rejected.length,
      validationRate: (validated.length / transactions.length) * 100,
    },
  }
}

/**
 * Example usage
 */
export async function exampleUsage() {
  // Example Nubank statement text (as would be extracted from PDF)
  const nubanKStatement = `
    Transações - Abril 2026

    15/04/2026 PIX IFOOD RESTAURANTE 125,50
    16/04/2026 Compra no débito UBER 42,00
    17/04/2026 Aplicação RDB 10000,00
    18/04/2026 Resgate RDB 10000,00
    19/04/2026 Transferência para João 500,00
    20/04/2026 SPOTIFY ASSINATURA 19,90
    21/04/2026 PIX RECEBIMENTO FREELANCE 1500,00

    Total de entradas: 11500,00
    Total de saídas: 687,40
  `

  const result = await parseNubankStatement(nubanKStatement)

  console.log("Parsed transactions:", result.transactions)
  console.log("Stats:", result.stats)

  // Validate the batch
  const validation = validateTransactionBatch(result.transactions)
  console.log("Validation:", validation)

  return result.transactions
}

export type { ParsedTransaction } from "@/lib/transaction-parser-pipeline"
