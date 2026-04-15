import { parseTransactionsAntifragile } from "./transaction-parser-antifragile"
import { getMerchantKey, getMerchantCategory, updateMerchantStats } from "./merchant-memory"
import { learnFromTransactions, autoLearnCategories } from "./auto-learning"
import {
  applyMemoryBoost,
  calculateEnhancedConfidence,
  finalDecision,
  isAmbiguous,
} from "./validation-decision"
import { applyUserCorrection } from "./feedback-system"
import { LearningStoreManager } from "./learning-store"

export interface SelfLearningTransaction {
  date: string
  type: string
  category: string
  value: number
  description: string
  confidence: number
  source: "parser" | "fallback" | "learned"
  reviewRequired: boolean
  merchantKey?: string
}

export class SelfLearningParser {
  private store: LearningStoreManager

  constructor(store?: LearningStoreManager) {
    this.store = store || new LearningStoreManager()
  }

  async parseTransactions(text: string): Promise<SelfLearningTransaction[]> {
    // Step 1-5: Parse using antifragile parser
    const parsed = await parseTransactionsAntifragile(text)

    const results: SelfLearningTransaction[] = []
    const merchantMemory = this.store.getMerchantMemory()
    const patternStats = this.store.getPatternStats()

    // Step 6: Apply memory and boost confidence
    for (const tx of parsed) {
      const merchantKey = getMerchantKey(tx.description)

      // Check if merchant is in memory
      let enhancedTx = { ...tx }
      let source: "parser" | "fallback" | "learned" = tx.source || "parser"

      if (merchantKey && merchantKey in merchantMemory) {
        const memoryEntry = merchantMemory[merchantKey]
        enhancedTx.category = memoryEntry.category
        enhancedTx.confidence = calculateEnhancedConfidence(
          enhancedTx,
          merchantMemory,
          patternStats
        )
        source = "learned"
      }

      // Step 7: Determine if review needed
      const validation = isAmbiguous(enhancedTx, merchantMemory)
      const decision = finalDecision(enhancedTx, merchantMemory, patternStats)

      const reviewRequired =
        validation.requiresReview ||
        decision.action === "review" ||
        (decision.action === "fallback" && enhancedTx.confidence < 0.6)

      // Step 8: Create result
      const result: SelfLearningTransaction = {
        date: enhancedTx.date,
        type: enhancedTx.type,
        category: decision.revisedCategory || enhancedTx.category,
        value: enhancedTx.value,
        description: enhancedTx.description,
        confidence: Math.min(decision.confidence, 1.0),
        source,
        reviewRequired,
        merchantKey: merchantKey || undefined,
      }

      results.push(result)

      // Step 9: Update merchant stats
      if (merchantKey) {
        updateMerchantStats(merchantKey, result.category, result.confidence, merchantMemory)
      }
    }

    // Step 10: Auto-learn from batch
    this.learnFromBatch(results)

    return results
  }

  private learnFromBatch(transactions: SelfLearningTransaction[]): void {
    const merchantMemory = this.store.getMerchantMemory()
    const patternStats = this.store.getPatternStats()

    // Convert to format expected by learning functions
    const learningTxs = transactions.map((tx) => ({
      description: tx.description,
      category: tx.category,
      confidence: tx.confidence,
    }))

    learnFromTransactions(learningTxs, merchantMemory, patternStats)
    autoLearnCategories(learningTxs, merchantMemory)
  }

  applyCorrection(
    transactionId: string,
    description: string,
    originalCategory: string,
    correctedCategory: string
  ): void {
    const merchantMemory = this.store.getMerchantMemory()
    const corrections = this.store.getCorrections()

    applyUserCorrection(
      transactionId,
      description,
      {
        originalCategory,
        correctedCategory,
      },
      merchantMemory,
      corrections
    )
  }

  getMerchantMemory() {
    return this.store.getMerchantMemory()
  }

  getStore() {
    return this.store.getStore()
  }

  setStore(data: any) {
    this.store.setStore(data)
  }

  clearMemory(): void {
    this.store.clear()
  }

  getMerchantStats(merchantKey: string): any {
    const memory = this.store.getMerchantMemory()
    return memory[merchantKey] || null
  }

  getTopMerchants(limit: number = 10): Array<{
    merchantKey: string
    category: string
    confidence: number
    usageCount: number
  }> {
    const memory = this.store.getMerchantMemory()
    return Object.entries(memory)
      .map(([key, entry]) => ({
        merchantKey: key,
        category: entry.category,
        confidence: entry.confidence,
        usageCount: entry.usageCount,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  getCorrectionHistory(limit: number = 100): any[] {
    const corrections = this.store.getCorrections()
    return corrections.slice(-limit)
  }

  getStats(): {
    totalMerchants: number
    totalCorrections: number
    avgConfidence: number
    highConfidenceCount: number
  } {
    const memory = this.store.getMerchantMemory()
    const corrections = this.store.getCorrections()

    const merchants = Object.values(memory)
    const avgConfidence =
      merchants.length > 0
        ? merchants.reduce((sum, m) => sum + m.confidence, 0) / merchants.length
        : 0
    const highConfidenceCount = merchants.filter((m) => m.confidence >= 0.85).length

    return {
      totalMerchants: merchants.length,
      totalCorrections: corrections.length,
      avgConfidence,
      highConfidenceCount,
    }
  }
}

export const defaultParser = new SelfLearningParser()
