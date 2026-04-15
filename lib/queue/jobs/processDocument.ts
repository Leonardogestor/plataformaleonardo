import { pipelineLogger } from "@/lib/utils/logger"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromPdf, extractTextFromExcel } from "@/lib/document-extract"
import { parseTransactionsWithAI, convertToNormalizedTransaction } from "@/lib/ai-transaction-parser"
import { auditTransactions } from "@/lib/transaction-auditor"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"

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
 * Fluxo simples e direto:
 * 1. Baixa arquivo real
 * 2. Extrai texto
 * 3. Faz parsing com IA
 * 4. Importa transações
 * 5. Atualiza status do documento
 */
export async function processDocumentJob(
  data: ProcessDocumentJobData
): Promise<ProcessDocumentResult> {
  const startTime = Date.now()
  let syncLogId: string | null = null

  try {
    pipelineLogger.info("Starting document processing job", {
      userId: data.userId,
      fileName: data.fileName,
      fileId: data.fileId,
    })

    // 1. Buscar documento do banco de dados
    const document = await prisma.document.findUnique({
      where: { id: data.fileId },
      select: { mimeType: true, userId: true },
    })

    if (!document) {
      throw new Error("Documento não encontrado no banco de dados")
    }

    // 2. Criar log de início
    const logEntry = await prisma.syncLog.create({
      data: {
        documentId: data.fileId,
        startedAt: new Date(),
        status: DocumentStatus.PROCESSING,
      },
    })
    syncLogId = logEntry.id

    // 3. Baixar arquivo real
    pipelineLogger.info("Downloading file", { fileId: data.fileId })
    const response = await fetch(data.fileUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Falha ao baixar arquivo: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    pipelineLogger.info("File downloaded", {
      fileId: data.fileId,
      size: buffer.length,
    })

    // 4. Extrair texto baseado no tipo MIME
    let extractedText = ""

    if (document.mimeType === "application/pdf") {
      extractedText = await extractTextFromPdf(buffer)
    } else if (
      document.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      document.mimeType === "application/vnd.ms-excel" ||
      document.mimeType === "text/csv"
    ) {
      extractedText = await extractTextFromExcel(buffer)
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${document.mimeType}`)
    }

    // 5. Validar extração
    if (!extractedText || extractedText.length < 10) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startTime

      await prisma.document.update({
        where: { id: data.fileId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage:
            "Não foi possível extrair texto do PDF. Verifique se o documento tem texto legível (não é uma imagem/varredura).",
          extractedText: extractedText || null,
          updatedAt: finishedAt,
        },
      })

      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            finishedAt,
            durationMs,
            transactionsProcessed: 0,
            status: DocumentStatus.FAILED,
            error: "Falha na extração de texto",
          },
        })
      }

      pipelineLogger.warn("Text extraction failed", {
        fileId: data.fileId,
        extractedLength: extractedText?.length || 0,
      })

      return {
        success: false,
        processed: 0,
        errors: ["Falha na extração de texto"],
      }
    }

    pipelineLogger.info("Text extracted", {
      fileId: data.fileId,
      textLength: extractedText.length,
    })

    // 6. Parser: de texto bruto para transações normalizadas
    pipelineLogger.info("Parsing transactions", { fileId: data.fileId })

    const aiResult = await parseTransactionsWithAI(extractedText, "pdf")

    if (!aiResult.transactions || aiResult.transactions.length === 0) {
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startTime

      await prisma.document.update({
        where: { id: data.fileId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: "Nenhuma transação encontrada no arquivo",
          extractedText: extractedText.slice(0, 100_000),
          updatedAt: finishedAt,
        },
      })

      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            finishedAt,
            durationMs,
            transactionsProcessed: 0,
            status: DocumentStatus.FAILED,
            error: "Nenhuma transação encontrada",
          },
        })
      }

      pipelineLogger.warn("No transactions found", { fileId: data.fileId })

      return {
        success: false,
        processed: 0,
        errors: ["Nenhuma transação encontrada"],
      }
    }

    pipelineLogger.info("AI parsing completed", {
      fileId: data.fileId,
      transactionCount: aiResult.transactions.length,
    })

    // 7. Auditoria: validar e corrigir transações
    pipelineLogger.info("Auditing transactions", { fileId: data.fileId })
    const auditedTransactions = auditTransactions(
      aiResult.transactions.map((tx) => ({
        date: tx.date,
        type: tx.type,
        category: tx.category,
        value: tx.amount,
        description: tx.description,
        raw_description: tx.description,
      }))
    )

    const correctionStats = {
      total: auditedTransactions.length,
      corrected: auditedTransactions.filter((t) => t.corrected).length,
    }

    pipelineLogger.info("Audit completed", {
      fileId: data.fileId,
      ...correctionStats,
    })

    // 8. Converter para formato de importação
    const normalizedTransactions = auditedTransactions.map((tx) => ({
      date: tx.date,
      amount: Math.abs(tx.value),
      type: tx.type,
      category: tx.category,
      description: tx.description,
      sourceFile: "pdf",
    }))

    // 9. Importar transações com deduplicação
    const result = await importTransactionsFromPdfWithDedup(data.userId, normalizedTransactions)

    pipelineLogger.info("Transactions imported", {
      fileId: data.fileId,
      success: result.success,
      failed: result.failed,
    })

    // 10. Atualizar status final do documento
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startTime

    const status =
      result.failed > 0 && result.success === 0 ? DocumentStatus.FAILED : DocumentStatus.COMPLETED
    const errorMessage = result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null

    await prisma.document.update({
      where: { id: data.fileId },
      data: {
        status,
        errorMessage: status === DocumentStatus.FAILED ? errorMessage : null,
        extractedText: extractedText.slice(0, 100_000),
        updatedAt: finishedAt,
      },
    })

    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          finishedAt,
          durationMs,
          transactionsProcessed: result.success,
          status,
          error: errorMessage,
        },
      })
    }

    pipelineLogger.info("Document processing completed", {
      fileId: data.fileId,
      status,
      processed: result.success,
      durationMs,
    })

    return {
      success: status === DocumentStatus.COMPLETED,
      processed: result.success,
      warnings: result.errors.length > 0 ? result.errors : [],
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    const errorMessage = error.message || String(error)

    pipelineLogger.error("Document processing crashed", {
      userId: data.userId,
      fileName: data.fileName,
      fileId: data.fileId,
      error: errorMessage,
      duration,
    })

    try {
      await prisma.document.updateMany({
        where: { id: data.fileId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: errorMessage,
          updatedAt: new Date(),
        },
      })

      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            finishedAt: new Date(),
            durationMs: duration,
            transactionsProcessed: 0,
            status: DocumentStatus.FAILED,
            error: errorMessage,
          },
        })
      }
    } catch (updateError) {
      pipelineLogger.error("Failed to update document after error", {
        fileId: data.fileId,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
    }

    return {
      success: false,
      processed: 0,
      errors: [errorMessage],
    }
  }
}
