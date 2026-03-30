import { pipelineLogger } from "@/lib/utils/logger"
import { retry } from "@/lib/utils/retry"
import { CircuitBreaker } from "@/lib/utils/retry"

export interface FallbackResult {
  success: boolean
  data?: any
  source: "STRUCTURED" | "REGEX" | "AI" | "OCR" | "FAILED"
  confidence: number
  error?: string
  attempts: number
}

/**
 * Pipeline de fallback inteligente para extração de dados
 */
export class FallbackPipeline {
  private circuitBreaker: CircuitBreaker

  constructor() {
    this.circuitBreaker = new CircuitBreaker(3, 60000) // 3 falhas em 1 minuto
  }

  /**
   * Executa pipeline completo com fallbacks
   */
  async extractWithFallback(file: File, userId: string): Promise<FallbackResult> {
    let attempts = 0
    const maxAttempts = 4

    // Etapa 1: Parser Estruturado (CSV/Excel com colunas definidas)
    attempts++
    const structuredResult = await this.tryStructuredParser(file, userId)
    if (structuredResult.success) {
      pipelineLogger.info("Structured parser succeeded", {
        source: "STRUCTURED",
        attempts,
        confidence: structuredResult.confidence,
      })
      return structuredResult
    }

    // Etapa 2: Regex Parser (padrões por linha)
    attempts++
    const regexResult = await this.tryRegexParser(file, userId)
    if (regexResult.success) {
      pipelineLogger.info("Regex parser succeeded", {
        source: "REGEX",
        attempts,
        confidence: regexResult.confidence,
      })
      return regexResult
    }

    // Etapa 3: AI Parser (OpenAI com circuit breaker)
    attempts++
    const aiResult = await this.tryAIParser(file, userId)
    if (aiResult.success) {
      pipelineLogger.info("AI parser succeeded", {
        source: "AI",
        attempts,
        confidence: aiResult.confidence,
      })
      return aiResult
    }

    // Etapa 4: OCR (último recurso)
    attempts++
    const ocrResult = await this.tryOCRParser(file, userId)
    if (ocrResult.success) {
      pipelineLogger.info("OCR parser succeeded", {
        source: "OCR",
        attempts,
        confidence: ocrResult.confidence,
      })
      return ocrResult
    }

    // Todas as etapas falharam
    pipelineLogger.error("All extraction methods failed", {
      attempts,
      fileName: file.name,
    })

    return {
      success: false,
      source: "FAILED",
      confidence: 0,
      attempts,
      error: "Todos os métodos de extração falharam",
    }
  }

  /**
   * Etapa 1: Parser Estruturado
   */
  private async tryStructuredParser(file: File, userId: string): Promise<FallbackResult> {
    try {
      // Verifica se é CSV/Excel com estrutura conhecida
      if (!this.isStructuredFile(file)) {
        return {
          success: false,
          source: "STRUCTURED",
          confidence: 0,
          attempts: 1,
          error: "Arquivo não possui estrutura reconhecível",
        }
      }

      // Importa parser estruturado
      const extractModule = await import("@/lib/parsers/extract")

      let result
      if (file.type === "text/csv") {
        result = await (extractModule as any).extractFromCSV(file)
      } else if (file.type.includes("sheet")) {
        result = await (extractModule as any).extractFromExcel(file)
      }

      if (result?.success && result.data?.length > 0) {
        return {
          success: true,
          data: result.data,
          source: "STRUCTURED",
          confidence: 0.9, // Alta confiança para dados estruturados
          attempts: 1,
        }
      }

      return {
        success: false,
        source: "STRUCTURED",
        confidence: 0,
        attempts: 1,
        error: result?.error || "Falha no parser estruturado",
      }
    } catch (error) {
      return {
        success: false,
        source: "STRUCTURED",
        confidence: 0,
        attempts: 1,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  /**
   * Etapa 2: Regex Parser
   */
  private async tryRegexParser(file: File, userId: string): Promise<FallbackResult> {
    try {
      const text = await file.text()

      // Padrões regex para extrair transações
      const patterns = [
        // Padrão brasileiro: DD/MM/YYYY DESCRIÇÃO VALOR
        /(\d{2}\/\d{2}\/\d{4})\s+([^\d]+?)\s+([+-]?\s*R?\$\s*[\d.,]+)/gi,
        // Padrão americano: YYYY-MM-DD DESCRIÇÃO VALOR
        /(\d{4}-\d{2}-\d{2})\s+([^\d]+?)\s+([+-]?\s*R?\$\s*[\d.,]+)/gi,
        // Padrão simples: DATA DESCRIÇÃO VALOR
        /(\d{2}\/\d{2}\/\d{2,4})\s+([^\d\n]+?)\s+([+-]?\s*[\d.,]+)/gi,
      ]

      const transactions = []
      for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern) || [])
        if (matches.length > 0) {
          for (const match of matches) {
            transactions.push({
              date: match[1],
              description: match[2]?.trim(),
              amount: match[3],
              source: "REGEX" as const,
            })
          }
          break // Usa primeiro padrão que funcionar
        }
      }

      if (transactions.length > 0) {
        return {
          success: true,
          data: transactions,
          source: "REGEX",
          confidence: 0.7, // Confiança média para regex
          attempts: 1,
        }
      }

      return {
        success: false,
        source: "REGEX",
        confidence: 0,
        attempts: 1,
        error: "Nenhuma transação encontrada com regex",
      }
    } catch (error) {
      return {
        success: false,
        source: "REGEX",
        confidence: 0,
        attempts: 1,
        error: error instanceof Error ? error.message : "Erro no parser regex",
      }
    }
  }

  /**
   * Etapa 3: AI Parser
   */
  private async tryAIParser(file: File, userId: string): Promise<FallbackResult> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const result = await retry(
          async () => {
            // Simulação de chamada à OpenAI
            // Em produção: integrar com API real
            const text = await file.text()

            // Mock da resposta da IA
            if (text.length < 100) {
              throw new Error("Texto muito curto para análise da IA")
            }

            // Simula parsing da IA
            const mockTransactions = this.mockAIParsing(text)

            if (mockTransactions.length === 0) {
              throw new Error("IA não conseguiu extrair transações")
            }

            return {
              success: true,
              data: mockTransactions,
              source: "AI" as const,
              confidence: 0.8, // Alta confiança para IA
              attempts: 1,
            }
          },
          {
            maxRetries: 2,
            baseDelay: 1000,
          }
        )

        return result
      })
    } catch (error) {
      return {
        success: false,
        source: "AI",
        confidence: 0,
        attempts: 1,
        error: error instanceof Error ? error.message : "Falha na IA",
      }
    }
  }

  /**
   * Etapa 4: OCR Parser
   */
  private async tryOCRParser(file: File, userId: string): Promise<FallbackResult> {
    try {
      // Verifica se é PDF
      if (!file.type.includes("pdf")) {
        return {
          success: false,
          source: "OCR",
          confidence: 0,
          attempts: 1,
          error: "OCR apenas disponível para PDF",
        }
      }

      // Simulação de OCR (em produção usar Tesseract.js)
      const mockOCRResult = await this.mockOCR(file)

      if (mockOCRResult.success && mockOCRResult.data?.length > 0) {
        return {
          success: true,
          data: mockOCRResult.data,
          source: "OCR",
          confidence: 0.5, // Baixa confiança para OCR
          attempts: 1,
        }
      }

      return {
        success: false,
        source: "OCR",
        confidence: 0,
        attempts: 1,
        error: mockOCRResult.error || "OCR não conseguiu extrair dados",
      }
    } catch (error) {
      return {
        success: false,
        source: "OCR",
        confidence: 0,
        attempts: 1,
        error: error instanceof Error ? error.message : "Falha no OCR",
      }
    }
  }

  /**
   * Verifica se arquivo tem estrutura reconhecível
   */
  private isStructuredFile(file: File): boolean {
    const structuredTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    return structuredTypes.includes(file.type)
  }

  /**
   * Mock de parsing da IA
   */
  private mockAIParsing(text: string): any[] {
    // Simula extração de transações pela IA
    const lines = text.split("\n").filter((line) => line.trim())
    const transactions = []

    for (const line of lines) {
      // Padrão simples: data, descrição, valor
      const parts = line.split(/[\t,;|]/)
      if (parts.length >= 3) {
        const date = parts[0]?.trim()
        const description = parts[1]?.trim()
        const amount = parts[2]?.trim()

        if (date && description && amount) {
          transactions.push({
            date,
            description,
            amount,
            source: "AI",
          })
        }
      }
    }

    return transactions.slice(0, 50) // Limita para mock
  }

  /**
   * Mock de OCR
   */
  private async mockOCR(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
    // Simula processamento OCR
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simula tempo de processamento

    // Mock de resultado
    if (file.size < 1000) {
      return {
        success: false,
        error: "Arquivo muito pequeno para OCR",
      }
    }

    return {
      success: true,
      data: [
        {
          date: "15/03/2024",
          description: "MERCADO EXEMPLO",
          amount: "R$ 123,45",
          source: "OCR",
        },
      ],
    }
  }
}
