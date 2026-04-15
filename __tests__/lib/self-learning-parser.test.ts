import { describe, it, expect, beforeEach } from "vitest"
import { SelfLearningParser } from "../../lib/self-learning-parser"
import { LearningStoreManager } from "../../lib/learning-store"
import { getMerchantKey } from "../../lib/merchant-memory"
import { learnFromTransactions } from "../../lib/auto-learning"
import { applyUserCorrection } from "../../lib/feedback-system"

describe("Self-Learning Parser", () => {
  let parser: SelfLearningParser
  let store: LearningStoreManager

  beforeEach(() => {
    store = new LearningStoreManager()
    parser = new SelfLearningParser(store)
  })

  describe("Merchant Memory", () => {
    it("should extract merchant key from description", () => {
      expect(getMerchantKey("PIX IFOOD RESTAURANTE")).toBe("ifood")
      expect(getMerchantKey("DROGARIA SAO PAULO")).toBe("drogaria")
      expect(getMerchantKey("COMPRA UBER")).toBe("uber")
    })

    it("should normalize merchant keys", () => {
      const key1 = getMerchantKey("PIX IFOOD")
      const key2 = getMerchantKey("ifood")
      expect(key1).toBe(key2)
    })

    it("should handle empty descriptions", () => {
      expect(getMerchantKey("")).toBe("")
      expect(getMerchantKey("   ")).toBe("")
    })

    it("should add merchant to memory", () => {
      const memory = parser.getMerchantMemory()
      memory["ifood"] = {
        category: "Alimentação",
        confidence: 0.9,
        usageCount: 1,
      }

      expect(memory["ifood"]).toBeDefined()
      expect(memory["ifood"].category).toBe("Alimentação")
    })
  })

  describe("Auto-Learning", () => {
    it("should learn from repeated transactions", () => {
      const transactions = [
        {
          description: "PIX IFOOD BURGER",
          category: "Alimentação",
          confidence: 0.9,
        },
        {
          description: "PIX IFOOD PIZZA",
          category: "Alimentação",
          confidence: 0.85,
        },
        {
          description: "PIX IFOOD SUSHI",
          category: "Alimentação",
          confidence: 0.88,
        },
      ]

      const memory = {}
      const patternStats = {}

      learnFromTransactions(transactions, memory, patternStats)

      expect(memory["ifood"]).toBeDefined()
      expect(memory["ifood"].category).toBe("Alimentação")
      expect(memory["ifood"].usageCount).toBe(3)
    })

    it("should update existing merchant on repeated learning", () => {
      const transaction1 = [
        {
          description: "UBER TRIP 1",
          category: "Transporte",
          confidence: 0.85,
        },
        {
          description: "UBER TRIP 2",
          category: "Transporte",
          confidence: 0.86,
        },
      ]

      const transaction2 = [
        {
          description: "UBER EATS 1",
          category: "Transporte",
          confidence: 0.9,
        },
        {
          description: "UBER EATS 2",
          category: "Transporte",
          confidence: 0.88,
        },
      ]

      const memory = {}
      const patternStats = {}

      learnFromTransactions(transaction1, memory, patternStats)
      expect(memory["uber"]).toBeDefined()
      const firstUsageCount = memory["uber"].usageCount

      learnFromTransactions(transaction2, memory, patternStats)
      const secondUsageCount = memory["uber"].usageCount

      expect(secondUsageCount).toBeGreaterThan(firstUsageCount)
    })

    it("should detect consensus category from multiple transactions", () => {
      const transactions = [
        {
          description: "IFOOD 1",
          category: "Alimentação",
          confidence: 0.9,
        },
        {
          description: "IFOOD 2",
          category: "Alimentação",
          confidence: 0.88,
        },
        {
          description: "IFOOD 3",
          category: "Outros",
          confidence: 0.5,
        },
      ]

      const memory = {}
      const patternStats = {}

      learnFromTransactions(transactions, memory, patternStats)

      expect(memory["ifood"].category).toBe("Alimentação")
    })
  })

  describe("Feedback System", () => {
    it("should apply user correction", () => {
      const memory = {}
      const corrections: any[] = []

      applyUserCorrection(
        "tx1",
        "PIX UNKNOWN MERCHANT",
        {
          originalCategory: "Outros",
          correctedCategory: "Alimentação",
        },
        memory,
        corrections
      )

      expect(corrections).toHaveLength(1)
      expect(corrections[0].correctedCategory).toBe("Alimentação")
      expect(memory["unknown"]).toBeDefined()
      expect(memory["unknown"].category).toBe("Alimentação")
    })

    it("should boost confidence on repeated corrections", () => {
      const memory = {}
      const corrections: any[] = []

      const merchantKey = "testmerchant"
      memory[merchantKey] = {
        category: "Alimentação",
        confidence: 0.7,
        usageCount: 1,
      }

      for (let i = 0; i < 3; i++) {
        applyUserCorrection(
          `tx${i}`,
          merchantKey,
          {
            originalCategory: "Outros",
            correctedCategory: "Alimentação",
          },
          memory,
          corrections
        )
      }

      expect(memory[merchantKey].confidence).toBeGreaterThan(0.7)
      expect(corrections).toHaveLength(3)
    })

    it("should track correction history", () => {
      const memory = {}
      const corrections: any[] = []

      applyUserCorrection(
        "tx1",
        "MERCHANT1",
        {
          originalCategory: "Outros",
          correctedCategory: "Alimentação",
        },
        memory,
        corrections
      )

      applyUserCorrection(
        "tx2",
        "MERCHANT2",
        {
          originalCategory: "Outros",
          correctedCategory: "Transporte",
        },
        memory,
        corrections
      )

      expect(corrections).toHaveLength(2)
      expect(corrections[0].originalCategory).toBe("Outros")
      expect(corrections[1].correctedCategory).toBe("Transporte")
    })
  })

  describe("Self-Learning Parser API", () => {
    it("should parse transactions", async () => {
      const text = `
        15/04/2026 PIX IFOOD RESTAURANTE 125,50
        16/04/2026 Aplicação RDB 10000,00
      `

      const result = await parser.parseTransactions(text)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty("date")
      expect(result[0]).toHaveProperty("category")
      expect(result[0]).toHaveProperty("confidence")
      expect(result[0]).toHaveProperty("source")
      expect(result[0]).toHaveProperty("reviewRequired")
    })

    it("should return proper transaction format", async () => {
      const text = "15/04/2026 PIX IFOOD 125,50"

      const result = await parser.parseTransactions(text)

      expect(result[0]).toMatchObject({
        date: expect.any(String),
        type: expect.any(String),
        category: expect.any(String),
        value: expect.any(Number),
        description: expect.any(String),
        confidence: expect.any(Number),
        source: expect.stringMatching(/parser|fallback|learned/),
        reviewRequired: expect.any(Boolean),
      })
    })

    it("should apply corrections through parser", async () => {
      parser.applyCorrection("tx1", "UNKNOWN MERCHANT", "Outros", "Alimentação")

      const memory = parser.getMerchantMemory()
      const unknownKey = getMerchantKey("UNKNOWN MERCHANT")

      expect(memory[unknownKey]).toBeDefined()
      expect(memory[unknownKey].category).toBe("Alimentação")
    })

    it("should track merchant statistics", async () => {
      parser.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")
      parser.applyCorrection("tx2", "IFOOD", "Outros", "Alimentação")
      parser.applyCorrection("tx3", "UBER", "Outros", "Transporte")

      const stats = parser.getStats()

      expect(stats.totalMerchants).toBeGreaterThanOrEqual(2)
      expect(stats.totalCorrections).toBe(3)
    })

    it("should get top merchants by usage", () => {
      parser.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")
      parser.applyCorrection("tx2", "IFOOD", "Outros", "Alimentação")
      parser.applyCorrection("tx3", "IFOOD", "Outros", "Alimentação")
      parser.applyCorrection("tx4", "UBER", "Outros", "Transporte")

      const topMerchants = parser.getTopMerchants(5)

      expect(topMerchants.length).toBeGreaterThan(0)
      expect(topMerchants[0].usageCount).toBeGreaterThanOrEqual(topMerchants[1]?.usageCount || 0)
    })

    it("should get correction history", () => {
      parser.applyCorrection("tx1", "MERCHANT1", "Outros", "Alimentação")
      parser.applyCorrection("tx2", "MERCHANT2", "Outros", "Transporte")

      const history = parser.getCorrectionHistory()

      expect(history).toHaveLength(2)
    })

    it("should clear memory", () => {
      parser.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")

      let stats = parser.getStats()
      expect(stats.totalMerchants).toBeGreaterThan(0)

      parser.clearMemory()

      stats = parser.getStats()
      expect(stats.totalMerchants).toBe(0)
      expect(stats.totalCorrections).toBe(0)
    })
  })

  describe("Review Detection", () => {
    it("should flag ambiguous transactions for review", async () => {
      const text = "15/04/2026 UNKNOWN 10,00"

      const result = await parser.parseTransactions(text)

      // Unknown merchants with low confidence should be flagged
      expect(result.some((t) => t.reviewRequired || t.category === "Outros")).toBe(true)
    })

    it("should not flag known merchants for review", async () => {
      // First, establish a merchant in memory with high confidence
      parser.applyCorrection("tx0", "IFOOD TEST", "Outros", "Alimentação")

      const text = "15/04/2026 PIX IFOOD 125,50"

      const result = await parser.parseTransactions(text)

      expect(result[0].category).toBe("Alimentação")
    })
  })

  describe("Store Integration", () => {
    it("should persist and retrieve store", () => {
      parser.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")

      const store1 = parser.getStore()

      const parser2 = new SelfLearningParser()
      parser2.setStore(store1)

      const store2 = parser2.getStore()

      expect(store2.merchantMemory).toEqual(store1.merchantMemory)
    })

    it("should maintain state across operations", async () => {
      parser.applyCorrection("tx1", "IFOOD", "Outros", "Alimentação")

      const text = "15/04/2026 PIX IFOOD 125,50"
      const result = await parser.parseTransactions(text)

      expect(result[0].category).toBe("Alimentação")
      expect(result[0].source).toBe("learned")
    })
  })
})
