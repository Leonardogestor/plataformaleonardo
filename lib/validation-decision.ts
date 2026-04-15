import { getMerchantKey, getMerchantConfidence, isKnownMerchant } from "./merchant-memory"
import { MerchantMemoryEntry, PatternStats } from "./learning-store"

export interface TransactionValidation {
  isAmbiguous: boolean
  requiresReview: boolean
  reason?: string
  suggestion?: string
}

export interface FinalDecision {
  action: "accept" | "fallback" | "review"
  confidence: number
  reason: string
  revisedCategory?: string
}

export function isAmbiguous(
  transaction: any,
  merchantMemory: Record<string, MerchantMemoryEntry>
): TransactionValidation {
  const merchantKey = getMerchantKey(transaction.description)
  const merchantExists = merchantKey && isKnownMerchant(merchantKey, merchantMemory)

  // Ambiguous if: category is generic OR low confidence
  const isGenericCategory = transaction.category === "Outros"
  const isLowConfidence = transaction.confidence < 0.7
  const isUnknownMerchant = merchantKey && !merchantExists

  if (isGenericCategory) {
    return {
      isAmbiguous: true,
      requiresReview: true,
      reason: "Generic category (Outros)",
    }
  }

  if (isLowConfidence && isUnknownMerchant) {
    return {
      isAmbiguous: true,
      requiresReview: true,
      reason: `Low confidence (${transaction.confidence.toFixed(2)}) with unknown merchant`,
    }
  }

  if (isLowConfidence) {
    return {
      isAmbiguous: true,
      requiresReview: false,
      reason: `Low confidence (${transaction.confidence.toFixed(2)})`,
      suggestion: "Consider fallback AI processing",
    }
  }

  return {
    isAmbiguous: false,
    requiresReview: false,
  }
}

export function applyMemoryBoost(
  transaction: any,
  merchantMemory: Record<string, MerchantMemoryEntry>
): any {
  const merchantKey = getMerchantKey(transaction.description)

  if (!merchantKey || !isKnownMerchant(merchantKey, merchantMemory)) {
    return transaction
  }

  const entry = merchantMemory[merchantKey]
  const boostedConfidence = getMerchantConfidence(merchantKey, merchantMemory)

  return {
    ...transaction,
    category: entry.category,
    confidence: Math.min(boostedConfidence, 0.99),
    source: "learned",
  }
}

export function calculateEnhancedConfidence(
  transaction: any,
  merchantMemory: Record<string, MerchantMemoryEntry>,
  patternStats: PatternStats
): number {
  let confidence = transaction.confidence

  const merchantKey = getMerchantKey(transaction.description)

  // +0.2 if merchant in memory
  if (merchantKey && isKnownMerchant(merchantKey, merchantMemory)) {
    confidence += 0.2
  }

  // +0.15 if pattern in stats
  if (merchantKey && merchantKey in patternStats) {
    confidence += 0.15
  }

  // +0.1 if category matches memory
  if (merchantKey && merchantKey in merchantMemory) {
    if (merchantMemory[merchantKey].category === transaction.category) {
      confidence += 0.1
    }
  }

  return Math.min(confidence, 1.0)
}

export function finalDecision(
  transaction: any,
  merchantMemory: Record<string, MerchantMemoryEntry>,
  patternStats: PatternStats
): FinalDecision {
  const enhancedConfidence = calculateEnhancedConfidence(transaction, merchantMemory, patternStats)
  const merchantKey = getMerchantKey(transaction.description)
  const merchantExists = merchantKey && isKnownMerchant(merchantKey, merchantMemory)

  // High confidence: accept
  if (enhancedConfidence >= 0.8) {
    return {
      action: "accept",
      confidence: enhancedConfidence,
      reason: "High confidence",
      revisedCategory: merchantExists ? merchantMemory[merchantKey].category : undefined,
    }
  }

  // Medium confidence: try fallback or use memory
  if (enhancedConfidence >= 0.5) {
    if (merchantExists) {
      return {
        action: "accept",
        confidence: enhancedConfidence,
        reason: "Medium confidence with known merchant",
        revisedCategory: merchantMemory[merchantKey].category,
      }
    }

    return {
      action: "fallback",
      confidence: enhancedConfidence,
      reason: `Medium confidence (${enhancedConfidence.toFixed(2)}) - requires AI processing`,
    }
  }

  // Low confidence: review
  return {
    action: "review",
    confidence: enhancedConfidence,
    reason: `Low confidence (${enhancedConfidence.toFixed(2)}) - manual review required`,
  }
}

export function shouldAcceptAutomatic(
  transaction: any,
  merchantMemory: Record<string, MerchantMemoryEntry>,
  patternStats: PatternStats,
  autoAcceptThreshold: number = 0.85
): boolean {
  const decision = finalDecision(transaction, merchantMemory, patternStats)
  return decision.action === "accept" && decision.confidence >= autoAcceptThreshold
}

export function identifyForReview(
  transactions: any[],
  merchantMemory: Record<string, MerchantMemoryEntry>,
  patternStats: PatternStats
): Array<{
  transaction: any
  reason: string
  confidence: number
}> {
  const forReview = []

  for (const tx of transactions) {
    const decision = finalDecision(tx, merchantMemory, patternStats)
    if (decision.action === "review") {
      forReview.push({
        transaction: tx,
        reason: decision.reason,
        confidence: decision.confidence,
      })
    }
  }

  return forReview
}

export function validateTransactionAccuracy(
  transaction: any,
  expectedCategory: string,
  merchantMemory: Record<string, MerchantMemoryEntry>
): { isCorrect: boolean; actualCategory: string; confidence: number } {
  const merchantKey = getMerchantKey(transaction.description)
  let actualCategory = transaction.category
  let confidence = transaction.confidence

  if (merchantKey && isKnownMerchant(merchantKey, merchantMemory)) {
    actualCategory = merchantMemory[merchantKey].category
    confidence = merchantMemory[merchantKey].confidence
  }

  return {
    isCorrect: actualCategory === expectedCategory,
    actualCategory,
    confidence,
  }
}
