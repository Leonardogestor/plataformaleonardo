import { describe, it, expect, beforeEach } from "vitest"
import {
  parseTransactionsAntifragile,
  extractValue,
  groupLinesAntifragile,
  parseBlock,
  calculateConfidence,
  needsFallback,
  aiFallback,
} from "../../lib/transaction-parser-antifragile"

describe("Antifragile Transaction Parser", () => {
  describe("extractValue - Flexible Value Extraction", () => {
    it("should extract value at end of line", () => {
      const result = extractValue("PIX IFOOD RESTAURANTE 125,50")
      expect(result).toBe(125.5)
    })

    it("should extract value at start of line", () => {
      const result = extractValue("100,00 Compra débito UBER")
      expect(result).toBe(100.0)
    })

    it("should extract value in middle of line", () => {
      const result = extractValue("Compra 250,50 em São Paulo")
      expect(result).toBe(250.5)
    })

    it("should return last value when multiple exist", () => {
      const result = extractValue("Parcela 1 de 3: 100,00 Total: 300,00")
      expect(result).toBe(300.0)
    })

    it("should handle thousands separator", () => {
      const result = extractValue("Aplicação RDB 10.000,00")
      expect(result).toBe(10000.0)
    })

    it("should handle multiple thousands", () => {
      const result = extractValue("Investimento 1.234.567,89")
      expect(result).toBe(1234567.89)
    })

    it("should return null for no value", () => {
      const result = extractValue("No value here")
      expect(result).toBeNull()
    })

    it("should ignore malformed values", () => {
      const result = extractValue("Invalid 12,5 or 123.456 but valid 100,00")
      expect(result).toBe(100.0)
    })

    it("should handle negative context", () => {
      const result = extractValue("Débito -150,00 autorizado")
      expect(result).toBe(150.0) // extracts value regardless of sign
    })
  })

  describe("groupLinesAntifragile - Smart Line Grouping", () => {
    it("should group multi-line transaction", () => {
      const lines = ["18/04/2026 Compra no débito", "RESTAURANTE JAPONÊS", "São Paulo SP", "280,00"]
      const result = groupLinesAntifragile(lines)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain("280,00")
    })

    it("should stop grouping at new date", () => {
      const lines = [
        "15/04/2026 Transaction 1 100,00",
        "16/04/2026 Transaction 2 200,00",
        "17/04/2026 Transaction 3 300,00",
      ]
      const result = groupLinesAntifragile(lines)
      expect(result).toHaveLength(3)
    })

    it("should stop grouping at value", () => {
      const lines = [
        "15/04/2026 Compra",
        "IFOOD RESTAURANTE",
        "125,50",
        "Other text that should not be grouped",
      ]
      const result = groupLinesAntifragile(lines)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0]).toContain("125,50")
    })

    it("should handle investment transaction spanning lines", () => {
      const lines = ["17/04/2026 Aplicação", "RDB Negociação", "10000,00"]
      const result = groupLinesAntifragile(lines)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain("10000,00")
    })

    it("should handle broken formatting", () => {
      const lines = [
        "09/04/2026 Mercado Carrefour",
        "agência 0001 conta 12345",
        "Rua das Flores",
        "175,50",
        "10/04/2026 Next transaction 50,00",
      ]
      const result = groupLinesAntifragile(lines)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should detect DD/MM/YYYY dates", () => {
      const lines = ["15/04/2026 Transaction 100,00", "16/04/2026 Another 200,00"]
      const result = groupLinesAntifragile(lines)
      expect(result).toHaveLength(2)
    })

    it("should handle empty lines gracefully", () => {
      const lines = ["15/04/2026 Trans 100,00", "", "", "16/04/2026 Another 200,00"]
      const result = groupLinesAntifragile(lines)
      expect(result).toHaveLength(2)
    })
  })

  describe("parseBlock - Robust Block Parsing", () => {
    it("should parse value and description", () => {
      const block = "15/04/2026 PIX IFOOD 125,50"
      const result = parseBlock(block)
      expect(result.value).toBe(125.5)
      expect(result.description).toContain("IFOOD")
    })

    it("should remove value from description", () => {
      const block = "Compra débito UBER 42,75"
      const result = parseBlock(block)
      expect(result.value).toBe(42.75)
      expect(result.description).not.toContain("42,75")
    })

    it("should handle value at start", () => {
      const block = "100,00 Compra em loja"
      const result = parseBlock(block)
      expect(result.value).toBe(100.0)
      expect(result.description).toContain("Compra")
    })

    it("should remove bank metadata", () => {
      const block = "09/04/2026 Mercado agência 0001 conta 12345 CPF: 12345678900 175,50"
      const result = parseBlock(block)
      expect(result.description).not.toContain("agência")
      expect(result.description).not.toContain("conta")
      expect(result.description).not.toContain("CPF")
      expect(result.value).toBe(175.5)
    })

    it("should handle multi-line description", () => {
      const block = `15/04/2026 Compra no débito
RESTAURANTE JAPONÊS
São Paulo SP
280,00`
      const result = parseBlock(block)
      expect(result.value).toBe(280.0)
      expect(result.description).toContain("RESTAURANTE")
    })

    it("should handle referência pattern", () => {
      const block = "15/04/2026 Pagamento referência 123456 200,00"
      const result = parseBlock(block)
      expect(result.description).not.toContain("referência")
      expect(result.value).toBe(200.0)
    })

    it("should handle investimento metadata", () => {
      const block = "17/04/2026 Aplicação RDB código Santander 10000,00"
      const result = parseBlock(block)
      expect(result.description).not.toContain("código")
      expect(result.value).toBe(10000.0)
    })

    it("should return null value for missing value", () => {
      const block = "Some transaction without value"
      const result = parseBlock(block)
      expect(result.value).toBeNull()
    })
  })

  describe("calculateConfidence - Confidence Scoring", () => {
    it("should score complete transaction high", () => {
      const tx = {
        value: 100,
        description: "PIX IFOOD RESTAURANTE",
        type: "EXPENSE" as const,
        category: "Alimentação",
      }
      const score = calculateConfidence(tx)
      expect(score).toBe(1.0)
    })

    it("should score missing value low", () => {
      const tx = {
        value: null,
        description: "PIX IFOOD",
        type: "EXPENSE" as const,
        category: "Alimentação",
      }
      const score = calculateConfidence(tx)
      expect(score).toBeLessThan(1.0)
    })

    it("should score short description low", () => {
      const tx = {
        value: 100,
        description: "TX",
        type: "EXPENSE" as const,
        category: "Alimentação",
      }
      const score = calculateConfidence(tx)
      expect(score).toBeLessThan(1.0)
    })

    it("should score generic category low", () => {
      const tx = {
        value: 100,
        description: "Random transaction",
        type: "EXPENSE" as const,
        category: "Outros",
      }
      const score = calculateConfidence(tx)
      expect(score).toBeLessThan(1.0)
    })

    it("should return 0 for completely invalid transaction", () => {
      const tx = {
        value: null,
        description: "",
        type: "EXPENSE" as const,
        category: "Outros",
      }
      const score = calculateConfidence(tx)
      expect(score).toBeLessThan(0.3)
    })
  })

  describe("needsFallback - Fallback Detection", () => {
    it("should return true for null value", () => {
      const result = needsFallback({
        value: null,
        description: "Test",
        confidence: 0.8,
      })
      expect(result).toBe(true)
    })

    it("should return true for empty description", () => {
      const result = needsFallback({
        value: 100,
        description: "",
        confidence: 0.8,
      })
      expect(result).toBe(true)
    })

    it("should return true for low confidence", () => {
      const result = needsFallback({
        value: 100,
        description: "Test",
        confidence: 0.5,
      })
      expect(result).toBe(true)
    })

    it("should return false for valid transaction", () => {
      const result = needsFallback({
        value: 100,
        description: "PIX IFOOD",
        confidence: 0.9,
      })
      expect(result).toBe(false)
    })
  })

  describe("aiFallback - Fallback Reconstruction", () => {
    it("should reconstruct investment type", async () => {
      const block = "Aplicação RDB código BC 10000,00"
      const result = await aiFallback(block)
      expect(result).not.toBeNull()
      expect(result?.type).toBe("INVESTIMENTO")
      expect(result?.value).toBe(10000.0)
    })

    it("should detect resgate as income", async () => {
      const block = "Resgate RDB 5000,00"
      const result = await aiFallback(block)
      expect(result?.type).toBe("INCOME")
    })

    it("should detect deposito as income", async () => {
      const block = "Deposito Salario 5000,00"
      const result = await aiFallback(block)
      expect(result?.type).toBe("INCOME")
    })

    it("should default to expense", async () => {
      const block = "Compra débito UBER 42,50"
      const result = await aiFallback(block)
      expect(result?.type).toBe("EXPENSE")
    })

    it("should return null for no value", async () => {
      const block = "No monetary value here"
      const result = await aiFallback(block)
      expect(result).toBeNull()
    })
  })

  describe("Integration - Full Antifragile Pipeline", () => {
    it("should handle standard Nubank statement", async () => {
      const text = `
        15/04/2026 PIX IFOOD RESTAURANTE 125,50
        16/04/2026 Compra débito UBER 42,00
        17/04/2026 Aplicação RDB 10000,00
        18/04/2026 Resgate RDB 10000,00
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.every((t) => t.confidence >= 0)).toBe(true)
    })

    it("should handle value at start of line", async () => {
      const text = `
        100,00 Compra débito 15/04/2026 UBER
        200,00 Transferência 16/04/2026 João Silva
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it("should handle multi-line broken description", async () => {
      const text = `
        15/04/2026 Compra no débito
        RESTAURANTE JAPONÊS
        Rua das Flores 123
        São Paulo SP
        280,00
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].value).toBe(280.0)
    })

    it("should handle OCR noise and metadata", async () => {
      const text = `
        09/04/2026 Mercado Carrefour
        agência: 0001 conta: 12345 dígito: 9
        referência: 123456 protocolo: ABC123
        175,50
        10/04/2026 SPOTIFY MENSALIDADE 19,90
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.every((t) => !t.description.includes("agência"))).toBe(true)
    })

    it("should handle all investment types", async () => {
      const text = `
        15/04/2026 Aplicação RDB 5000,00
        16/04/2026 Aplicação CDB 3000,00
        17/04/2026 Resgate RDB 5000,00
        18/04/2026 Investimento em Fundo 2000,00
      `
      const result = await parseTransactionsAntifragile(text)
      const investmentCount = result.filter((t) => t.type === "INVESTIMENTO").length
      const incomeCount = result.filter((t) => t.type === "INCOME").length
      expect(investmentCount + incomeCount).toBeGreaterThanOrEqual(3)
    })

    it("should classify PIX merchants correctly", async () => {
      const text = `
        15/04/2026 PIX IFOOD 45,50
        16/04/2026 PIX UBER 32,00
        17/04/2026 PIX SPOTIFY 19,90
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.some((t) => t.category === "Alimentação")).toBe(true)
      expect(result.some((t) => t.category === "Transporte")).toBe(true)
    })

    it("should handle value in middle of line", async () => {
      const text = `
        15/04/2026 Compra 150,00 em loja física
        16/04/2026 Pagamento 200,00 referência 123456
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it("should handle thousands separators", async () => {
      const text = `
        15/04/2026 Transferência 10.000,00
        16/04/2026 Aplicação RDB 1.234.567,89
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result[0].value).toBe(10000.0)
      expect(result[1].value).toBe(1234567.89)
    })

    it("should handle mixed formats", async () => {
      const text = `
        15/04/2026 PIX IFOOD 125,50
        100,00 Compra normal 16/04/2026
        17/04/2026 Aplicação
        RDB Investimento
        5000,00
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result).toHaveLength(3)
    })

    it("should filter invalid transactions", async () => {
      const text = `
        Valid transaction 15/04/2026 100,00

        No value here

        16/04/2026 Another valid 200,00
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.every((t) => t.value > 0)).toBe(true)
    })

    it("should handle edge case: duplicate text", async () => {
      const text = `
        15/04/2026 PIX PIX IFOOD 125,50
        16/04/2026 Compra Compra UBER 42,00
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should score transactions with confidence", async () => {
      const text = `
        15/04/2026 PIX IFOOD 125,50
        Broken entry without date or value
      `
      const result = await parseTransactionsAntifragile(text)
      expect(result.every((t) => t.confidence >= 0 && t.confidence <= 1)).toBe(true)
    })

    it("should handle empty input", async () => {
      const result = await parseTransactionsAntifragile("")
      expect(result).toEqual([])
    })

    it("should handle whitespace only", async () => {
      const result = await parseTransactionsAntifragile("   \n\n   ")
      expect(result).toEqual([])
    })
  })
})
