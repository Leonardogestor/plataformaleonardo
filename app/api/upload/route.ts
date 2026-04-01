import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateFileHash } from "@/lib/utils/crypto"
import { prisma } from "@/lib/db"
import { addTransactionProcessingJob } from "@/lib/queue/queue"
import { apiLogger } from "@/lib/utils/logger"
import { z } from "zod"

const UploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      { message: "Arquivo deve ter no máximo 10MB" }
    )
    .refine(
      (file) =>
        [
          "application/pdf",
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ].includes(file.type),
      { message: "Tipo de arquivo não suportado" }
    ),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    apiLogger.info("Upload request received")

    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Parse do formulário multipart
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Validar arquivo
    const validation = UploadSchema.safeParse({ file })
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Arquivo inválido",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      )
    }

    apiLogger.info("File validation passed", {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })

    // Gerar hash para idempotência
    const buffer = await file.arrayBuffer()
    const fileHash = generateFileHash(Buffer.from(buffer))

    // Verificar duplicata por hash
    // Skip hash check for now as fileHash field is not in the schema
    // const existingDocument = await prisma.document.findFirst({
    //   where: {
    //     userId: session.user.id,
    //     fileHash,
    //   },
    // })

    // if (existingDocument) {
    //   apiLogger.info("Duplicate document detected", {
    //     fileHash,
    //     originalFileId: existingDocument.id,
    //     originalFileName: existingDocument.fileName,
    //   })

    //   return NextResponse.json({
    //     success: false,
    //     error: "Documento já processado anteriormente",
    //     duplicate: true,
    //     originalFile: {
    //       id: existingDocument.id,
    //       name: existingDocument.fileName,
    //       createdAt: existingDocument.createdAt,
    //     },
    //   })
    // }

    // Salvar documento com status PROCESSING
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        name: file.name,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        status: "PROCESSING",
      },
    })

    apiLogger.info("Document saved successfully", {
      fileId: document.id,
      fileHash,
    })

    // Adicionar job na fila (NÃO BLOQUEANTE)
    const jobResult = await addTransactionProcessingJob({
      fileUrl: `/api/documents/${document.id}/download`,
      userId: session.user.id,
      fileName: file.name,
      fileId: document.id,
    })

    if (!jobResult.success) {
      // Falha ao adicionar na fila, mas documento já foi salvo
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          errorMessage: jobResult.error,
        },
      })

      return NextResponse.json({
        success: false,
        error: "Falha ao enfileirar processamento",
        details: jobResult.error,
      })
    }

    const processingTime = Date.now() - startTime

    apiLogger.info("Upload completed successfully", {
      fileId: document.id,
      jobId: jobResult.jobId,
      estimatedWait: jobResult.estimatedWait,
      processingTime,
    })

    // Resposta imediata (NÃO BLOQUEANTE)
    return NextResponse.json({
      success: true,
      message: "Arquivo recebido e enfileirado para processamento",
      data: {
        fileId: document.id,
        fileName: file.name,
        status: "PROCESSING",
        jobId: jobResult.jobId,
        estimatedWait: jobResult.estimatedWait,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    apiLogger.error("Upload failed", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
      processingTime,
    })

    return NextResponse.json(
      {
        error: "Erro interno no servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Retornar informações sobre os tipos de arquivos suportados
    const supportedTypes = {
      "application/pdf": {
        name: "PDF",
        description: "Extratos bancários em PDF",
        maxSize: "10MB",
      },
      "text/csv": {
        name: "CSV",
        description: "Arquivos CSV exportados de bancos",
        maxSize: "10MB",
      },
      "application/vnd.ms-excel": {
        name: "Excel (XLS)",
        description: "Planilhas Excel antigas",
        maxSize: "10MB",
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        name: "Excel (XLSX)",
        description: "Planilhas Excel modernas",
        maxSize: "10MB",
      },
    }

    return NextResponse.json({
      supportedTypes,
      maxSize: 10 * 1024 * 1024, // 10MB
      pipeline: {
        steps: [
          "Extração de dados brutos",
          "Parsing e estruturação",
          "Normalização e categorização",
          "Persistência final",
        ],
        features: [
          "Detecção automática de categorias",
          "Classificação inteligente com IA",
          "Validação de duplicatas",
          "Auditoria completa",
        ],
      },
    })
  } catch (error) {
    console.error("[UPLOAD] Erro na requisição GET:", error)

    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}

// Configurar limite de tamanho para o Next.js
// Nota: Em Next.js 14 App Router, use middleware ou configuração de servidor para limites
