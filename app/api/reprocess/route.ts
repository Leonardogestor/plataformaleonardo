import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { addTransactionProcessingJob } from "@/lib/queue/queue"
import { pipelineLogger } from "@/lib/utils/logger"

// Versão atual do parser
const PARSER_VERSION = "v2.1.0"

// Schema para validação
const ReprocessSchema = z.object({
  documentId: z.string().uuid("ID do documento inválido"),
  parserVersion: z.string().optional().default(PARSER_VERSION),
  forceReprocess: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    // Validar corpo da requisição
    const body = await request.json()
    const { documentId, parserVersion, forceReprocess } = ReprocessSchema.parse(body)

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: { id: true },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    // Verificar se já está sendo processado
    if (document.status === DocumentStatus.PROCESSING && !forceReprocess) {
      return NextResponse.json({ error: "Documento já está sendo processado" }, { status: 409 })
    }

    // Verificar idempotência (hash do arquivo)
    // Skip hash check for now as fileHash field is not in the schema
    // const existingDocument = await prisma.document.findFirst({
    //   where: {
    //     fileHash: document.fileHash,
    //     id: { not: documentId }, // Diferente do atual
    //     status: { in: ["COMPLETED", "PROCESSING"] },
    //   },
    // })

    // if (existingDocument && !forceReprocess) {
    //   return NextResponse.json({ error: "Documento duplicado detectado" }, { status: 409 })
    // }

    // Atualizar status para PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PROCESSING,
        updatedAt: new Date(),
      },
    })

    // Criar histórico de reprocessamento (simplificado)
    pipelineLogger.info("Reprocess requested", {
      documentId,
      userId: document.userId,
      parserVersion,
    })

    // Preparar dados para o job
    const jobData = {
      fileUrl: document.fileUrl || "",
      userId: document.userId,
      fileName: document.fileName,
      fileId: documentId,
      priority: 5, // Alta prioridade para reprocessamento
    }

    // Adicionar na fila
    const jobResult = await addTransactionProcessingJob(jobData)

    if (!jobResult.success) {
      // Rollback do status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: document.status, // Restaura status anterior
          updatedAt: new Date(),
        },
      })

      return NextResponse.json(
        { error: "Falha ao adicionar job na fila", details: jobResult.error },
        { status: 500 }
      )
    }

    pipelineLogger.info("Document reprocess queued", {
      documentId,
      userId: document.userId,
      fileName: document.fileName,
      parserVersion,
      jobId: jobResult.jobId,
    })

    return NextResponse.json({
      success: true,
      message: "Documento enviado para reprocessamento",
      data: {
        documentId,
        jobId: jobResult.jobId,
        estimatedWait: jobResult.estimatedWait,
        parserVersion,
      },
    })
  } catch (error: any) {
    pipelineLogger.error("Reprocess request failed", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// GET para status de reprocessamento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json({ error: "documentId é obrigatório" }, { status: 400 })
    }

    // Buscar documento atual
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        status: true,
        updatedAt: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        document,
        reprocessHistory: [], // Simplificado
        totalReprocesses: 0,
      },
    })
  } catch (error: any) {
    pipelineLogger.error("Reprocess status request failed", {
      error: error.message,
    })

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
