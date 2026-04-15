import { normalize } from "../transaction-normalizer-fixed"

const NOISE_WORDS = [
  "de",
  "da",
  "do",
  "e",
  "em",
  "no",
  "na",
  "transferencia",
  "compra",
  "pagamento",
  "debito",
  "credito",
  "pix",
  "ted",
  "doc",
  "boleto",
  "saque",
  "deposito",
]

export function getMerchantKey(description: string): string {
  if (!description) return ""

  let normalized = normalize(description)

  // Remove noise words
  const words = normalized
    .split(" ")
    .filter((word) => word.length > 2 && !NOISE_WORDS.includes(word) && !/^\d+$/.test(word))

  if (words.length === 0) {
    return normalized.substring(0, 10)
  }

  // Return first meaningful token or combination of first two
  if (words.length === 1) {
    return words[0]!
  }

  // Check for specific patterns
  const combined = words[0]!
  if (combined.includes("ifood") || combined.includes("uber") || combined.includes("spotify")) {
    return combined
  }

  return words[0]!
}

export function normalizeMerchantName(description: string): string {
  const key = getMerchantKey(description)
  const words = description.split(" ").filter((w) => w.length > 0)

  for (const word of words) {
    const normalized = normalize(word)
    if (normalized === key) {
      return word
    }
  }

  return key
}

export function extractMerchantTokens(description: string): string[] {
  const normalized = normalize(description)
  return normalized
    .split(" ")
    .filter((word) => word.length > 2 && !NOISE_WORDS.includes(word))
    .slice(0, 3)
}

export function isKnownMerchant(merchantKey: string, merchantMemory: Record<string, any>): boolean {
  return merchantKey in merchantMemory && merchantMemory[merchantKey].usageCount > 0
}

export function getMerchantCategory(
  merchantKey: string,
  merchantMemory: Record<string, any>
): string | null {
  const entry = merchantMemory[merchantKey]
  return entry ? entry.category : null
}

export function getMerchantConfidence(
  merchantKey: string,
  merchantMemory: Record<string, any>
): number {
  const entry = merchantMemory[merchantKey]
  if (!entry) return 0

  // Confidence increases with usage count, capped at 0.95
  const usageBoost = Math.min(entry.usageCount * 0.05, 0.3)
  return Math.min(entry.confidence + usageBoost, 0.95)
}

export function updateMerchantStats(
  merchantKey: string,
  category: string,
  confidence: number,
  merchantMemory: Record<string, any>
): void {
  if (merchantKey in merchantMemory) {
    const entry = merchantMemory[merchantKey]
    entry.usageCount += 1
    entry.category = category
    entry.confidence = Math.min((entry.confidence + confidence) / 2, 0.95)
    entry.lastSeen = new Date().toISOString()
  } else {
    merchantMemory[merchantKey] = {
      category,
      confidence,
      usageCount: 1,
      lastSeen: new Date().toISOString(),
    }
  }
}
