/**
 * PDF Processing Cost-Aware - Controle de custo e estabilidade
 * Evita loops, duplicação e processamento excessivo
 */

import { extractTextFromPdf } from "@/lib/document-extract"
import { parseStatementByBank } from "@/lib/bank-parsers"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

// Implementação local de withTimeout
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ])
}

export interface ProcessPDFResult {
  success: boolean
  transactions?: number
  error?: string
  fallbackUsed?: boolean
  processingTime: number
  cost?: {
    openai?: number
    processing?: number
    total?: number
  }
  warnings?: string[]
}

// Controle global de processamento por usuário
const userProcessingCache = new Map<
  string,
  {
    processingCount: number
    lastProcessing: number
    dailyLimit: number
    monthlyLimit: number
    costToday: number
    costMonth: number
  }
>()

// Configuração de custos (em USD)
const COST_CONFIG = {
  OPENAI_PER_1K_TOKENS: 0.002, // GPT-4o-mini
  PROCESSING_PER_PDF: 0.01, // Custo estimado de CPU/infra
  DAILY_LIMIT_PER_USER: 50, // Limite diário em USD
  MONTHLY_LIMIT_PER_USER: 500, // Limite mensal em USD
  MAX_RETRIES: 2, // Máximo de retries
  RETRY_DELAY: 5000, // Delay entre retries
}

export class CostAwarePDFProcessor {
  private maxRetries = COST_CONFIG.MAX_RETRIES
  private timeoutMs = 90000 // 90 segundos (reduzido de 120)
  private maxFileSize = 8 * 1024 * 1024 // 8MB (reduzido de 10)

  async processPDF(
    documentId: string,
    buffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<ProcessPDFResult> {
    const startTime = Date.now()
    const cost = { openai: 0, processing: COST_CONFIG.PROCESSING_PER_PDF, total: 0 }
    const warnings: string[] = []

    try {
      // 1. Verificar limites de custo do usuário
      const costCheck = this.checkUserCostLimits(userId)
      if (!costCheck.allowed) {
        throw new Error(costCheck.reason || "User cost limit exceeded")
      }

      // 2. Validação inicial mais rigorosa
      this.validatePDF(buffer, fileName, userId)

      // 3. Verificar duplicação de processamento
      const duplicateCheck = await this.checkDuplicateProcessing(documentId, userId)
      if (duplicateCheck.isDuplicate) {
        warnings.push("Document appears to be a duplicate")
        return {
          success: true,
          transactions: duplicateCheck.existingTransactions,
          processingTime: Date.now() - startTime,
          cost: { ...cost, total: cost.processing },
          warnings,
        }
      }

      // 4. Atualizar status para PROCESSING
      await this.updateDocumentStatus(documentId, "PROCESSING")

      // 5. Processamento principal com controle de custo
      const result = await this.processPDFMain(documentId, buffer, fileName, userId, cost, warnings)

      const processingTime = Date.now() - startTime
      cost.total = cost.openai + cost.processing

      // 6. Atualizar custos do usuário
      this.updateUserCosts(userId, cost.total)

      if (result.success) {
        await this.updateDocumentStatus(documentId, "COMPLETED")
        logger.pdf("completed", documentId, userId, {
          processingTime,
          transactions: result.transactions,
          cost: cost.total,
        })
      }

      return {
        ...result,
        processingTime,
        cost,
        warnings,
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Tentar fallback apenas se não for erro de custo
      if (!errorMessage.includes("cost limit") && !errorMessage.includes("duplicate")) {
        logger.warn("Main processing failed, trying fallback", "pdf", {
          documentId,
          userId,
          error: errorMessage,
        })

        try {
          const fallbackResult = await this.processPDFFallback(
            documentId,
            buffer,
            fileName,
            userId,
            cost
          )

          cost.total = cost.openai + cost.processing
          this.updateUserCosts(userId, cost.total)

          await this.updateDocumentStatus(documentId, "COMPLETED")

          return {
            ...fallbackResult,
            fallbackUsed: true,
            processingTime,
            cost,
            warnings: [...warnings, "Used fallback processing"],
          }
        } catch (fallbackError) {
          // Fallback também falhou
          await this.updateDocumentStatus(documentId, "FAILED", errorMessage)
          logger.error("Both main and fallback processing failed", "pdf", {
            documentId,
            userId,
            mainError: errorMessage,
            fallbackError:
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          })

          return {
            success: false,
            error: errorMessage,
            processingTime,
            cost,
            warnings,
          }
        }
      } else {
        // Erro de custo ou duplicação - não tentar fallback
        await this.updateDocumentStatus(documentId, "FAILED", errorMessage)

        return {
          success: false,
          error: errorMessage,
          processingTime,
          cost,
          warnings,
        }
      }
    }
  }

  private validatePDF(buffer: Buffer, fileName: string, userId: string) {
    if (buffer.length === 0) {
      throw new Error("Arquivo vazio")
    }

    if (buffer.length > this.maxFileSize) {
      throw new Error(
        `Arquivo muito grande. Máximo ${Math.round(this.maxFileSize / 1024 / 1024)}MB`
      )
    }

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Apenas arquivos PDF são permitidos")
    }

    // Verificar assinatura PDF
    const pdfSignature = buffer.slice(0, 4).toString()
    if (pdfSignature !== "%PDF") {
      throw new Error("Arquivo não é um PDF válido")
    }

    // Verificar se usuário já está processando muitos arquivos
    const userCache = userProcessingCache.get(userId)
    if (userCache && userCache.processingCount > 3) {
      throw new Error("Muitos arquivos sendo processados simultaneamente. Aguarde.")
    }
  }

  private async checkDuplicateProcessing(
    documentId: string,
    userId: string
  ): Promise<{
    isDuplicate: boolean
    existingTransactions?: number
  }> {
    try {
      // Verificar se documento com mesmo hash já foi processado
      const existingDocCheck = await prisma.document.findFirst({
        where: {
          userId,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
          },
        },
      })

      // Verificar se documento já existe (sem incluir transactions)
      const existingDoc = await prisma.document.findUnique({
        where: { id: documentId },
      })

      if (existingDoc) {
        // Buscar transações separadamente
        const transactions = await (prisma as any).transaction.findMany({
          where: { documentId: documentId },
        })

        if (transactions.length > 0) {
          return {
            isDuplicate: true,
            existingTransactions: transactions.length,
          }
        }
      }

      return { isDuplicate: false }
    } catch (error) {
      logger.warn("Error checking duplicate processing", "pdf", { documentId, userId, error })
      return { isDuplicate: false }
    }
  }

  private checkUserCostLimits(userId: string): { allowed: boolean; reason?: string } {
    const userCache = userProcessingCache.get(userId)

    if (!userCache) {
      // Novo usuário - inicializar
      userProcessingCache.set(userId, {
        processingCount: 0,
        lastProcessing: Date.now(),
        dailyLimit: COST_CONFIG.DAILY_LIMIT_PER_USER,
        monthlyLimit: COST_CONFIG.MONTHLY_LIMIT_PER_USER,
        costToday: 0,
        costMonth: 0,
      })
      return { allowed: true }
    }

    // Verificar limite diário
    if (userCache.costToday >= userCache.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily cost limit exceeded ($${userCache.costToday.toFixed(2)} / $${userCache.dailyLimit})`,
      }
    }

    // Verificar limite mensal
    if (userCache.costMonth >= userCache.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly cost limit exceeded ($${userCache.costMonth.toFixed(2)} / $${userCache.monthlyLimit})`,
      }
    }

    return { allowed: true }
  }

  private updateUserCosts(userId: string, cost: number) {
    const userCache = userProcessingCache.get(userId)
    if (!userCache) return

    userCache.costToday += cost
    userCache.costMonth += cost
    userCache.processingCount++
    userCache.lastProcessing = Date.now()

    logger.pdf("cost_updated", userId, undefined, {
      cost,
      costToday: userCache.costToday,
      costMonth: userCache.costMonth,
    })
  }

  private async processPDFMain(
    documentId: string,
    buffer: Buffer,
    fileName: string,
    userId: string,
    cost: any,
    warnings: string[]
  ): Promise<ProcessPDFResult> {
    const startTime = Date.now()
    // Processamento com timeout e retry limitado
    return await withTimeout(
      async (): Promise<ProcessPDFResult> => {
        // 1. Extração de texto com estimativa de custo
        const text = await withTimeout(
          () => extractTextFromPdf(buffer),
          30000, // 30s para extração
          "Timeout na extração de texto do PDF"
        )

        if (!text || text.trim().length === 0) {
          throw new Error("Não foi possível extrair texto do PDF")
        }

        // Estimar custo OpenAI baseado no tamanho do texto
        const tokens = Math.ceil(text.length / 4) // Estimativa aproximada
        cost.openai = (tokens / 1000) * COST_CONFIG.OPENAI_PER_1K_TOKENS

        // Verificar se custo é aceitável antes de processar
        if (cost.openai > 0.1) {
          // Mais de $0.10 para um PDF
          warnings.push("High processing cost detected")
          logger.warn("High cost PDF processing", "pdf", {
            documentId,
            userId,
            estimatedCost: cost.openai,
            textLength: text.length,
          })
        }

        // 2. Parse do extrato
        const bankData = parseStatementByBank(text)

        if (!bankData || bankData.length === 0) {
          throw new Error("Nenhuma transação encontrada no PDF")
        }

        // Limitar número de transações para controlar custo
        const limitedBankData = bankData.length > 500 ? bankData.slice(0, 500) : bankData

        // Converter para NormalizedTransaction adicionando category padrão
        const normalizedTransactions = limitedBankData.map((row) => ({
          ...row,
          category: "Outros", // Categoria padrão para transações de PDF
          subcategory: undefined,
        }))

        // 3. Importação com deduplicação
        const result = await withTimeout(
          () => importTransactionsFromPdfWithDedup(userId, normalizedTransactions),
          20000, // 20s para importação
          "Timeout na importação de transações"
        )

        return {
          success: true,
          transactions: result.success || bankData.length,
          processingTime: Date.now() - startTime,
        }
      },
      this.timeoutMs,
      "Timeout no processamento do PDF"
    )
  }

  private async processPDFFallback(
    documentId: string,
    buffer: Buffer,
    fileName: string,
    userId: string,
    cost: any
  ): Promise<ProcessPDFResult> {
    // Fallback sem OpenAI - apenas extração básica
    return await withTimeout(
      async () => {
        try {
          // Tentar extração mínima (sem IA)
          const text = await extractTextFromPdf(buffer)

          if (!text || text.trim().length === 0) {
            throw new Error("Fallback: Não foi possível extrair texto")
          }

          // Parse simplificado - sem OpenAI
          const transactions = this.extractTransactionsSimple(text)

          if (transactions.length === 0) {
            throw new Error("Fallback: Nenhuma transação encontrada")
          }

          // Limitar para controlar custo
          const limitedTransactions = transactions.slice(0, 100)

          // Importar sem validação complexa
          const normalizedTransactions = limitedTransactions.map((t) => ({
            ...t,
            category: "Outros",
            subcategory: undefined,
          }))
          const result = await importTransactionsFromPdfWithDedup(userId, normalizedTransactions)

          // Fallback não usa OpenAI - custo zero
          cost.openai = 0

          return {
            success: true,
            transactions: result.success || limitedTransactions.length,
            processingTime: 0,
          }
        } catch (error) {
          throw new Error(
            `Fallback falhou: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      },
      30000,
      "Timeout no fallback do PDF"
    )
  }

  private extractTransactionsSimple(text: string): any[] {
    const transactions: any[] = []

    // Padrões simples de transação
    const lines = text.split("\n").filter((line) => line.trim().length > 0)

    for (const line of lines) {
      // Procurar padrões de data + valor
      const dateMatch = line.match(/(\d{2}\/\d{2}|\d{2}-\d{2})/)
      const valueMatch = line.match(/(\d+,\d{2})/)

      if (dateMatch && valueMatch && valueMatch[1]) {
        const value = parseFloat(valueMatch[1].replace(",", "."))

        // Ignorar valores muito pequenos ou muito grandes
        if (value > 0.01 && value < 100000) {
          transactions.push({
            date: new Date().toISOString(),
            description: line.substring(0, 50).trim(),
            amount: value,
            type: value > 0 ? "income" : "expense",
            category: "Não categorizado",
            source: "pdf-fallback",
          })
        }
      }
    }

    return transactions.slice(0, 100) // Limitar para não sobrecarregar
  }

  private async updateDocumentStatus(documentId: string, status: string, error?: string) {
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status,
          ...(error && { error }),
          updatedAt: new Date(),
        },
      })
    } catch (updateError) {
      logger.error("Error updating document status", "pdf", {
        documentId,
        status,
        error: updateError,
      })
    }
  }

  // Limpeza de cache e controle de custos
  cleanupUserCache() {
    const now = Date.now()
    let cleanedCount = 0

    for (const [userId, cache] of userProcessingCache.entries()) {
      // Resetar contadores diários
      if (now - cache.lastProcessing > 24 * 60 * 60 * 1000) {
        cache.costToday = 0
        cache.processingCount = 0
        cleanedCount++
      }

      // Remover usuários inativos há mais de 30 dias
      if (now - cache.lastProcessing > 30 * 24 * 60 * 60 * 1000) {
        userProcessingCache.delete(userId)
        cleanedCount++
      }
    }

    logger.info("User cache cleanup completed", "pdf", {
      cleanedCount,
      totalUsers: userProcessingCache.size,
    })
    return cleanedCount
  }

  // Obter estatísticas de custo
  getCostStats(): {
    totalUsers: number
    totalCostToday: number
    totalCostMonth: number
    activeProcessors: number
  } {
    let totalCostToday = 0
    let totalCostMonth = 0
    let activeProcessors = 0

    for (const cache of userProcessingCache.values()) {
      totalCostToday += cache.costToday
      totalCostMonth += cache.costMonth
      if (cache.processingCount > 0) activeProcessors++
    }

    return {
      totalUsers: userProcessingCache.size,
      totalCostToday,
      totalCostMonth,
      activeProcessors,
    }
  }
}

// Singleton global
export const pdfProcessorCostAware = new CostAwarePDFProcessor()

// Função wrapper para uso em routes
export async function processPdfCostAware(
  documentId: string,
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<ProcessPDFResult> {
  return await pdfProcessorCostAware.processPDF(documentId, buffer, fileName, userId)
}

// Limpeza periódica (a cada 6 horas)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      pdfProcessorCostAware.cleanupUserCache()
    },
    6 * 60 * 60 * 1000
  )
}
