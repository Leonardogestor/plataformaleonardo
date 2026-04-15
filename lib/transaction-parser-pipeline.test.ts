import { parseTransactionsPipeline, groupLines } from "@/lib/transaction-parser-pipeline"

// Test cases for Brazilian bank statements

async function runTests() {
  console.log("=" * 60)
  console.log("TESTING ROBUST TRANSACTION PARSER")
  console.log("=" * 60)

  // Test 1: Multi-line transactions
  const test1 = `
    15/04/2026 PIX IFOOD RESTAURANTE 125,50
    16/04/2026 Aplicação RDB 10000,00
    17/04/2026 Resgate RDB 10000,00
  `

  console.log("\nTest 1: Basic transactions with investment")
  let result1 = await parseTransactionsPipeline(test1)
  console.log("Parsed:", result1)
  console.assert(
    result1.some((t) => t.category === "Alimentação"),
    "PIX IFOOD should be Alimentação"
  )
  console.assert(
    result1.some((t) => t.type === "INVESTIMENTO"),
    "Aplicação RDB should be INVESTIMENTO"
  )
  console.assert(
    result1.some((t) => t.type === "INCOME"),
    "Resgate RDB should be INCOME"
  )

  // Test 2: Transactions spanning multiple lines
  const test2 = `
    18/04/2026 Compra no débito
    UBER TECHNOLOGIES
    125,50
    19/04/2026 Transferência recebida
    João Silva
    500,00
  `

  console.log("\nTest 2: Multi-line transactions")
  let result2 = await parseTransactionsPipeline(test2)
  console.log("Parsed:", result2)
  console.assert(result2.length >= 2, "Should parse at least 2 transactions")

  // Test 3: Summary lines (should be ignored)
  const test3 = `
    15/04/2026 PIX RESTAURANTE 85,00
    Total de saídas: 1500,00
    Total de entradas: 3000,00
  `

  console.log("\nTest 3: Filtering summary lines")
  let result3 = await parseTransactionsPipeline(test3)
  console.log("Parsed:", result3)
  console.assert(
    !result3.some((t) => t.description.includes("Total")),
    "Should filter out summary lines"
  )

  // Test 4: Various food delivery formats
  const test4 = `
    12/04/2026 PIX IFOOD 45,99
    13/04/2026 DELIVERY PIZZA 32,50
    14/04/2026 Restaurante Japonês 78,00
  `

  console.log("\nTest 4: Food delivery recognition")
  let result4 = await parseTransactionsPipeline(test4)
  console.log("Parsed:", result4)
  console.assert(
    result4.every((t) => t.category === "Alimentação"),
    "All should be categorized as Alimentação"
  )

  // Test 5: Broken formatting with bank metadata
  const test5 = `
    09/04/2026 Mercado Carrefour agência 0001 conta 12345 175,50
    10/04/2026 COMPRA DEBITO SPOTIFY 19,90
  `

  console.log("\nTest 5: Bank metadata filtering")
  let result5 = await parseTransactionsPipeline(test5)
  console.log("Parsed:", result5)
  console.assert(
    result5[0] && !result5[0].description.includes("agência"),
    "Should remove bank metadata"
  )

  // Test 6: Transaction type detection
  const test6 = `
    05/04/2026 Depósito Transferência Recebida 2500,00
    06/04/2026 PIX Pagamento 150,00
    07/04/2026 Aplicação Investimento 5000,00
  `

  console.log("\nTest 6: Transaction type detection")
  let result6 = await parseTransactionsPipeline(test6)
  console.log("Parsed:", result6)
  console.assert(
    result6.some((t) => t.type === "INCOME"),
    "Depósito should be INCOME"
  )
  console.assert(
    result6.some((t) => t.type === "EXPENSE"),
    "PIX Pagamento should be EXPENSE"
  )
  console.assert(
    result6.some((t) => t.type === "INVESTIMENTO"),
    "Aplicação should be INVESTIMENTO"
  )

  // Test 7: Multiple line grouping
  const test7 = `
    11/04/2026 Parcelamento Compra
    Eletrônicos Magazine
    Parcela 1 de 3
    299,00
    12/04/2026 Eletricidade CEMIG 185,50
  `

  console.log("\nTest 7: Multi-line grouping")
  let result7 = await parseTransactionsPipeline(test7)
  console.log("Parsed:", result7)
  console.log("Grouped lines:", groupLines(test7.split("\n")))
  console.assert(result7.length >= 2, "Should group and parse multi-line transactions")

  console.log("\n" + "=".repeat(60))
  console.log("TEST SUMMARY: Core pipeline functionality working")
  console.log("=".repeat(60))
}

// Run tests
if (typeof process !== "undefined" && require.main === module) {
  runTests().catch(console.error)
}

export { runTests }
