import { ContextualTransaction } from "./context-engine"
import {
  HistoricalProfile,
  MerchantHistory,
  CategoryStatistics,
  LongTermPattern,
  HistoricalStore,
} from "./historical-store"
import { EnrichedTransaction } from "./behavioral-analysis"

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

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

export function buildUserProfile(transactions: ContextualTransaction[]): HistoricalProfile {
  const profile: HistoricalProfile = {
    userId: "default",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    merchants: {},
    categoryStats: {},
    patterns: {
      recurring: [],
      transfers: [],
      clusters: [],
    },
    totalSpent: 0,
    transactionCount: transactions.length,
  }

  // Initialize merchants and category stats
  const merchantsMap: {
    [key: string]: {
      values: number[]
      categories: Set<string>
      dates: number[]
      lastSeen: number
      category: string
    }
  } = {}

  const categoryMap: {
    [key: string]: {
      values: number[]
      merchants: Set<string>
      count: number
      totalSpent: number
    }
  } = {}

  // First pass: collect data
  for (const tx of transactions) {
    if (tx.type === "EXPENSE") {
      profile.totalSpent += tx.value
    }

    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    const date = parseDate(tx.date)
    const timestamp = date.getTime()

    // Merchant tracking
    if (!merchantsMap[merchantKey]) {
      merchantsMap[merchantKey] = {
        values: [],
        categories: new Set(),
        dates: [],
        lastSeen: timestamp,
        category: tx.category,
      }
    }

    merchantsMap[merchantKey].values.push(tx.value)
    merchantsMap[merchantKey].categories.add(tx.category)
    merchantsMap[merchantKey].dates.push(timestamp)
    merchantsMap[merchantKey].lastSeen = Math.max(merchantsMap[merchantKey].lastSeen, timestamp)

    // Category tracking
    if (!categoryMap[tx.category]) {
      categoryMap[tx.category] = {
        values: [],
        merchants: new Set(),
        count: 0,
        totalSpent: 0,
      }
    }

    categoryMap[tx.category].values.push(tx.value)
    categoryMap[tx.category].merchants.add(merchantKey)
    categoryMap[tx.category].count++
    categoryMap[tx.category].totalSpent += tx.value
  }

  // Build merchant history
  for (const [merchantKey, data] of Object.entries(merchantsMap)) {
    const avgValue = calculateMean(data.values)
    const history: MerchantHistory = {
      avgValue,
      frequency: data.values.length,
      lastSeen: data.lastSeen,
      category: data.category,
      totalSpent: data.values.reduce((a, b) => a + b, 0),
      valueHistory: data.values,
      dateHistory: data.dates,
    }
    profile.merchants[merchantKey] = history
  }

  // Build category stats
  for (const [category, data] of Object.entries(categoryMap)) {
    const stats: CategoryStatistics = {
      avgValue: calculateMean(data.values),
      totalSpent: data.totalSpent,
      frequency: data.count,
      merchants: Array.from(data.merchants),
    }
    profile.categoryStats[category] = stats
  }

  return profile
}

export function updateHistoricalProfile(
  profile: HistoricalProfile,
  newTransactions: ContextualTransaction[]
): HistoricalProfile {
  const updated = { ...profile }
  updated.updatedAt = Date.now()
  updated.transactionCount += newTransactions.length

  for (const tx of newTransactions) {
    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    const timestamp = parseDate(tx.date).getTime()

    // Update merchant history
    if (merchantKey in updated.merchants) {
      const history = updated.merchants[merchantKey]
      const oldAvg = history.avgValue
      const oldFreq = history.frequency

      // Incremental average calculation
      history.avgValue = (oldAvg * oldFreq + tx.value) / (oldFreq + 1)
      history.frequency = oldFreq + 1
      history.totalSpent += tx.value
      history.lastSeen = Math.max(history.lastSeen, timestamp)

      if (!history.valueHistory) history.valueHistory = []
      if (!history.dateHistory) history.dateHistory = []

      history.valueHistory.push(tx.value)
      history.dateHistory.push(timestamp)

      // Keep only last 365 entries to avoid bloat
      if (history.valueHistory.length > 365) {
        history.valueHistory.shift()
        history.dateHistory.shift()
      }
    } else {
      // New merchant
      const history: MerchantHistory = {
        avgValue: tx.value,
        frequency: 1,
        lastSeen: timestamp,
        category: tx.category,
        totalSpent: tx.value,
        valueHistory: [tx.value],
        dateHistory: [timestamp],
      }
      updated.merchants[merchantKey] = history
    }

    // Update category stats
    if (tx.category in updated.categoryStats) {
      const stats = updated.categoryStats[tx.category]
      const oldAvg = stats.avgValue
      const oldFreq = stats.frequency

      stats.avgValue = (oldAvg * oldFreq + tx.value) / (oldFreq + 1)
      stats.frequency = oldFreq + 1
      stats.totalSpent += tx.value
    } else {
      const stats: CategoryStatistics = {
        avgValue: tx.value,
        totalSpent: tx.value,
        frequency: 1,
        merchants: [merchantKey],
      }
      updated.categoryStats[tx.category] = stats
    }

    if (tx.type === "EXPENSE") {
      updated.totalSpent += tx.value
    }
  }

  return updated
}

export function detectLongTermPatterns(profile: HistoricalProfile): {
  recurring: LongTermPattern[]
  transfers: LongTermPattern[]
  clusters: LongTermPattern[]
} {
  const patterns = {
    recurring: [] as LongTermPattern[],
    transfers: [] as LongTermPattern[],
    clusters: [] as LongTermPattern[],
  }

  // Detect recurring patterns from merchant history
  for (const [merchantKey, history] of Object.entries(profile.merchants)) {
    if (history.frequency >= 3) {
      // Calculate frequency pattern
      if (history.dateHistory && history.dateHistory.length >= 3) {
        const intervals: number[] = []
        for (let i = 1; i < history.dateHistory.length; i++) {
          intervals.push(
            (history.dateHistory[i] - history.dateHistory[i - 1]) / (1000 * 60 * 60 * 24)
          )
        }

        const avgInterval = calculateMean(intervals)
        const stdInterval = calculateStdDev(intervals, avgInterval)

        // If low deviation in intervals, it's recurring
        if (stdInterval < avgInterval * 0.3) {
          patterns.recurring.push({
            type: "recurring",
            category: history.category,
            avgValue: history.avgValue,
            frequency: history.frequency,
            occurrences: history.frequency,
            lastOccurrence: history.lastSeen,
            description: merchantKey,
          })
        }
      }
    }
  }

  // Detect spending clusters
  const categoryClusterMap: {
    [key: string]: {
      totalValue: number
      count: number
      percentage: number
    }
  } = {}

  for (const [category, stats] of Object.entries(profile.categoryStats)) {
    const percentage = (stats.totalSpent / profile.totalSpent) * 100
    if (percentage > 15) {
      // More than 15% of spending
      categoryClusterMap[category] = {
        totalValue: stats.totalSpent,
        count: stats.frequency,
        percentage,
      }

      patterns.clusters.push({
        type: "cluster",
        category,
        avgValue: stats.avgValue,
        frequency: stats.frequency,
        occurrences: stats.frequency,
        lastOccurrence: Date.now(),
      })
    }
  }

  return patterns
}

export function applyHistoricalContext(
  transactions: ContextualTransaction[],
  profile: HistoricalProfile | null,
  store: HistoricalStore,
  userId: string = "default"
): EnrichedTransaction[] {
  if (!profile) {
    profile = buildUserProfile(transactions)
    store.importProfile({ ...profile, userId })
  }

  const enriched: EnrichedTransaction[] = []

  // Track new merchants and frequencies
  const merchantFrequencies: {
    [key: string]: number
  } = {}

  for (const merchant in profile.merchants) {
    merchantFrequencies[merchant] = profile.merchants[merchant].frequency
  }

  // Step 1: Enrich each transaction
  for (const tx of transactions) {
    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    const isNewMerchant = !(merchantKey in profile.merchants)
    const merchantFrequency = merchantFrequencies[merchantKey] || 0

    const enrichedTx: EnrichedTransaction = {
      ...tx,
      isNewMerchant,
      merchantFrequency,
    }

    // Import behavioral analysis
    const { calculateBehaviorScore } = require("./behavioral-analysis")
    const { detectBehavioralAnomalies } = require("./behavioral-analysis")

    enrichedTx.behaviorScore = calculateBehaviorScore(tx, profile)
    enrichedTx.historicalAnomalyScore = detectBehavioralAnomalies(tx, profile)

    enriched.push(enrichedTx)
  }

  // Step 2: Update profile
  const updatedProfile = updateHistoricalProfile(profile, transactions)

  // Step 3: Detect long-term patterns
  const longTermPatterns = detectLongTermPatterns(updatedProfile)
  updatedProfile.patterns = longTermPatterns

  // Step 4: Save updated profile
  store.updateProfile(userId, updatedProfile)

  return enriched
}

export function enrichProfileWithPatterns(
  profile: HistoricalProfile,
  patterns: {
    recurring: LongTermPattern[]
    transfers: LongTermPattern[]
    clusters: LongTermPattern[]
  }
): HistoricalProfile {
  const enriched = { ...profile }
  enriched.patterns = patterns
  enriched.updatedAt = Date.now()
  return enriched
}

export function getProfileInsights(profile: HistoricalProfile): {
  topMerchants: Array<{ merchant: string; spending: number; frequency: number }>
  topCategories: Array<{ category: string; spending: number; percentage: number }>
  recurringPatterns: LongTermPattern[]
  avgDaySpending: number
  highRiskTransactions: number
} {
  // Top merchants by spending
  const topMerchants = Object.entries(profile.merchants)
    .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
    .slice(0, 5)
    .map(([key, history]) => ({
      merchant: key,
      spending: history.totalSpent,
      frequency: history.frequency,
    }))

  // Top categories by spending
  const topCategories = Object.entries(profile.categoryStats)
    .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
    .slice(0, 5)
    .map(([category, stats]) => ({
      category,
      spending: stats.totalSpent,
      percentage: (stats.totalSpent / profile.totalSpent) * 100,
    }))

  // Average daily spending
  const avgDaySpending =
    profile.totalSpent > 0
      ? profile.totalSpent / Math.max(profile.transactionCount, 1) || profile.totalSpent / 30
      : 0

  return {
    topMerchants,
    topCategories,
    recurringPatterns: profile.patterns.recurring,
    avgDaySpending,
    highRiskTransactions: 0,
  }
}
