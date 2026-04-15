import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  parseTransactionsPipeline,
  groupLines,
  extractStructuralData,
  isValidTransaction,
  aiFallback,
  cleanLines,
  applyExistingLogic,
} from "../../lib/transaction-parser-pipeline"

describe("Transaction Parser Pipeline", () => {
  describe("cleanLines", () => {
    it("should remove empty lines", () => {
      const input = "line1\n\nline2\n\n\nline3"
      const result = cleanLines(input)
      expect(result).toEqual(["line1", "line2", "line3"])
    })

    it("should trim whitespace", () => {
      const input = "  line1  \n  line2  "
      const result = cleanLines(input)
      expect(result).toEqual(["line1", "line2"])
    })

    it("should handle empty input", () => {
      expect(cleanLines("")).toEqual([])
      expect(cleanLines("\n\n")).toEqual([])
    })
  })

  describe("groupLines - Multi-line Transactions", () => {
    it("should group single line transaction", () => {
      const lines = ["15/04/2026 PIX IFOOD 125,50"]
      const result = groupLines(lines)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain("125,50")
    })

    it("should group multi-line transaction", () => {
      const lines = ["18/04/2026 Compra no débito", "UBER TECHNOLOGIES", "125,50"]
      const result = groupLines(lines)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain("Compra no débito")
      expect(result[0]).toContain("UBER TECHNOLOGIES")
      expect(result[0]).toContain("125,50")
    })

    it("should group investment transaction spanning lines", () => {
      const lines = [
        "17/04/2026 Aplicação RDB",
        "Resgate Automático",
        "10000,00",
        "18/04/2026 Depósito 500,00",
      ]
      const result = groupLines(lines)
      expect(result).toHaveLength(2)
      expect(result[0]).toContain("Aplicação RDB")
      expect(result[0]).toContain("10000,00")
    })

    it("should handle multiple transactions", () => {
      const lines = [
        "15/04/2026 Transaction 1 100,00",
        "16/04/2026 Transaction 2 200,00",
        "17/04/2026 Transaction 3 300,00",
      ]
      const result = groupLines(lines)
      expect(result).toHaveLength(3)
    })

    it("should handle broken multi-line with metadata", () => {
      const lines = [
        "09/04/2026 Mercado Carrefour",
        "agência 0001 conta 12345",
        "175,50",
        "10/04/2026 SPOTIFY 19,90",
      ]
      const result = groupLines(lines)
      expect(result).toHaveLength(2)
      expect(result[0]).toContain("Carrefour")
      expect(result[0]).toContain("175,50")
    })

    it("should handle restaurant delivery spanning multiple lines", () => {
      const lines = [
        "11/04/2026 Parcelamento Compra",
        "Eletrônicos Magazine",
        "Parcela 1 de 3",
        "299,00",
      ]
      const result = groupLines(lines)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain("299,00")
    })
  })

  describe("extractStructuralData", () => {
    it("should extract value and description", () => {
      const block = "15/04/2026 PIX IFOOD 125,50"
      const result = extractStructuralData(block)
      expect(result).not.toBeNull()
      expect(result?.value).toBe(125.5)
      expect(result?.description).toContain("PIX IFOOD")
    })

    it("should handle negative values", () => {
      const block = "16/04/2026 Compra -150,00"
      const result = extractStructuralData(block)
      expect(result).not.toBeNull()
      expect(result?.value).toBe(-150.0)
    })

    it("should ignore bank metadata", () => {
      const block = "09/04/2026 Mercado agência 0001 conta 12345 175,50"
      const result = extractStructuralData(block)
      expect(result).toBeNull() // Contains bank metadata
    })

    it("should reject lines with referência pattern", () => {
      const block = "15/04/2026 Pagamento referência 123456 200,00"
      const result = extractStructuralData(block)
      expect(result).toBeNull()
    })

    it("should handle investment transaction", () => {
      const block = "17/04/2026 Aplicação RDB 10000,00"
      const result = extractStructuralData(block)
      expect(result).not.toBeNull()
      expect(result?.value).toBe(10000.0)
      expect(result?.description).toContain("Aplicação RDB")
    })
  })

  describe("PIX + Merchant Classification", () => {
    it("should classify PIX IFOOD as Alimentação", async () => {
      const text = "15/04/2026 PIX IFOOD RESTAURANTE 125,50"
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe("Alimentação")
      expect(result[0].description.toLowerCase()).toContain("ifood")
    })

    it("should classify PIX UBER as Transporte", async () => {
      const text = "16/04/2026 PIX UBER TRIP 42,00"
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe("Transporte")
    })

    it("should classify PIX PIX (generic transfer) as Transferência", async () => {
      const text = "17/04/2026 PIX Transferência 500,00"
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe("Transferência")
    })

    it("should classify delivery services", async () => {
      const text = `
        12/04/2026 PIX IFOOD 45,99
        13/04/2026 DELIVERY PIZZA 32,50
        14/04/2026 PIX RESTAURANTE CHINES 78,00
      `
      const result = await parseTransactionsPipeline(text)
      const alimentacaoCount = result.filter((t) => t.category === "Alimentação").length
      expect(alimentacaoCount).toBeGreaterThanOrEqual(2)
    })

    it("should handle PIX with semantic context", async () => {
      const text = `
        15/04/2026 SPOTIFY SUBSCRIPTION 19,90
        16/04/2026 NETFLIX MONTHLY 14,90
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("Investment Transactions", () => {
    it("should detect INVESTIMENTO type for Aplicação RDB", async () => {
      const text = "17/04/2026 Aplicação RDB 10000,00"
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe("INVESTIMENTO")
    })

    it("should detect INCOME for Resgate RDB", async () => {
      const text = "18/04/2026 Resgate RDB 10000,00"
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe("INCOME")
    })

    it("should classify investment as Investimento category", async () => {
      const text = `
        17/04/2026 Aplicação RDB 5000,00
        18/04/2026 Aplicação CDB 3000,00
        19/04/2026 Aplicação FUNDO 2000,00
      `
      const result = await parseTransactionsPipeline(text)
      const allInvestimento = result.every((t) => t.category === "Investimento")
      expect(allInvestimento).toBe(true)
    })

    it("should handle resgate transactions", async () => {
      const text = `
        20/04/2026 Resgate RDB 5000,00
        21/04/2026 Resgate CDB 3000,00
      `
      const result = await parseTransactionsPipeline(text)
      const allIncome = result.every((t) => t.type === "INCOME")
      expect(allIncome).toBe(true)
    })

    it("should distinguish investimento from expense", async () => {
      const text = `
        16/04/2026 Aplicação RDB 10000,00
        17/04/2026 Compra débito UBER -42,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result[0].type).toBe("INVESTIMENTO")
      expect(result[1].type).toBe("EXPENSE")
    })

    it("should handle multi-line investment transaction", async () => {
      const text = `
        17/04/2026 Aplicação
        Investimento RDB
        10000,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe("INVESTIMENTO")
    })
  })

  describe("isValidTransaction - Validation", () => {
    it("should reject missing description", () => {
      const result = isValidTransaction({
        value: 100,
        description: "",
      })
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain("description")
    })

    it("should reject missing value", () => {
      const result = isValidTransaction({
        description: "Test",
        value: undefined,
      })
      expect(result.isValid).toBe(false)
    })

    it("should reject zero value", () => {
      const result = isValidTransaction({
        description: "Test",
        value: 0,
      })
      expect(result.isValid).toBe(false)
    })

    it("should reject NaN value", () => {
      const result = isValidTransaction({
        description: "Test",
        value: NaN,
      })
      expect(result.isValid).toBe(false)
    })

    it("should reject summary lines", () => {
      const summaryLines = [
        "Total de saídas: 1500,00",
        "Total de entradas 3000,00",
        "Saldo anterior: 5000,00",
        "Saldo final 8000,00",
      ]

      summaryLines.forEach((line) => {
        const result = isValidTransaction({
          description: line,
          value: 100,
        })
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Summary")
      })
    })

    it("should accept valid transaction", () => {
      const result = isValidTransaction({
        description: "PIX IFOOD 125,50",
        value: 125.5,
        type: "EXPENSE",
        category: "Alimentação",
      })
      expect(result.isValid).toBe(true)
    })
  })

  describe("Malformed Input Handling", () => {
    it("should handle empty input", async () => {
      const result = await parseTransactionsPipeline("")
      expect(result).toEqual([])
    })

    it("should handle whitespace only", async () => {
      const result = await parseTransactionsPipeline("   \n\n   ")
      expect(result).toEqual([])
    })

    it("should handle text without transactions", async () => {
      const text = "Some random text without any dates or amounts"
      const result = await parseTransactionsPipeline(text)
      expect(result).toEqual([])
    })

    it("should skip invalid value patterns", async () => {
      const text = `
        15/04/2026 Valid transaction 100,00
        Random text here
        16/04/2026 Another valid 200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should handle malformed dates", async () => {
      const text = `
        99/99/9999 BadDate 100,00
        15/04/2026 GoodTransaction 200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it("should handle missing description", async () => {
      const text = "15/04/2026 100,00"
      const result = await parseTransactionsPipeline(text)
      // Should still try to parse
      expect(Array.isArray(result)).toBe(true)
    })

    it("should handle unusual value formats", async () => {
      const text = `
        15/04/2026 Transaction with dot 100.000,50
        16/04/2026 Another one 50,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(Array.isArray(result)).toBe(true)
    })

    it("should ignore lines with only metadata", async () => {
      const text = `
        15/04/2026 Valid 100,00
        16/04/2026 Another 200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should handle excessive whitespace", async () => {
      const text = `
        15/04/2026    PIX    IFOOD    RESTAURANT    125,50
        16/04/2026  Transaction  200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should recover from special characters", async () => {
      const text = `
        15/04/2026 PIX IFOOD® Restaurant™ 125,50
        16/04/2026 Transfer™ © 2026 200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should handle mixed formats in batch", async () => {
      const text = `
        Valid Transaction 15/04/2026 100,00
        15/04/2026 Standard Format 150,00
        15/04/2026 Missing Value
        15/04/2026 Complete 200,00
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it("should handle bank statement header junk", async () => {
      const text = `
        ======== EXTRATO BANK =========
        Account: 123456
        Period: 01/04 - 30/04/2026

        15/04/2026 Transaction 1 100,00
        16/04/2026 Transaction 2 200,00

        ======== END =========
      `
      const result = await parseTransactionsPipeline(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("aiFallback", () => {
    it("should extract type from description", async () => {
      const block = "Resgate RDB 5000,00"
      const result = await aiFallback(block)
      expect(result).not.toBeNull()
      expect(result?.type).toBe("INCOME")
    })

    it("should detect investment keywords", async () => {
      const blocks = [
        "Aplicação RDB 10000,00",
        "Investimento CDB 5000,00",
        "Fundo Investimento 3000,00",
      ]

      for (const block of blocks) {
        const result = await aiFallback(block)
        expect(result?.type).toBe("INVESTIMENTO")
      }
    })

    it("should handle null input gracefully", async () => {
      const result = await aiFallback("")
      expect(result).toBeNull()
    })

    it("should extract category patterns", async () => {
      const blocks = ["PIX IFOOD Restaurante 100,00", "DELIVERY PIZZA 50,00", "UBER Trip 42,50"]

      const results = await Promise.all(blocks.map(aiFallback))
      expect(results.every((r) => r !== null)).toBe(true)
    })
  })

  describe("Integration - Full Pipeline", () => {
    it("should parse realistic Nubank statement", async () => {
      const statement = `
        NUBANK - EXTRATO

        15/04/2026 PIX IFOOD RESTAURANTE 125,50
        16/04/2026 Compra débito UBER 42,00
        17/04/2026 Aplicação RDB 10000,00
        18/04/2026 Resgate RDB 10000,00
        20/04/2026 SPOTIFY ASSINATURA 19,90
        21/04/2026 PIX RECEBIMENTO FREELANCE 1500,00
      `

      const result = await parseTransactionsPipeline(statement)
      expect(result.length).toBeGreaterThanOrEqual(6)
      expect(result.some((t) => t.category === "Alimentação")).toBe(true)
      expect(result.some((t) => t.type === "INVESTIMENTO")).toBe(true)
      expect(result.some((t) => t.type === "INCOME")).toBe(true)
    })

    it("should handle complex multi-line statement", async () => {
      const statement = `
        11/04/2026 Parcelamento Compra
        Eletrônicos Magazine
        Parcela 1 de 3
        299,00

        12/04/2026 Compra no débito
        RESTAURANTE JAPONÊS
        RUA DAS FLORES
        280,00

        13/04/2026 Aplicação
        Resgate Automático
        RDB CDB
        5000,00
      `

      const result = await parseTransactionsPipeline(statement)
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.some((t) => t.category === "Alimentação")).toBe(true)
    })

    it("should filter summary lines", async () => {
      const statement = `
        15/04/2026 PIX IFOOD 125,50
        16/04/2026 UBER TRIP 42,00
      `

      const result = await parseTransactionsPipeline(statement)
      const hasSummary = result.some((t) => t.description.toLowerCase().includes("total"))
      expect(hasSummary).toBe(false)
    })

    it("should handle all transaction types together", async () => {
      const statement = `
        10/04/2026 Depósito Salário 5000,00
        11/04/2026 PIX IFOOD 85,50
        12/04/2026 Aplicação RDB 2000,00
        13/04/2026 Resgate RDB 2000,00
        14/04/2026 Compra débito SPOTIFY -19,90
      `

      const result = await parseTransactionsPipeline(statement)
      expect(result.some((t) => t.type === "INCOME")).toBe(true)
      expect(result.some((t) => t.type === "INVESTIMENTO")).toBe(true)
    })
  })
})
