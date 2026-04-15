import {
  parseTransactionsAntifragile,
  calculateConfidence,
  needsFallback,
  extractValue,
  parseBlock,
} from "../../lib/transaction-parser-antifragile"

// Advanced integration features

interface TransactionWithMetrics {
  transaction: Awaited<ReturnType<typeof parseTransactionsAntifragile>>[0]
  confidence: number
  requiresFallback: boolean
}

export async function parseWithMetrics(text: string): Promise<TransactionWithMetrics[]> {
  const transactions = await parseTransactionsAntifragile(text)
  return transactions.map((tx) => ({
    transaction: tx,
    confidence: tx.confidence,
    requiresFallback: tx.confidence < 0.7,
  }))
}

export function groupByConfidence(transactions: TransactionWithMetrics[]): {
  high: TransactionWithMetrics[]
  medium: TransactionWithMetrics[]
  low: TransactionWithMetrics[]
} {
  return {
    high: transactions.filter((t) => t.confidence >= 0.9),
    medium: transactions.filter((t) => t.confidence >= 0.7 && t.confidence < 0.9),
    low: transactions.filter((t) => t.confidence < 0.7),
  }
}

export function groupByType(
  transactions: Awaited<ReturnType<typeof parseTransactionsAntifragile>>
): Record<string, typeof transactions> {
  const grouped: Record<string, typeof transactions> = {
    INCOME: [],
    EXPENSE: [],
    INVESTIMENTO: [],
  }

  for (const tx of transactions) {
    grouped[tx.type].push(tx)
  }

  return grouped
}

export function groupByCategory(
  transactions: Awaited<ReturnType<typeof parseTransactionsAntifragile>>
): Record<string, typeof transactions> {
  const grouped: Record<string, typeof transactions> = {}

  for (const tx of transactions) {
    if (!grouped[tx.category]) {
      grouped[tx.category] = []
    }
    grouped[tx.category].push(tx)
  }

  return grouped
}

export function calculateStats(
  transactions: Awaited<ReturnType<typeof parseTransactionsAntifragile>>
) {
  return {
    total: transactions.length,
    totalValue: transactions.reduce((sum, t) => sum + t.value, 0),
    avgConfidence:
      transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length
        : 0,
    byType: {
      income: transactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.value, 0),
      expense: transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.value, 0),
      investimento: transactions
        .filter((t) => t.type === "INVESTIMENTO")
        .reduce((sum, t) => sum + t.value, 0),
    },
    highConfidence: transactions.filter((t) => t.confidence >= 0.9).length,
    needsFallback: transactions.filter((t) => t.confidence < 0.7).length,
  }
}

export function filterByMinConfidence(
  transactions: Awaited<ReturnType<typeof parseTransactionsAntifragile>>,
  minConfidence: number
) {
  return transactions.filter((t) => t.confidence >= minConfidence)
}

export function flagForManualReview(
  transactions: Awaited<ReturnType<typeof parseTransactionsAntifragile>>
) {
  return transactions
    .filter((t) => t.confidence < 0.7)
    .map((t) => ({
      transaction: t,
      reason: [
        t.value === 0 ? "possibly zero value" : null,
        t.description.length < 5 ? "short description" : null,
        t.category === "Outros" ? "uncategorized" : null,
      ]
        .filter((r) => r !== null)
        .join(", "),
    }))
}

export async function demonstrateAntifragileParsing() {
  const robustStatement = `
    10/04/2026 Depósito
    Folha Pagamento
    Referência: ABC123
    código: 001
    5000,00

    12/04/2026 Compra Débito
    PIX IFOOD
    agência: 1234 conta: 56789
    125,50

    100,00 Transferência 13/04/2026 João Silva

    14/04/2026 Aplicação RDB
    Investimento automático
    banco: Bradesco
    código: BC001
    10.000,00

    Resgate RDB 15/04/2026 10.000,00

    16/04/2026 SPOTIFY
    protocolo: XYZ123
    19,90

    BROKEN ENTRY WITHOUT VALUE

    17/04/2026 Compra 150,00 em loja

    Total de entradas: 15.000,00
    Total de saídas: 295,40
  `

  console.log("ANTIFRAGILE PARSER - ADVANCED INTEGRATION")
  console.log("=========================================\n")

  // Parse with metrics
  console.log("1. Parsing with confidence metrics...")
  const withMetrics = await parseWithMetrics(robustStatement)
  console.log(`   ✓ Parsed ${withMetrics.length} transactions\n`)

  // Group by confidence
  console.log("2. Grouping by confidence level...")
  const byConfidence = groupByConfidence(withMetrics)
  console.log(`   High confidence (≥0.9): ${byConfidence.high.length}`)
  console.log(`   Medium confidence (0.7-0.9): ${byConfidence.medium.length}`)
  console.log(`   Low confidence (<0.7): ${byConfidence.low.length}\n`)

  // Parse transactions
  const transactions = await parseTransactionsAntifragile(robustStatement)

  // Statistics
  console.log("3. Computing statistics...")
  const stats = calculateStats(transactions)
  console.log(`   Total transactions: ${stats.total}`)
  console.log(
    `   Total value: R$ ${stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  )
  console.log(`   Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`)
  console.log(
    `   Income: R$ ${stats.byType.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  )
  console.log(
    `   Expense: R$ ${stats.byType.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  )
  console.log(
    `   Investment: R$ ${stats.byType.investimento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  )
  console.log(`   High confidence: ${stats.highConfidence}`)
  console.log(`   Needs fallback: ${stats.needsFallback}\n`)

  // Group by type
  console.log("4. Grouping by transaction type...")
  const byType = groupByType(transactions)
  console.log(`   INCOME: ${byType.INCOME.length}`)
  console.log(`   EXPENSE: ${byType.EXPENSE.length}`)
  console.log(`   INVESTIMENTO: ${byType.INVESTIMENTO.length}\n`)

  // Group by category
  console.log("5. Grouping by category...")
  const byCategory = groupByCategory(transactions)
  for (const [category, txs] of Object.entries(byCategory)) {
    console.log(
      `   ${category}: ${txs.length} (total: R$ ${txs.reduce((s, t) => s + t.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
    )
  }
  console.log()

  // Filter by minimum confidence
  console.log("6. Filtering by minimum confidence (0.8)...")
  const highQuality = filterByMinConfidence(transactions, 0.8)
  console.log(`   ✓ ${highQuality.length} transactions meet threshold\n`)

  // Flag for manual review
  console.log("7. Flagging transactions for manual review...")
  const flagged = flagForManualReview(transactions)
  if (flagged.length > 0) {
    flagged.forEach((item, idx) => {
      console.log(
        `   ${idx + 1}. "${item.transaction.description.substring(0, 30)}" - ${item.reason}`
      )
    })
  } else {
    console.log("   ✓ No transactions flagged")
  }

  console.log("\n=========================================")
  console.log("ANTIFRAGILE PARSING COMPLETED")
  console.log(`Accuracy: ${((stats.highConfidence / stats.total) * 100).toFixed(0)}%`)
}
