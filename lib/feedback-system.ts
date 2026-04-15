import { Correction, MerchantMemoryEntry } from "./learning-store"
import { getMerchantKey } from "./merchant-memory"

export interface CorrectionData {
  originalCategory: string
  correctedCategory: string
  originalConfidence?: number
}

export function applyUserCorrection(
  transactionId: string,
  description: string,
  correctionData: CorrectionData,
  merchantMemory: Record<string, MerchantMemoryEntry>,
  corrections: Correction[]
): void {
  const merchantKey = getMerchantKey(description)

  // Record correction
  const correction: Correction = {
    transactionId,
    originalCategory: correctionData.originalCategory,
    correctedCategory: correctionData.correctedCategory,
    timestamp: new Date().toISOString(),
    merchantKey,
  }

  corrections.push(correction)

  // Update merchant memory
  if (merchantKey) {
    if (merchantKey in merchantMemory) {
      const entry = merchantMemory[merchantKey]

      // Boost confidence when user corrects
      entry.category = correctionData.correctedCategory
      entry.confidence = Math.min(entry.confidence + 0.15, 0.95)
      entry.usageCount += 1

      // Double weight if corrected multiple times
      const relatedCorrections = corrections.filter(
        (c) =>
          c.merchantKey === merchantKey && c.correctedCategory === correctionData.correctedCategory
      )
      if (relatedCorrections.length > 1) {
        entry.confidence = Math.min(entry.confidence + 0.1, 0.95)
      }
    } else {
      // New merchant from correction
      merchantMemory[merchantKey] = {
        category: correctionData.correctedCategory,
        confidence: 0.85,
        usageCount: 1,
        lastSeen: new Date().toISOString(),
      }
    }
  }
}

export function getCorrectionStats(corrections: Correction[]): Record<
  string,
  {
    merchantKey: string
    originalCategory: string
    correctedCategory: string
    count: number
  }
> {
  const stats: Record<
    string,
    {
      merchantKey: string
      originalCategory: string
      correctedCategory: string
      count: number
    }
  > = {}

  for (const correction of corrections) {
    const key = `${correction.merchantKey}_${correction.originalCategory}_${correction.correctedCategory}`

    if (key in stats) {
      stats[key].count += 1
    } else {
      stats[key] = {
        merchantKey: correction.merchantKey,
        originalCategory: correction.originalCategory,
        correctedCategory: correction.correctedCategory,
        count: 1,
      }
    }
  }

  return stats
}

export function getRecentCorrections(corrections: Correction[], limit: number = 50): Correction[] {
  return corrections.slice(-limit)
}

export function getMerchantCorrections(
  merchantKey: string,
  corrections: Correction[]
): Correction[] {
  return corrections.filter((c) => c.merchantKey === merchantKey)
}

export function applyBatchCorrections(
  batchCorrections: Array<{
    transactionId: string
    description: string
    correctionData: CorrectionData
  }>,
  merchantMemory: Record<string, MerchantMemoryEntry>,
  corrections: Correction[]
): void {
  for (const item of batchCorrections) {
    applyUserCorrection(
      item.transactionId,
      item.description,
      item.correctionData,
      merchantMemory,
      corrections
    )
  }
}

export function rollbackCorrection(
  correction: Correction,
  corrections: Correction[],
  merchantMemory: Record<string, MerchantMemoryEntry>
): void {
  const index = corrections.indexOf(correction)
  if (index > -1) {
    corrections.splice(index, 1)
  }

  // Adjust confidence if needed
  if (correction.merchantKey in merchantMemory) {
    const entry = merchantMemory[correction.merchantKey]
    entry.confidence = Math.max(entry.confidence - 0.1, 0.3)
    entry.usageCount = Math.max(entry.usageCount - 1, 0)
  }
}
