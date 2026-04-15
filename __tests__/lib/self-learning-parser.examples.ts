import { SelfLearningParser } from "../../lib/self-learning-parser"

export async function example1_BasicUsage() {
  const parser = new SelfLearningParser()

  const text = `
    15/04/2026 PIX IFOOD RESTAURANTE 125,50
    16/04/2026 Compra débito UBER 42,00
    17/04/2026 SPOTIFY ASSINATURA 19,90
  `

  const transactions = await parser.parseTransactions(text)
  return transactions
}

export async function example2_LearningFromCorrections() {
  const parser = new SelfLearningParser()

  // First parse
  const text1 = `
    15/04/2026 UNKNOWN MERCHANT 100,00
    16/04/2026 UNKNOWN MERCHANT 150,00
    17/04/2026 UNKNOWN MERCHANT 200,00
  `

  const result1 = await parser.parseTransactions(text1)

  // Apply corrections to teach the parser
  parser.applyCorrection("tx1", "UNKNOWN MERCHANT", "Outros", "Alimentação")
  parser.applyCorrection("tx2", "UNKNOWN MERCHANT", "Outros", "Alimentação")
  parser.applyCorrection("tx3", "UNKNOWN MERCHANT", "Outros", "Alimentação")

  // Second parse - should remember and use learned category
  const text2 = `
    18/04/2026 UNKNOWN MERCHANT 300,00
  `

  const result2 = await parser.parseTransactions(text2)

  return {
    beforeLearning: result1,
    afterLearning: result2,
    learned: true,
  }
}

export async function example3_MerchantMemory() {
  const parser = new SelfLearningParser()

  // Learn multiple merchants
  for (let i = 0; i < 5; i++) {
    parser.applyCorrection(`tx${i}`, "IFOOD", "Outros", "Alimentação")
  }

  for (let i = 0; i < 3; i++) {
    parser.applyCorrection(`ub${i}`, "UBER", "Outros", "Transporte")
  }

  const topMerchants = parser.getTopMerchants(10)
  const stats = parser.getStats()

  return {
    topMerchants,
    stats,
  }
}

export async function example4_AmbigiousTransactionDetection() {
  const parser = new SelfLearningParser()

  // Parse unknown merchants
  const text = `
    15/04/2026 UNKNOWN MERCHANT1 50,00
    16/04/2026 UNKNOWN MERCHANT2 75,00
    17/04/2026 ANOTHER UNKNOWN 100,00
  `

  const transactions = await parser.parseTransactions(text)

  // Transactions with category="Outros" or low confidence should be flagged
  const flagged = transactions.filter((t) => t.reviewRequired)

  return {
    total: transactions.length,
    flaggedForReview: flagged.length,
    transactions,
  }
}

export async function example5_ContinuousImprovement() {
  const parser = new SelfLearningParser()

  // Batch 1: Initial parse
  const batch1 = `
    10/04/2026 IFOOD 1 100,00
    11/04/2026 IFOOD 2 120,00
    12/04/2026 IFOOD 3 110,00
  `

  const result1 = await parser.parseTransactions(batch1)

  // Batch 2: More examples of same merchants
  const batch2 = `
    13/04/2026 IFOOD 4 95,00
    14/04/2026 IFOOD 5 105,00
    15/04/2026 UBER 1 30,00
    16/04/2026 UBER 2 35,00
  `

  const result2 = await parser.parseTransactions(batch2)

  // Check confidence improvement
  const ifoodBatch1 = result1.find((t) => t.merchantKey === "ifood")
  const ifoodBatch2 = result2.find((t) => t.merchantKey === "ifood")
  const uberBatch2 = result2.find((t) => t.merchantKey === "uber")

  return {
    batch1Confidence: ifoodBatch1?.confidence,
    batch2IFOODConfidence: ifoodBatch2?.confidence,
    batch2UBERConfidence: uberBatch2?.confidence,
    improvement: ifoodBatch2 && ifoodBatch1 ? ifoodBatch2.confidence - ifoodBatch1.confidence : 0,
  }
}

export async function example6_PersistenseAcrossSessions() {
  // Session 1
  const parser1 = new SelfLearningParser()
  parser1.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")
  parser1.applyCorrection("tx2", "IFOOD", "Outros", "Alimentação")

  const store = parser1.getStore()
  const stats1 = parser1.getStats()

  // Session 2: Restore from session 1
  const parser2 = new SelfLearningParser()
  parser2.setStore(store)

  const text = `
    20/04/2026 PIX IFOOD 125,50
  `

  const result = await parser2.parseTransactions(text)
  const stats2 = parser2.getStats()

  return {
    session1Stats: stats1,
    session2Stats: stats2,
    parsedAfterRestore: result[0],
    persisted: true,
  }
}

export async function example7_MultiMerchantLearning() {
  const parser = new SelfLearningParser()

  // Teach parser about multiple merchants through corrections
  const merchants = [
    { name: "IFOOD", category: "Alimentação" },
    { name: "UBER", category: "Transporte" },
    { name: "SPOTIFY", category: "Assinaturas" },
    { name: "DROGARIA", category: "Saúde" },
    { name: "MERCADO", category: "Mercado" },
  ]

  let txId = 0
  for (const merchant of merchants) {
    for (let i = 0; i < 3; i++) {
      parser.applyCorrection(`tx${txId++}`, merchant.name, "Outros", merchant.category)
    }
  }

  // Query learned merchants
  const topMerchants = parser.getTopMerchants(10)
  const stats = parser.getStats()

  return {
    learnedMerchants: topMerchants,
    totalStats: stats,
  }
}

export async function example8_RealtimeAdaptation() {
  const parser = new SelfLearningParser()

  // Day 1: First transaction pattern
  const day1 = `
    15/04/2026 NEW MERCHANT 50,00
  `

  let result = await parser.parseTransactions(day1)
  console.log("Day 1 - Unknown merchant, flagged for review:", result[0].reviewRequired)

  // User corrects it
  parser.applyCorrection("day1_tx1", "NEW MERCHANT", result[0].category, "Alimentação")

  // Day 2: Same merchant pattern
  const day2 = `
    16/04/2026 NEW MERCHANT 60,00
  `

  result = await parser.parseTransactions(day2)
  console.log("Day 2 - Same merchant, learned category:", result[0].category)
  console.log("Day 2 - Confidence improved:", result[0].confidence)

  return {
    learned: true,
    dayComparison: "Merchant classification improved with minimum user corrections",
  }
}

export async function runAllExamples() {
  console.log("SELF-LEARNING PARSER - EXAMPLES")
  console.log("═══════════════════════════════════\n")

  console.log("Example 1: Basic Usage")
  const e1 = await example1_BasicUsage()
  console.log(`✓ Parsed ${e1.length} transactions\n`)

  console.log("Example 2: Learning from Corrections")
  const e2 = await example2_LearningFromCorrections()
  console.log(`✓ Before learning: category = "${e2.beforeLearning[0].category}"`)
  console.log(`✓ After learning: category = "${e2.afterLearning[0].category}"\n`)

  console.log("Example 3: Merchant Memory")
  const e3 = await example3_MerchantMemory()
  console.log(`✓ Top merchants learned: ${e3.topMerchants.length}`)
  console.log(`✓ Total merchants: ${e3.stats.totalMerchants}`)
  console.log(`✓ Total corrections: ${e3.stats.totalCorrections}\n`)

  console.log("Example 4: Ambiguous Transaction Detection")
  const e4 = await example4_AmbigiousTransactionDetection()
  console.log(`✓ Total transactions: ${e4.total}`)
  console.log(`✓ Flagged for review: ${e4.flaggedForReview}\n`)

  console.log("Example 5: Continuous Improvement")
  const e5 = await example5_ContinuousImprovement()
  console.log(`✓ Batch 1 confidence: ${(e5.batch1Confidence || 0).toFixed(2)}`)
  console.log(`✓ Batch 2 confidence: ${(e5.batch2IFOODConfidence || 0).toFixed(2)}`)
  console.log(`✓ Improvement: ${(e5.improvement || 0).toFixed(3)}\n`)

  console.log("Example 6: Persistence Across Sessions")
  const e6 = await example6_PersistenseAcrossSessions()
  console.log(`✓ Session 1 merchants: ${e6.session1Stats.totalMerchants}`)
  console.log(`✓ Session 2 merchants: ${e6.session2Stats.totalMerchants}`)
  console.log(`✓ Learned category applied: ${e6.parsedAfterRestore.category}\n`)

  console.log("Example 7: Multi-Merchant Learning")
  const e7 = await example7_MultiMerchantLearning()
  console.log(`✓ Merchants learned: ${e7.learnedMerchants.length}`)
  console.log(`✓ Total corrections: ${e7.totalStats.totalCorrections}\n`)

  console.log("Example 8: Real-time Adaptation")
  const e8 = await example8_RealtimeAdaptation()
  console.log(`✓ ${e8.dayComparison}\n`)

  console.log("═══════════════════════════════════")
  console.log("ALL EXAMPLES COMPLETED SUCCESSFULLY")
}
