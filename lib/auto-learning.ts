import { getMerchantKey } from "./merchant-memory"
import { MerchantMemoryEntry, PatternStats } from "./learning-store"

interface ParsedTransaction {
  description: string
  category: string
  confidence: number
}

export function learnFromTransactions(
  transactions: ParsedTransaction[],
  merchantMemory: Record<string, MerchantMemoryEntry>,
  patternStats: PatternStats
): void {
  // Group by merchant key
  const merchantGroups: Record<string, ParsedTransaction[]> = {}

  for (const tx of transactions) {
    const key = getMerchantKey(tx.description)
    if (key) {
      if (!merchantGroups[key]) {
        merchantGroups[key] = []
      }
      merchantGroups[key].push(tx)
    }
  }

  // Learn from patterns
  for (const [merchantKey, txs] of Object.entries(merchantGroups)) {
    if (txs.length >= 2) {
      // Calculate consensus category
      const categoryVotes: Record<string, number> = {}
      let totalConfidence = 0

      for (const tx of txs) {
        categoryVotes[tx.category] = (categoryVotes[tx.category] || 0) + 1
        totalConfidence += tx.confidence
      }

      // Find most common category
      let consensusCategory = txs[0]!.category
      let maxVotes = 0

      for (const [category, votes] of Object.entries(categoryVotes)) {
        if (votes > maxVotes) {
          maxVotes = votes
          consensusCategory = category
        }
      }

      // Calculate average confidence
      const avgConfidence = totalConfidence / txs.length

      // Update or create merchant memory
      if (merchantKey in merchantMemory) {
        const entry = merchantMemory[merchantKey]!
        entry.category = consensusCategory
        entry.confidence = Math.min((entry.confidence + avgConfidence) / 2, 0.95)
        entry.usageCount += txs.length
      } else {
        merchantMemory[merchantKey] = {
          category: consensusCategory,
          confidence: Math.min(avgConfidence, 0.85),
          usageCount: txs.length,
          lastSeen: new Date().toISOString(),
        }
      }

      // Update pattern stats
      const pattern = merchantKey
      if (pattern in patternStats) {
        const stat = patternStats[pattern]!
        stat.occurrences += txs.length
        stat.confidence = Math.min((stat.confidence + avgConfidence) / 2, 0.95)
      } else {
        patternStats[pattern] = {
          category: consensusCategory,
          occurrences: txs.length,
          confidence: Math.min(avgConfidence, 0.85),
        }
      }
    }
  }
}

export function detectRepeatedPatterns(transactions: ParsedTransaction[]): Record<
  string,
  {
    merchantKey: string
    category: string
    count: number
    avgConfidence: number
  }
> {
  const patterns: Record<
    string,
    {
      merchantKey: string
      category: string
      transactions: ParsedTransaction[]
    }
  > = {}

  for (const tx of transactions) {
    const key = getMerchantKey(tx.description)
    if (key) {
      const patternKey = `${key}_${tx.category}`
      if (patternKey in patterns) {
        patterns[patternKey]!.transactions.push(tx)
      } else {
        patterns[patternKey] = {
          merchantKey: key,
          category: tx.category,
          transactions: [tx],
        }
      }
    }
  }

  const result: Record<
    string,
    {
      merchantKey: string
      category: string
      count: number
      avgConfidence: number
    }
  > = {}

  for (const [patternKey, pattern] of Object.entries(patterns)) {
    if (pattern.transactions.length >= 2) {
      const avgConfidence =
        pattern.transactions.reduce((sum, tx) => sum + tx.confidence, 0) /
        pattern.transactions.length

      result[patternKey] = {
        merchantKey: pattern.merchantKey,
        category: pattern.category,
        count: pattern.transactions.length,
        avgConfidence,
      }
    }
  }

  return result
}

export function autoLearnCategories(
  transactions: ParsedTransaction[],
  merchantMemory: Record<string, MerchantMemoryEntry>,
  minOccurrences: number = 3,
  minConfidence: number = 0.7
): void {
  // Group by merchant
  const merchantTxs: Record<string, ParsedTransaction[]> = {}

  for (const tx of transactions) {
    const key = getMerchantKey(tx.description)
    if (key && tx.confidence >= minConfidence) {
      if (!merchantTxs[key]) {
        merchantTxs[key] = []
      }
      merchantTxs[key].push(tx)
    }
  }

  // Learn if pattern strong enough
  for (const [merchantKey, txs] of Object.entries(merchantTxs)) {
    if (txs.length >= minOccurrences) {
      // Check category consistency
      const categoryDistribution: Record<string, number> = {}
      for (const tx of txs) {
        categoryDistribution[tx.category] = (categoryDistribution[tx.category] || 0) + 1
      }

      // If one category dominates (>80%), learn it
      for (const [category, count] of Object.entries(categoryDistribution)) {
        if (count / txs.length > 0.8) {
          const avgConfidence = txs.reduce((sum, tx) => sum + tx.confidence, 0) / txs.length

          if (merchantKey in merchantMemory) {
            const entry = merchantMemory[merchantKey]!
            entry.category = category
            entry.confidence = Math.min(
              (entry.confidence + avgConfidence) / 2,
              0.95
            )
          } else {
            merchantMemory[merchantKey] = {
              category,
              confidence: Math.min(avgConfidence, 0.85),
              usageCount: txs.length,
              lastSeen: new Date().toISOString(),
            }
          }

          break
        }
      }
    }
  }
}

export function getHighConfidencePatterns(
  merchantMemory: Record<string, MerchantMemoryEntry>,
  minUsageCount: number = 5,
  minConfidence: number = 0.8
): Record<string, MerchantMemoryEntry> {
  const highConfidence: Record<string, MerchantMemoryEntry> = {}

  for (const [merchantKey, entry] of Object.entries(merchantMemory)) {
    if (entry.usageCount >= minUsageCount && entry.confidence >= minConfidence) {
      highConfidence[merchantKey] = entry
    }
  }

  return highConfidence
}
