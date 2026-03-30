import { pipelineLogger } from "@/lib/utils/logger"
import pLimit from "p-limit"

export interface BatchConfig {
  batchSize: number
  maxConcurrency: number
  timeout: number
}

export interface BatchResult<T> {
  success: boolean
  processed: T[]
  failed: unknown[]
  totalProcessed: number
  duration: number
  errors: string[]
}

/**
 * Timeout helper com tipagem segura
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ])
}

/**
 * Processa itens em lote para performance
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  config: { maxConcurrency: number; timeout: number }
): Promise<BatchResult<R>> {
  const startTime = Date.now()
  const { maxConcurrency, timeout } = config

  try {
    pipelineLogger.info("Starting batch processing", {
      totalItems: items.length,
      batchSize,
      maxConcurrency,
    })

    const success: R[] = []
    const failed: unknown[] = []
    const errors: string[] = []
    let totalProcessed = 0

    // Controle de concorrência com p-limit
    const limit = pLimit(maxConcurrency)

    // Processa em lotes
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      pipelineLogger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}`, {
        batchSize: batch.length,
        startIndex: i,
      })

      // Processa lote com concorrência controlada
      const batchPromises = batch.map(async (item, itemIndex) => {
        try {
          const result = await withTimeout(
            limit(() => processor(item)),
            timeout
          )

          success.push(result)
          totalProcessed++

          return { status: "fulfilled" as const, value: result }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          failed.push({ item, error: errorMessage })
          errors.push(`Item ${i + itemIndex}: ${errorMessage}`)

          return {
            status: "rejected" as const,
            reason: { item, error: errorMessage },
          }
        }
      })

      // Aguarda conclusão do lote
      const batchResults = await Promise.allSettled(batchPromises)

      // Processa resultados do lote
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          // Já processado no sucesso acima
        } else {
          // Já processado no erro acima
        }
      }

      pipelineLogger.debug(`Batch ${Math.floor(i / batchSize) + 1} completed`, {
        batchSize: batch.length,
        totalProcessed: success.length,
        totalFailed: failed.length,
      })
    }

    const duration = Date.now() - startTime

    pipelineLogger.info("Batch processing completed", {
      totalItems: items.length,
      totalProcessed: success.length,
      totalFailed: failed.length,
      duration,
      throughput: (success.length / duration) * 1000, // items per second
    })

    return {
      success: true,
      processed: success,
      failed,
      totalProcessed: success.length,
      duration,
      errors,
    }
  } catch (error) {
    const duration = Date.now() - startTime

    pipelineLogger.error("Batch processing failed", {
      totalItems: items.length,
      error: error instanceof Error ? error.message : "Unknown error",
      duration,
    })

    return {
      success: false,
      processed: [],
      failed: items.map((item) => ({
        item,
        error: error instanceof Error ? error.message : "Unknown error",
      })),
      totalProcessed: 0,
      duration,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}
