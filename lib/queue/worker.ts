import { Worker } from "bullmq"
import { pipelineLogger } from "@/lib/utils/logger"
import { processDocumentJob } from "./jobs/processDocument"

// Configuração do worker
const workerConfig = {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
  },
  concurrency: Number(process.env.QUEUE_CONCURRENCY) || 2,
}

// Worker principal
export const transactionWorker = new Worker(
  "transaction-processing",
  async (job) => {
    const startTime = Date.now()

    try {
      pipelineLogger.info("Worker processing job", {
        jobId: job.id,
        userId: job.data.userId,
        fileName: job.data.fileName,
        attempts: job.attemptsMade,
      })

      // Processa o documento
      const result = await processDocumentJob(job.data)

      const duration = Date.now() - startTime

      if (result.success) {
        pipelineLogger.info("Worker job completed successfully", {
          jobId: job.id,
          userId: job.data.userId,
          processed: result.processed,
          duration,
          attempts: job.attemptsMade,
        })
      } else {
        pipelineLogger.error("Worker job failed", {
          jobId: job.id,
          userId: job.data.userId,
          errors: result.errors || ["Unknown error"],
          duration,
          attempts: job.attemptsMade,
        })
      }

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime

      pipelineLogger.error("Worker job crashed", {
        jobId: job.id,
        userId: job.data.userId,
        errors: [error.message],
        duration,
        attempts: job.attemptsMade,
      })

      throw error
    }
  },
  workerConfig
)

// Event listeners para monitoramento
transactionWorker.on("completed", (job, result) => {
  pipelineLogger.info("Job completed event", {
    jobId: job.id,
    userId: job.data.userId,
    duration: Date.now() - job.timestamp,
    processed: result?.processed || 0,
  })
})

transactionWorker.on("failed", (job: any, err: any) => {
  pipelineLogger.error("Job failed event", {
    jobId: job?.id,
    userId: job?.data?.userId,
    errors: [err?.message],
    attempts: job?.attemptsMade,
    failedReason: err.name || "Unknown",
  })
})

transactionWorker.on("error", (err) => {
  pipelineLogger.error("Worker error event", {
    error: err.message,
    stack: err.stack,
  })
})

transactionWorker.on("stalled", (job: any) => {
  pipelineLogger.warn("Job stalled event", {
    jobId: job?.id,
    userId: job?.data?.userId,
    stalledFor: Date.now() - job?.timestamp,
  })
})

transactionWorker.on("progress", (job, progress) => {
  pipelineLogger.debug("Job progress event", {
    jobId: job.id,
    userId: job.data.userId,
    progress: `${progress}%`,
  })
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  pipelineLogger.info("Received SIGTERM, shutting down worker gracefully")

  try {
    await transactionWorker.close()
    pipelineLogger.info("Worker closed successfully")
  } catch (error: any) {
    pipelineLogger.error("Error closing worker", {
      errors: [error.message],
    })
  }

  process.exit(0)
})

process.on("SIGINT", async () => {
  pipelineLogger.info("Received SIGINT, shutting down worker gracefully")

  try {
    await transactionWorker.close()
    pipelineLogger.info("Worker closed successfully")
  } catch (error: any) {
    pipelineLogger.error("Error closing worker", {
      errors: [error.message],
    })
  }

  process.exit(0)
})
