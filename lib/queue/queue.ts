import { Queue, Worker, QueueOptions } from "bullmq"
import { pipelineLogger } from "@/lib/utils/logger"
import { processDocumentJob } from "./jobs/processDocument"

// Configuração da fila
const queueConfig: QueueOptions = {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
}

// Fila principal de processamento de documentos
export const transactionQueue = new Queue("transaction-processing", queueConfig)

// Worker principal
export const transactionWorker = new Worker(
  "transaction-processing",
  async (job: any) => {
    const startTime = Date.now()

    try {
      pipelineLogger.info("Starting transaction processing job", {
        jobId: job.id,
        userId: job.data.userId,
        fileName: job.data.fileName,
      })

      // Processa o documento
      const result = await processDocumentJob(job.data)

      const duration = Date.now() - startTime

      if (result.success) {
        pipelineLogger.info("Transaction processing job completed successfully", {
          jobId: job.id,
          userId: job.data.userId,
          processed: result.processed,
          duration,
        })
      } else {
        pipelineLogger.error("Transaction processing job failed", {
          jobId: job.id,
          userId: job.data.userId,
          errors: result.errors || ["Unknown error"],
          duration,
        })
      }

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime

      pipelineLogger.error("Transaction processing job crashed", {
        jobId: job.id,
        userId: job.data.userId,
        errors: [error.message],
        duration,
      })

      throw error
    }
  },
  {
    connection: queueConfig.connection,
    concurrency: Number(process.env.QUEUE_CONCURRENCY) || 2,
    limiter: {
      max: 100,
      duration: 60000, // 1 minuto
    },
  }
)

// Função para adicionar job na fila
export async function addTransactionProcessingJob(data: {
  fileUrl: string
  userId: string
  fileName: string
  fileId: string
  priority?: number
}) {
  try {
    const job = await transactionQueue.add("process-document", data, {
      priority: data.priority || 0,
      delay: 0,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    })

    pipelineLogger.info("Transaction processing job added to queue", {
      jobId: job.id,
      userId: data.userId,
      fileName: data.fileName,
      priority: data.priority || 0,
    })

    return {
      success: true,
      jobId: job.id,
      estimatedWait: Math.max(0, (await transactionQueue.getWaiting()).length - 1) * 5000, // estimativa em ms
    }
  } catch (error: any) {
    pipelineLogger.error("Failed to add transaction processing job", {
      userId: data.userId,
      fileName: data.fileName,
      errors: [error.message],
    })

    return {
      success: false,
      error: error.message,
    }
  }
}

// Função para obter status da fila
export async function getQueueStatus() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      transactionQueue.getWaiting(),
      transactionQueue.getActive(),
      transactionQueue.getCompleted(),
      transactionQueue.getFailed(),
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    }
  } catch (error: any) {
    pipelineLogger.error("Failed to get queue status", {
      errors: [error.message],
    })
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0,
    }
  }
}

// Função para limpar jobs falhados
export async function cleanFailedJobs(maxAge: number = 3600000) {
  // 1 hora
  try {
    const failed = await transactionQueue.getFailed()
    const cutoffTime = Date.now() - maxAge

    let cleanedCount = 0

    for (const job of failed) {
      if (job.finishedOn && job.finishedOn < cutoffTime) {
        await job.remove()
        cleanedCount++
      }
    }

    pipelineLogger.info("Cleaned up failed jobs", {
      cleanedCount,
      maxAge,
    })

    return cleanedCount
  } catch (error: any) {
    pipelineLogger.error("Failed to clean failed jobs", {
      errors: [error.message],
    })
    return 0
  }
}

// Função para pausar/retomar processamento
export async function pauseQueue() {
  try {
    await transactionQueue.pause()
    pipelineLogger.info("Transaction queue paused")
  } catch (error: any) {
    pipelineLogger.error("Failed to pause queue", {
      errors: [error.message],
    })
  }
}

export async function resumeQueue() {
  try {
    await transactionQueue.resume()
    pipelineLogger.info("Transaction queue resumed")
  } catch (error: any) {
    pipelineLogger.error("Failed to resume queue", {
      errors: [error.message],
    })
  }
}
