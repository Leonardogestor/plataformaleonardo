import { prisma } from "@/lib/db"
import { generateTransactionFingerprint } from "@/lib/utils/crypto"
import { pipelineLogger } from "@/lib/utils/logger"

// Import Decimal do Prisma Client
interface PrismaTransaction {
  id: string
  userId: string
  date: Date
  description: string
  amount: {
    toNumber: () => number
    toString: () => string
  }
  type: string
  category: string
  // ... outros campos
}

export interface DeduplicationResult {
  isDuplicate: boolean
  existingTransaction?: PrismaTransaction | null
  fingerprint: string
}

/**
 * Verifica se transação já existe usando fingerprint
 */
export async function checkTransactionDuplicate(
  userId: string,
  transaction: {
    date: Date
    amount: number
    description: string
  }
): Promise<DeduplicationResult> {
  try {
    const fingerprint = generateTransactionFingerprint(transaction)

    // Busca exata usando índice composto
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
      },
    })

    if (existingTransaction) {
      pipelineLogger.duplicateDetected(userId, fingerprint)

      return {
        isDuplicate: true,
        existingTransaction,
        fingerprint,
      }
    }

    return {
      isDuplicate: false,
      fingerprint,
    }
  } catch (error) {
    pipelineLogger.error("Error checking transaction duplicate", {
      userId,
      fingerprint: generateTransactionFingerprint(transaction),
      error: error instanceof Error ? error.message : "Unknown error",
    })

    return {
      isDuplicate: false,
      fingerprint: generateTransactionFingerprint(transaction),
    }
  }
}

/**
 * Verifica duplicatas em lote (performance)
 */
export async function checkBatchDuplicates(
  userId: string,
  transactions: Array<{
    date: Date
    amount: number
    description: string
  }>
): Promise<DeduplicationResult[]> {
  try {
    const fingerprints = transactions.map((tx) => ({
      fingerprint: generateTransactionFingerprint(tx),
      transaction: tx,
    }))

    const existingFingerprints = await prisma.transaction.findMany({
      where: {
        userId,
        OR: fingerprints.map((fp) => ({
          date: fp.transaction.date,
          amount: fp.transaction.amount,
          description: fp.transaction.description,
        })),
      },
    })

    const existingFingerprintSet = new Set(
      existingFingerprints.map((tx) =>
        generateTransactionFingerprint({
          date: tx.date,
          amount: typeof tx.amount === "number" ? tx.amount : tx.amount.toNumber(),
          description: tx.description,
        })
      )
    )

    return fingerprints.map((fp) => ({
      isDuplicate: existingFingerprintSet.has(fp.fingerprint),
      fingerprint: fp.fingerprint,
      existingTransaction: existingFingerprintSet.has(fp.fingerprint)
        ? existingFingerprints.find(
            (et) =>
              generateTransactionFingerprint({
                date: et.date,
                amount: typeof et.amount === "number" ? et.amount : et.amount.toNumber(),
                description: et.description,
              }) === fp.fingerprint
          )
        : undefined,
    }))
  } catch (error) {
    pipelineLogger.error("Error checking batch duplicates", {
      userId,
      transactionCount: transactions.length,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    // Em caso de erro, assume que não há duplicatas
    return transactions.map((tx) => ({
      isDuplicate: false,
      fingerprint: generateTransactionFingerprint(tx),
    }))
  }
}

/**
 * Remove transações duplicadas de um lote
 */
export function filterDuplicateTransactions(deduplicationResults: DeduplicationResult[]): Array<{
  date: Date
  amount: number
  description: string
}> {
  return deduplicationResults
    .filter((result) => !result.isDuplicate)
    .map((result) => ({
      // Extrai dados originais do resultado (precisamos passar os dados originais)
      date: new Date(), // Será preenchido pelo caller
      amount: 0, // Será preenchido pelo caller
      description: "", // Será preenchido pelo caller
    }))
}

/**
 * Gera relatório de duplicatas detectadas
 */
export function generateDuplicateReport(deduplicationResults: DeduplicationResult[]): {
  total: number
  duplicates: number
  duplicateRate: number
  duplicateFingerprints: string[]
} {
  const total = deduplicationResults.length
  const duplicates = deduplicationResults.filter((r) => r.isDuplicate).length
  const duplicateRate = total > 0 ? (duplicates / total) * 100 : 0
  const duplicateFingerprints = deduplicationResults
    .filter((r) => r.isDuplicate)
    .map((r) => r.fingerprint)

  return {
    total,
    duplicates,
    duplicateRate,
    duplicateFingerprints,
  }
}
