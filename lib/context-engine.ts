export interface ContextualTransaction {
  date: string
  type: "INCOME" | "EXPENSE" | "INVESTIMENTO"
  category: string
  value: number
  description: string
  confidence: number
  merchantKey?: string
  contextTags?: string[]
  relatedTransactions?: string[]
  anomalyScore?: number
  patternType?: string | null
}

interface MerchantStats {
  values: number[]
  count: number
  mean: number
  stdDev: number
}

interface TimeWindow {
  transactions: ContextualTransaction[]
  startTime: Date
  endTime: Date
}

function getMerchantFromDescription(description: string): string {
  return description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .join("_")
}

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number) as [number, number, number]
  return new Date(year, month - 1, day)
}

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0]!
}

function getTimeKey(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
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

export function groupByTime(
  transactions: ContextualTransaction[],
  windowMinutes: number = 10
): TimeWindow[] {
  if (transactions.length === 0) return []

  const sorted = [...transactions].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  )

  const windows: TimeWindow[] = []
  let currentWindow: ContextualTransaction[] = [sorted[0]!]
  let windowStart = parseDate(sorted[0]!.date)

  for (let i = 1; i < sorted.length; i++) {
    const currentDate = parseDate(sorted[i]!.date)
    const timeDiffMinutes = (currentDate.getTime() - windowStart.getTime()) / (1000 * 60)

    if (timeDiffMinutes <= windowMinutes) {
      currentWindow.push(sorted[i]!)
    } else {
      windows.push({
        transactions: currentWindow,
        startTime: windowStart,
        endTime: parseDate(currentWindow[currentWindow.length - 1]!.date),
      })
      currentWindow = [sorted[i]!]
      windowStart = currentDate
    }
  }

  if (currentWindow.length > 0) {
    windows.push({
      transactions: currentWindow,
      startTime: windowStart,
      endTime: parseDate(currentWindow[currentWindow.length - 1]!.date),
    })
  }

  return windows
}

export function detectTransferPairs(
  transactions: ContextualTransaction[]
): ContextualTransaction[] {
  const result = transactions.map((tx) => ({ ...tx }))
  const processed = new Set<number>()

  for (let i = 0; i < result.length; i++) {
    if (processed.has(i)) continue

    const tx1 = result[i]!

    for (let j = i + 1; j < result.length; j++) {
      if (processed.has(j)) continue

      const tx2 = result[j]!

      // Check if values match
      if (Math.abs(tx1.value - tx2.value) > 0.01) continue

      // Check if opposite types
      const isOppositeType =
        (tx1.type === "INCOME" && tx2.type === "EXPENSE") ||
        (tx1.type === "EXPENSE" && tx2.type === "INCOME")
      if (!isOppositeType) continue

      // Check timestamp proximity (within 24 hours)
      const date1 = parseDate(tx1.date)
      const date2 = parseDate(tx2.date)
      const hoursDiff = Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60)

      if (hoursDiff <= 24) {
        // Mark as transfer pair
        const resI = result[i]!
        const resJ = result[j]!

        if (!resI.contextTags) resI.contextTags = []
        if (!resJ.contextTags) resJ.contextTags = []

        resI.contextTags.push("paired_transfer")
        resJ.contextTags.push("paired_transfer")

        resI.patternType = "internal_transfer"
        resJ.patternType = "internal_transfer"

        if (!resI.relatedTransactions) resI.relatedTransactions = []
        if (!resJ.relatedTransactions) resJ.relatedTransactions = []

        resI.relatedTransactions.push(tx2.description)
        resJ.relatedTransactions.push(tx1.description)

        processed.add(i)
        processed.add(j)
        break
      }
    }
  }

  // Ensure all transactions have required fields
  return result.map((tx) => ({
    ...tx,
    contextTags: tx.contextTags || [],
    relatedTransactions: tx.relatedTransactions || [],
    anomalyScore: tx.anomalyScore || 0,
    patternType: tx.patternType || null,
  }))
}

export function detectRecurring(transactions: ContextualTransaction[]): ContextualTransaction[] {
  const result = transactions.map((tx) => ({ ...tx }))

  // Group by normalized description and value range
  const groups: { [key: string]: number[] } = {}

  for (let i = 0; i < result.length; i++) {
    const tx = result[i]!
    const normalized = tx.description.toLowerCase().replace(/[0-9]/g, "X").substring(0, 30)
    const valueRange = Math.floor(tx.value / 10) * 10 // Round to nearest 10

    const key = `${normalized}_${valueRange}`

    if (!groups[key]) groups[key] = []
    groups[key].push(i)
  }

  // Find recurring patterns (3+ occurrences)
  for (const [key, indices] of Object.entries(groups)) {
    if (indices.length >= 3) {
      for (const idx of indices) {
        const txAtIdx = result[idx]!
        if (!txAtIdx.contextTags) txAtIdx.contextTags = []
        txAtIdx.contextTags.push("subscription_candidate")
        txAtIdx.patternType = "recurring"
        txAtIdx.relatedTransactions = indices
          .filter((i) => i !== idx)
          .map((i) => result[i]!.description)
      }
    }
  }

  // Ensure all transactions have required fields
  return result.map((tx) => ({
    ...tx,
    contextTags: tx.contextTags || [],
    relatedTransactions: tx.relatedTransactions || [],
    anomalyScore: tx.anomalyScore || 0,
    patternType: tx.patternType || null,
  }))
}

export function analyzeMerchantBehavior(
  transactions: ContextualTransaction[]
): ContextualTransaction[] {
  const result = transactions.map((tx) => ({ ...tx }))

  // Group by merchant
  const merchantGroups: { [key: string]: ContextualTransaction[] } = {}

  for (const tx of result) {
    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    if (!merchantGroups[merchantKey]) merchantGroups[merchantKey] = []
    merchantGroups[merchantKey].push(tx)
  }

  // Calculate stats per merchant
  const merchantStats: { [key: string]: MerchantStats } = {}

  for (const [merchant, txs] of Object.entries(merchantGroups)) {
    const values = txs.map((tx) => tx.value)
    const mean = calculateMean(values)
    const stdDev = calculateStdDev(values, mean)

    merchantStats[merchant] = {
      values,
      count: txs.length,
      mean,
      stdDev,
    }
  }

  // Mark deviations
  for (const tx of result) {
    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    const stats = merchantStats[merchantKey]

    if (stats && stats.count >= 2) {
      const deviation = Math.abs(tx.value - stats.mean)
      const threshold = stats.stdDev * 2 // 2 standard deviations

      if (deviation > threshold) {
        if (!tx.contextTags) tx.contextTags = []
        tx.contextTags.push("merchant_deviation")
        tx.anomalyScore = Math.min(deviation / (stats.mean * 2), 1.0)
      }
    }
  }

  return result
}

export function detectAnomalies(transactions: ContextualTransaction[]): ContextualTransaction[] {
  const result = transactions.map((tx) => {
    return {
      ...tx,
      anomalyScore: tx.anomalyScore || 0,
    }
  })

  if (result.length < 2) return result

  // Calculate overall stats
  const values = result.map((tx) => tx.value)
  const mean = calculateMean(values)
  const stdDev = calculateStdDev(values, mean)

  // Detect anomalies
  for (const tx of result) {
    let anomalyScore = tx.anomalyScore || 0

    // Value deviation from mean
    if (stdDev > 0) {
      const zScore = Math.abs(tx.value - mean) / stdDev
      if (zScore > 2) {
        anomalyScore = Math.max(anomalyScore, Math.min(zScore / 5, 1.0))
      }
    }

    // High-value transaction
    if (tx.value > mean * 3 && tx.type === "EXPENSE") {
      anomalyScore = Math.max(anomalyScore, 0.6)
    }

    // New merchant (single occurrence)
    const merchantKey = tx.merchantKey || getMerchantFromDescription(tx.description)
    const merchantCount = result.filter((t) => {
      const key = t.merchantKey || getMerchantFromDescription(t.description)
      return key === merchantKey
    }).length

    if (merchantCount === 1 && tx.value > mean) {
      anomalyScore = Math.max(anomalyScore, 0.4)
    }

    tx.anomalyScore = Math.min(anomalyScore, 1.0)

    if (tx.anomalyScore > 0.5) {
      if (!tx.contextTags) tx.contextTags = []
      if (!tx.contextTags.includes("anomaly")) {
        tx.contextTags.push("anomaly")
      }
    }
  }

  return result
}

export function adjustCategoryWithContext(tx: ContextualTransaction): ContextualTransaction {
  const result = { ...tx }

  // If internal transfer, force category
  if (result.patternType === "internal_transfer") {
    result.category = "Transferência"
    result.confidence = Math.min(result.confidence + 0.2, 1.0)
    return result
  }

  // If recurring pattern, mark as subscription
  if (result.patternType === "recurring") {
    if (result.category !== "Assinaturas") {
      result.category = "Assinaturas"
      result.confidence = Math.min(result.confidence + 0.15, 1.0)
    }
    return result
  }

  // For PIX transactions with known merchant
  if (result.description.toLowerCase().includes("pix")) {
    if (result.merchantKey && result.category && result.category !== "Serviços") {
      // Keep merchant-based category if available
      result.confidence = Math.min(result.confidence + 0.1, 1.0)
    }
  }

  return result
}

export function applyContextEngine(transactions: ContextualTransaction[]): ContextualTransaction[] {
  if (transactions.length === 0) return []

  // Initialize contextual fields
  let enhanced = transactions.map((tx) => ({
    ...tx,
    contextTags: tx.contextTags || [],
    relatedTransactions: tx.relatedTransactions || [],
    anomalyScore: tx.anomalyScore || 0,
    patternType: tx.patternType || null,
  }))

  // Step 1: Group by time
  const timeWindows = groupByTime(enhanced, 10)
  const windowTransactions = timeWindows.flatMap((w) => w.transactions)

  // Reindex to match original order
  const indexMap = new Map<number, number>()
  for (let i = 0; i < enhanced.length; i++) {
    indexMap.set(i, i)
  }

  // Step 2: Detect transfer pairs (within windows + all)
  enhanced = detectTransferPairs(enhanced) as typeof enhanced

  // Step 3: Detect recurring patterns
  enhanced = detectRecurring(enhanced) as typeof enhanced

  // Step 4: Analyze merchant behavior
  enhanced = analyzeMerchantBehavior(enhanced) as typeof enhanced

  // Step 5: Detect anomalies
  enhanced = detectAnomalies(enhanced) as typeof enhanced

  // Step 6: Adjust categories with context
  enhanced = enhanced.map((tx) => adjustCategoryWithContext(tx)) as typeof enhanced

  // Step 7: Clean up and finalize
  const result = enhanced.map((tx) => ({
    ...tx,
    contextTags: tx.contextTags && tx.contextTags.length > 0 ? tx.contextTags : undefined,
    relatedTransactions:
      tx.relatedTransactions && tx.relatedTransactions.length > 0
        ? tx.relatedTransactions
        : undefined,
    anomalyScore: tx.anomalyScore && tx.anomalyScore > 0 ? tx.anomalyScore : undefined,
    patternType: tx.patternType,
  }))

  return result
}
