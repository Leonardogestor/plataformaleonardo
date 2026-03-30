import { prisma } from "@/lib/db"
import { NormalizedTransactionInput } from "@/lib/services/normalize"
import { StandardTransactionInput } from "@/lib/parsers/parse"

export interface PersistResult {
  success: boolean
  data?: any[]
  error?: string
}

export async function persistTransactions(
  normalizedTransactions: NormalizedTransactionInput[],
  userId: string
): Promise<PersistResult> {
  try {
    console.log(`[PERSIST] Persistindo ${normalizedTransactions.length} transações`)

    const persistedTransactions: any[] = []

    // Buscar transações parseadas correspondentes
    const parsedIds = normalizedTransactions.map((n) => n.parsedId)
    const parsedTransactions = await prisma.parsedTransaction.findMany({
      where: {
        id: { in: parsedIds },
        userId,
      },
    })

    // Mapear parsedId para dados completos
    const parsedMap = new Map(parsedTransactions.map((p) => [p.id, p]))

    for (const normalized of normalizedTransactions) {
      const parsed = parsedMap.get(normalized.parsedId)
      if (!parsed) {
        console.warn(`[PERSIST] Transação parseada não encontrada: ${normalized.parsedId}`)
        continue
      }

      // Verificar se transação já existe (evitar duplicatas)
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId,
          date: parsed.date,
          description: parsed.description,
          amount: parsed.amount,
        },
      })

      if (existingTransaction) {
        console.log(`[PERSIST] Transação duplicada encontrada, ignorando: ${parsed.description}`)
        continue
      }

      // Criar transação final
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          date: parsed.date,
          description: normalized.standardizedDescription,
          amount: parsed.amount,
          type: parsed.type as "INCOME" | "EXPENSE" | "TRANSFER",
          category: normalized.category,
          subcategory: normalized.subcategory,
          // Campos opcionais - podem ser preenchidos depois
          accountId: null,
          cardId: null,
          externalTransactionId: null,
          isPending: false,
        },
      })

      // Criar entrada no financial_ledger para auditoria
      await createLedgerEntry(transaction, parsed, normalized, userId)

      persistedTransactions.push(transaction)
    }

    console.log(`[PERSIST] ${persistedTransactions.length} transações persistidas com sucesso`)

    return {
      success: true,
      data: persistedTransactions,
    }
  } catch (error) {
    console.error("[PERSIST] Erro na persistência:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function createLedgerEntry(
  transaction: any,
  parsed: any,
  normalized: NormalizedTransactionInput,
  userId: string
) {
  try {
    // Buscar último sequence number do usuário
    const lastSequence = await prisma.user_ledger_sequences.findUnique({
      where: { userId },
    })

    const newSequence = (lastSequence?.lastSequence || BigInt(0)) + BigInt(1)

    // Atualizar sequence
    if (lastSequence) {
      await prisma.user_ledger_sequences.update({
        where: { userId },
        data: { lastSequence: newSequence },
      })
    } else {
      await prisma.user_ledger_sequences.create({
        data: { userId, lastSequence: newSequence },
      })
    }

    // Criar entrada no ledger
    await prisma.financial_ledger.create({
      data: {
        id: `ledger_${transaction.id}_${Date.now()}`,
        userId,
        eventType: transaction.type === "INCOME" ? "TRANSACTION_CREDIT" : "TRANSACTION_DEBIT",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        amount: transaction.amount,
        eventTimestamp: new Date(),
        sequenceNumber: newSequence,
        description: `Transação importada: ${transaction.description}`,
        metadata: {
          source: "BANK_IMPORT",
          confidence: normalized.confidence,
          merchant: normalized.merchant,
          originalDescription: parsed.description,
          importMethod: "pipeline",
        },
        source: "BANK_IMPORT",
      },
    })
  } catch (error) {
    console.error("[PERSIST] Erro ao criar entrada no ledger:", error)
    // Não falhar a persistência se o ledger falhar
  }
}

export async function getImportStatistics(userId: string) {
  try {
    const stats = await prisma.rawTransaction.groupBy({
      by: ["source"],
      where: { userId },
      _count: true,
    })

    const parsedCount = await prisma.parsedTransaction.count({
      where: { userId },
    })

    const normalizedCount = await prisma.normalizedTransaction.count({
      where: { userId },
    })

    const transactionCount = await prisma.transaction.count({
      where: { userId },
    })

    const recentImports = await prisma.rawTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        source: true,
        createdAt: true,
      },
    })

    return {
      stats,
      parsedCount,
      normalizedCount,
      transactionCount,
      recentImports,
    }
  } catch (error) {
    console.error("[PERSIST] Erro ao buscar estatísticas:", error)
    return null
  }
}

export async function cleanupPipelineData(userId: string, olderThanDays: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // Buscar transações antigas para limpar
    const oldRawTransactions = await prisma.rawTransaction.findMany({
      where: {
        userId,
        createdAt: { lt: cutoffDate },
      },
    })

    let cleanedCount = 0

    for (const raw of oldRawTransactions) {
      // Buscar transações parseadas relacionadas
      const relatedParsed = await prisma.parsedTransaction.findMany({
        where: { rawId: raw.id },
      })

      // Verificar se todas as transações já foram persistidas
      const allPersisted = await Promise.all(
        relatedParsed.map(async (parsed: any) => {
          // Buscar normalized transactions relacionadas
          const hasNormalized = await prisma.normalizedTransaction.findFirst({
            where: { parsedId: parsed.id },
          })

          if (!hasNormalized) return false

          const hasTransaction = await prisma.transaction.findFirst({
            where: {
              userId,
              date: parsed.date,
              description: parsed.description,
              amount: parsed.amount,
            },
          })

          return !!hasTransaction
        })
      )

      if (allPersisted.every(Boolean)) {
        // Limpar normalized transactions
        for (const parsed of relatedParsed) {
          await prisma.normalizedTransaction.deleteMany({
            where: { parsedId: parsed.id },
          })
        }

        // Limpar parsed transactions
        await prisma.parsedTransaction.deleteMany({
          where: { rawId: raw.id },
        })

        // Limpar raw transaction
        await prisma.rawTransaction.delete({
          where: { id: raw.id },
        })

        cleanedCount++
      }
    }

    console.log(`[PERSIST] Cleanup concluído: ${cleanedCount} registros antigos removidos`)

    return {
      success: true,
      cleanedCount,
    }
  } catch (error) {
    console.error("[PERSIST] Erro no cleanup:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
