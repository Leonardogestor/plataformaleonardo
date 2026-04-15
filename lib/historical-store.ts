export interface MerchantHistory {
  avgValue: number
  frequency: number
  lastSeen: number
  category: string
  totalSpent: number
  valueHistory: number[]
  dateHistory: number[]
}

export interface CategoryStatistics {
  avgValue: number
  totalSpent: number
  frequency: number
  merchants: string[]
}

export interface LongTermPattern {
  type: "recurring" | "transfers" | "cluster"
  category?: string
  avgValue: number
  frequency: number
  occurrences: number
  lastOccurrence: number
  description?: string
}

export interface HistoricalProfile {
  userId: string
  createdAt: number
  updatedAt: number
  merchants: {
    [merchantKey: string]: MerchantHistory
  }
  categoryStats: {
    [category: string]: CategoryStatistics
  }
  patterns: {
    recurring: LongTermPattern[]
    transfers: LongTermPattern[]
    clusters: LongTermPattern[]
  }
  totalSpent: number
  transactionCount: number
}

export class HistoricalStore {
  private profiles: Map<string, HistoricalProfile> = new Map()
  private persistence: Map<string, any> = new Map()

  createProfile(userId: string): HistoricalProfile {
    const now = Date.now()
    const profile: HistoricalProfile = {
      userId,
      createdAt: now,
      updatedAt: now,
      merchants: {},
      categoryStats: {},
      patterns: {
        recurring: [],
        transfers: [],
        clusters: [],
      },
      totalSpent: 0,
      transactionCount: 0,
    }
    this.profiles.set(userId, profile)
    return profile
  }

  getProfile(userId: string): HistoricalProfile | null {
    const profile = this.profiles.get(userId)
    if (!profile && this.persistence.has(userId)) {
      const persisted = this.persistence.get(userId)
      this.profiles.set(userId, persisted)
      return persisted
    }
    return profile || null
  }

  getOrCreateProfile(userId: string): HistoricalProfile {
    let profile = this.getProfile(userId)
    if (!profile) {
      profile = this.createProfile(userId)
    }
    return profile
  }

  updateProfile(userId: string, profile: HistoricalProfile): void {
    profile.updatedAt = Date.now()
    this.profiles.set(userId, profile)
  }

  saveMerchantHistory(userId: string, merchantKey: string, history: MerchantHistory): void {
    const profile = this.getOrCreateProfile(userId)
    profile.merchants[merchantKey] = history
    this.updateProfile(userId, profile)
  }

  getMerchantHistory(userId: string, merchantKey: string): MerchantHistory | null {
    const profile = this.getProfile(userId)
    if (!profile) return null
    return profile.merchants[merchantKey] || null
  }

  updateCategoryStats(userId: string, category: string, stats: CategoryStatistics): void {
    const profile = this.getOrCreateProfile(userId)
    profile.categoryStats[category] = stats
    this.updateProfile(userId, profile)
  }

  getCategoryStats(userId: string, category: string): CategoryStatistics | null {
    const profile = this.getProfile(userId)
    if (!profile) return null
    return profile.categoryStats[category] || null
  }

  addPattern(
    userId: string,
    patternType: "recurring" | "transfers" | "cluster",
    pattern: LongTermPattern
  ): void {
    const profile = this.getOrCreateProfile(userId)
    profile.patterns[patternType].push(pattern)
    this.updateProfile(userId, profile)
  }

  getPatterns(
    userId: string,
    patternType?: "recurring" | "transfers" | "cluster"
  ): LongTermPattern[] {
    const profile = this.getProfile(userId)
    if (!profile) return []

    if (patternType) {
      return profile.patterns[patternType]
    }

    return [
      ...profile.patterns.recurring,
      ...profile.patterns.transfers,
      ...profile.patterns.clusters,
    ]
  }

  clearPatterns(userId: string, patternType: "recurring" | "transfers" | "cluster"): void {
    const profile = this.getOrCreateProfile(userId)
    profile.patterns[patternType] = []
    this.updateProfile(userId, profile)
  }

  persist(userId: string, data?: HistoricalProfile): void {
    const profile = data || this.getProfile(userId)
    if (profile) {
      this.persistence.set(userId, profile)
    }
  }

  restore(userId: string): HistoricalProfile | null {
    if (this.persistence.has(userId)) {
      const profile = this.persistence.get(userId)
      this.profiles.set(userId, profile)
      return profile
    }
    return null
  }

  exportProfile(userId: string): HistoricalProfile | null {
    return this.getProfile(userId)
  }

  importProfile(profile: HistoricalProfile): void {
    this.profiles.set(profile.userId, profile)
  }

  getAllProfiles(): HistoricalProfile[] {
    return Array.from(this.profiles.values())
  }

  clearProfile(userId: string): void {
    this.profiles.delete(userId)
    this.persistence.delete(userId)
  }

  clearAll(): void {
    this.profiles.clear()
    this.persistence.clear()
  }

  getStats() {
    return {
      profileCount: this.profiles.size,
      persistedCount: this.persistence.size,
    }
  }
}

export const defaultHistoricalStore = new HistoricalStore()
