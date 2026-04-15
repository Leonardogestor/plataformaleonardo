/**
 * END-TO-END INTEGRATION EXAMPLES
 * Shows how robust pipeline works with existing system
 */

import { parseTransactionsPipeline } from "@/lib/transaction-parser-pipeline"
import { intelligentParse, parseLargeStatement } from "@/lib/transaction-parser-advanced"
import type { ParsedTransaction } from "@/lib/transaction-parser-pipeline"

// Example 1: Simple Nubank statement
export async function example1_SimpleNubankStatement() {
  const pdfText = `
    NUBANK - EXTRATO DE CONTA

    Data: 15/04/2026

    15/04/2026 PIX IFOOD RESTAURANTE 125,50
    16/04/2026 Compra débito UBER 42,00
    17/04/2026 Aplicação RDB 10000,00
    18/04/2026 Resgate RDB 10000,00
    20/04/2026 SPOTIFY ASSINATURA 19,90
  `

  const result = await parseTransactionsPipeline(pdfText)
  return result
}

// Example 2: Complex multi-line transactions
export async function example2_ComplexMultilineTransactions() {
  const pdfText = `
    15/04/2026 Compra no débito
    RESTAURANTE JAPONÊS
    Rua das Flores
    São Paulo SP
    280,00

    16/04/2026 Transferência recebida
    João Silva CPF: ***
    PIX Chave Aleatória
    500,00

    17/04/2026 Parcelamento Compra
    Eletrônicos Magazine
    Parcela 1 de 3
    299,00
  `

  const result = await intelligentParse(pdfText)
  return result
}

// Example 3: Mixed bank formats
export async function example3_MixedBankStatements() {
  const statements = [
    {
      text: `
        NUBANK
        15/04/2026 PIX IFOOD 45,50
        16/04/2026 Aplicação 5000,00
      `,
      source: "nubank",
    },
    {
      text: `
        ITAU
        17/04/2026 COMPRA DÉBITO UBER 35,00
        18/04/2026 Transferência 200,00
      `,
      source: "itau",
    },
  ]

  const allTransactions: ParsedTransaction[] = []

  for (const statement of statements) {
    const result = await intelligentParse(statement.text)
    allTransactions.push(...result.transactions)
  }

  return allTransactions
}

// Example 4: Large statement with chunking
export async function example4_LargeStatement() {
  const largeStatement = `
    ${Array.from({ length: 200 }, (_, i) => {
      const day = String((i % 28) + 1).padStart(2, "0")
      const types = ["PIX", "Compra débito", "Transferência", "Depósito"]
      const merchants = [
        "IFOOD",
        "UBER",
        "SPOTIFY",
        "MERCADO",
        "RESTAURANTE",
      ]
      const amount = (Math.random() * 500 + 10).toFixed(2)
      return `${day}/04/2026 ${types[i % types.length]} ${merchants[i % merchants.length]} ${amount}`
    }).join("\n")}
  `

  const result = await parseLargeStatement(largeStatement, 20)
  return result
}

// Example 5: Edge cases
export async function example5_EdgeCases() {
  const problematicStatements = `
    14/04/2026 PIX IFOOD RESTAURANTE 125,50
    15/04/2026 Saque ATM 100,00
    16/04/2026 Aplicação RDB Resgate Automático 500,00
    17/04/2026 Total de saídas: 1500,00
    18/04/2026 Saldo anterior: 5000,00
    19/04/2026 Rendimento de Investimento 25,50
    20/04/2026 Limite disponível: 3000,00
    21/04/2026 Transação PIX - João Silva 250,00
    22/04/2026 Compra Internacional AMAZON 145,99
  `

  const result = await intelligentParse(problematicStatements)
  return result
}

// Example 6: Custom processing pipeline
export async function example6_CustomProcessing() {
  const statement = `
    10/04/2026 PIX RESTAURANTE ABC 85,00
    11/04/2026 Uber Trip 42,50
    12/04/2026 Aplicação CDB 3000,00
    13/04/2026 Boleto Pagamento Conta 120,00
    14/04/2026 Resgate RDB 2000,00
  `

  // Parse with intelligent detection
  const parsed = await intelligentParse(statement)

  // Custom enrichment
  const enriched = parsed.transactions.map((tx) => ({
    ...tx,
    normalized: tx.description.toUpperCase(),
    month: parseInt(tx.date.split("-")[1]),
    year: parseInt(tx.date.split("-")[0]),
    isRecurring: tx.description.includes("SPOTIFY") || tx.description.includes("NETFLIX"),
  }))

  // Group by category
  const byCategory = enriched.reduce(
    (acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = []
      }
      acc[tx.category].push(tx)
      return acc
    },
    {} as Record<string, typeof enriched>
  )

  return {
    transactions: enriched,
    byCategory,
    stats: {
      total: enriched.length,
      totalExpense: enriched.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.value, 0),
      totalIncome: enriched.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.value, 0),
      categories: Object.keys(byCategory),
    },
  }
}

// Example 7: Error recovery
export async function example7_ErrorRecovery() {
  const problematicText = `
    Some random text that's not a transaction
    16/04/2026 Valid transaction 100,00
    17/04/2026 Another valid one 50,00
    Random data here
    18/04/2026 Final transaction 75,50
  `

  try {
    const result = await parseTransactionsPipeline(problematicText)
    console.log(`Recovered ${result.length} transactions from problematic input`)
    return result
  } catch (error) {
    console.error("Recovery failed:", error)
    return []
  }
}

// Example 8: Type-safe usage
export async function example8_TypeSafeUsage() {
  const statement = `
    15/04/2026 PIX IFOOD 125,50
    16/04/2026 Aplicação RDB 5000,00
  `

  const result = await parseTransactionsPipeline(statement)

  // Type-safe access
  const foodExpenses: ParsedTransaction[] = result.filter((tx) => tx.category === "Alimentação")

  const investmentTransactions: ParsedTransaction[] = result.filter((tx) => tx.type === "INVESTIMENTO")

  const totalExpense = result
    .filter((tx) => tx.type === "EXPENSE")
    .reduce((sum, tx) => sum + tx.value, 0)

  return {
    foodExpenses,
    investmentTransactions,
    totalExpense,
  }
}

export async function runAllExamples() {
  console.log("Example 1: Simple Nubank Statement")
  console.log(await example1_SimpleNubankStatement())
  console.log("\n" + "=".repeat(60) + "\n")

  console.log("Example 2: Complex Multi-line Transactions")
  console.log(await example2_ComplexMultilineTransactions())
  console.log("\n" + "=".repeat(60) + "\n")

  console.log("Example 5: Edge Cases")
  console.log(await example5_EdgeCases())
  console.log("\n" + "=".repeat(60) + "\n")

  console.log("Example 6: Custom Processing Pipeline")
  console.log(await example6_CustomProcessing())
  console.log("\n" + "=".repeat(60) + "\n")

  console.log("Example 8: Type-Safe Usage")
  console.log(await example8_TypeSafeUsage())
}

export type { ParsedTransaction }
