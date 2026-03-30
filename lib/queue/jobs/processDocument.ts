import { pipelineLogger } from "@/lib/utils/logger"

export interface ProcessDocumentJobData {
  fileUrl: string
  userId: string
  fileName: string
  fileId: string
}

export interface ProcessDocumentResult {
  success: boolean
  processed?: number
  warnings?: string[]
  errors?: string[]
}

/**
 * Job principal de processamento de documento
 */
export async function processDocumentJob(
  data: ProcessDocumentJobData
): Promise<ProcessDocumentResult> {
  const startTime = Date.now()

  try {
    pipelineLogger.info("Starting document processing job", {
      userId: data.userId,
      fileName: data.fileName,
      fileId: data.fileId,
    })

    // Importa o pipeline dinamicamente para evitar dependência circular
    const { processDocument } = await import("@/lib/services/transactionPipeline")

    // Simula busca do arquivo (em produção seria download do S3/URL)
    const fileBuffer = Buffer.from("simulated-file-content") // Em prod: await fetch(fileUrl).then(r => r.arrayBuffer())

    // Cria objeto File simulado
    const file = new File([fileBuffer], data.fileName, {
      type: "application/pdf", // Detectar tipo real em prod
    })

    // Processa o documento
    const result = await processDocument(file, data.userId)

    const duration = Date.now() - startTime

    if (result.success) {
      pipelineLogger.info("Document processing job completed successfully", {
        userId: data.userId,
        fileName: data.fileName,
        processed: result.processed,
        duration,
        warnings: result.warnings?.length || 0,
      })

      return {
        success: true,
        processed: result.processed,
        warnings: result.warnings,
      }
    } else {
      pipelineLogger.error("Document processing job failed", {
        userId: data.userId,
        fileName: data.fileName,
        errors: result.errors || ["Unknown error"],
        duration,
      })

      return {
        success: false,
        errors: result.errors || ["Unknown error"],
      }
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    pipelineLogger.error("Document processing job crashed", {
      userId: data.userId,
      fileName: data.fileName,
      error: error.message,
      duration,
    })

    return {
      success: false,
      errors: [error.message],
    }
  }
}
