// Store types and initialization
export interface MerchantMemoryEntry {
  category: string
  type?: string
  confidence: number
  usageCount: number
  lastSeen?: string
}

export interface Correction {
  transactionId: string
  originalCategory: string
  correctedCategory: string
  timestamp: string
  merchantKey: string
}

export interface PatternStats {
  [pattern: string]: {
    category: string
    occurrences: number
    confidence: number
  }
}

export interface LearningStore {
  merchantMemory: Record<string, MerchantMemoryEntry>
  corrections: Correction[]
  patternStats: PatternStats
}

export class LearningStoreManager {
  private store: LearningStore = {
    merchantMemory: {},
    corrections: [],
    patternStats: {},
  }

  getMerchantMemory(): Record<string, MerchantMemoryEntry> {
    return this.store.merchantMemory
  }

  addMerchantMemory(key: string, entry: MerchantMemoryEntry): void {
    this.store.merchantMemory[key] = entry
  }

  updateMerchantMemory(key: string, updates: Partial<MerchantMemoryEntry>): void {
    if (this.store.merchantMemory[key]) {
      this.store.merchantMemory[key] = {
        ...this.store.merchantMemory[key],
        ...updates,
      }
    }
  }

  addCorrection(correction: Correction): void {
    this.store.corrections.push(correction)
  }

  getCorrections(): Correction[] {
    return this.store.corrections
  }

  addPatternStat(pattern: string, stats: PatternStats[string]): void {
    this.store.patternStats[pattern] = stats
  }

  getPatternStats(): PatternStats {
    return this.store.patternStats
  }

  getStore(): LearningStore {
    return this.store
  }

  setStore(store: Partial<LearningStore>): void {
    this.store = {
      merchantMemory: store.merchantMemory || this.store.merchantMemory,
      corrections: store.corrections || this.store.corrections,
      patternStats: store.patternStats || this.store.patternStats,
    }
  }

  clear(): void {
    this.store = {
      merchantMemory: {},
      corrections: [],
      patternStats: {},
    }
  }
}

export const defaultStore = new LearningStoreManager()
