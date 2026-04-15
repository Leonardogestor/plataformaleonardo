import { ContextualTransaction } from "./context-engine"
import { HistoricalProfile, MerchantHistory, CategoryStatistics } from "./historical-store"

export interface EnrichedTransaction extends ContextualTransaction {
  behaviorScore?: number
  historicalAnomalyScore?: number
  isNewMerchant?: boolean
  merchantFrequency?: number
}

function getMerchantFromDescription(description: string): string {
  return description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .join("_")
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function detectBehavioralAnomalies(
  tx: ContextualTransaction,
  profile: HistoricalProfile | null
): number {
  if (!profile) return 0

  let anomalyScore = 0

  const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
  const merchantHistory = profile.merchants[merchantKey]
  const categoryStats = profile.categoryStats[tx.category]

  // Check merchant-based anomalies
  if (merchantHistory) {
    const merchantMean = merchantHistory.avgValue
    const merchantValues = merchantHistory.valueHistory || []
    const merchantStdDev =
      merchantValues.length > 0 ? calculateStdDev(merchantValues, merchantMean) : merchantMean * 0.3

    // Value far above merchant average (2x or more)
    if (tx.value > merchantMean * 2) {
      const deviation = (tx.value - merchantMean) / merchantMean
      anomalyScore = Math.max(anomalyScore, Math.min(deviation / 5, 0.7))
    }

    // Statistical deviation
    if (merchantStdDev > 0) {
      const zScore = Math.abs(tx.value - merchantMean) / merchantStdDev
      if (zScore > 2.5) {
        anomalyScore = Math.max(anomalyScore, Math.min(zScore / 10, 0.6))
      }
    }
  } else if (
    tx.value >
    calculateMean(Object.values(profile.merchants).map((m) => m.avgValue)) * 2
  ) {
    // New merchant with high value
    anomalyScore = Math.max(anomalyScore, 0.5)
  }

  // Check category-based anomalies
  if (categoryStats && tx.type === "EXPENSE") {
    const categoryMean = categoryStats.avgValue
    const categoryFrequency = categoryStats.frequency

    if (tx.value > categoryMean * 3) {
      anomalyScore = Math.max(anomalyScore, 0.6)
    }

    // Unusual category spend (high frequency category with unusually low value could indicate fraud)
    if (categoryFrequency > 10 && tx.value < categoryMean * 0.3) {
      anomalyScore = Math.max(anomalyScore, 0.4)
    }
  }

  return Math.min(anomalyScore, 1.0)
}

export function calculateBehaviorScore(
  tx: ContextualTransaction,
  profile: HistoricalProfile | null
): number {
  if (!profile) return 0.5

  let score = 0.5 // Base score
  const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
  const merchantHistory = profile.merchants[merchantKey]
  const categoryStats = profile.categoryStats[tx.category]

  // Frequent merchant boost
  if (merchantHistory) {
    const frequency = merchantHistory.frequency
    if (frequency > 20) {
      score += 0.25
    } else if (frequency > 10) {
      score += 0.15
    } else if (frequency > 5) {
      score += 0.1
    } else if (frequency > 1) {
      score += 0.05
    }

    // Consistent value boost
    if (merchantHistory.valueHistory && merchantHistory.valueHistory.length >= 3) {
      const mean = merchantHistory.avgValue
      const stdDev = calculateStdDev(merchantHistory.valueHistory, mean)
      const coefficient = stdDev / mean // Lower = more consistent

      if (coefficient < 0.1) {
        score += 0.15
      } else if (coefficient < 0.2) {
        score += 0.1
      } else if (coefficient < 0.5) {
        score += 0.05
      }

      // Value within expected range
      if (tx.value >= mean * 0.9 && tx.value <= mean * 1.1) {
        score += 0.05
      }
    }

    // Recent activity boost
    const daysSinceLastSeen = (Date.now() - merchantHistory.lastSeen) / (1000 * 60 * 60 * 24)
    if (daysSinceLastSeen < 7) {
      score += 0.1
    } else if (daysSinceLastSeen < 30) {
      score += 0.05
    }
  } else {
    // New merchant penalty
    score -= 0.1
  }

  // Category consistency
  if (categoryStats) {
    const categoryFrequency = categoryStats.frequency
    if (categoryFrequency > 30) {
      score += 0.1
    } else if (categoryFrequency > 10) {
      score += 0.05
    }

    // Value within category range
    if (tx.value >= categoryStats.avgValue * 0.8 && tx.value <= categoryStats.avgValue * 1.2) {
      score += 0.05
    }
  } else {
    // New category penalty
    score -= 0.05
  }

  // Existing confidence boost
  score += tx.confidence * 0.1

  return Math.max(0, Math.min(score, 1.0))
}

export function enrichTransaction(
  tx: ContextualTransaction,
  profile: HistoricalProfile | null,
  isNewMerchant: boolean,
  merchantFrequency: number
): EnrichedTransaction {
  const enriched: EnrichedTransaction = {
    ...tx,
    behaviorScore: calculateBehaviorScore(tx, profile),
    historicalAnomalyScore: detectBehavioralAnomalies(tx, profile),
    isNewMerchant,
    merchantFrequency,
  }

  return enriched
}

export function compareTransactionToHistory(
  tx: ContextualTransaction,
  profile: HistoricalProfile | null
): {
  isNormal: boolean
  anomalyScore: number
  reason: string
} {
  if (!profile) {
    return {
      isNormal: true,
      anomalyScore: 0,
      reason: "No historical profile",
    }
  }

  const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
  const merchantHistory = profile.merchants[merchantKey]

  if (!merchantHistory) {
    return {
      isNormal: true,
      anomalyScore: 0.3,
      reason: "New merchant",
    }
  }

  const anomalyScore = detectBehavioralAnomalies(tx, profile)

  if (anomalyScore > 0.7) {
    return {
      isNormal: false,
      anomalyScore,
      reason: `High deviation from merchant average (${anomalyScore.toFixed(2)})`,
    }
  }

  if (anomalyScore > 0.4) {
    return {
      isNormal: true,
      anomalyScore,
      reason: `Moderate deviation from expected behavior`,
    }
  }

  return {
    isNormal: true,
    anomalyScore: 0,
    reason: "Within normal behavior",
  }
}
