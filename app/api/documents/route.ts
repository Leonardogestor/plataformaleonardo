/**
 * VERSÃO SIMPLES E DEFINITIVA - Upload de PDF 100% funcional
 * Sem dependências de Blob Storage, Redis ou configurações complexas
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { extractTextFromPdf } from "@/lib/document-extract"
import { parseStatementByBank, detectBankFromText } from "@/lib/bank-parsers"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"
import { checkDocumentsLimit } from "@/lib/rate-limit"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB


export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 2. Buscar documentos do usuário com status detalhado
    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        syncLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    // 🔥 FORÇADO: Enriquece dados com informações adicionais
    const enrichedDocuments = documents.map((doc) => {
      const latestSync = doc.syncLogs[0]
      return {
        id: doc.id,
        name: doc.name,
        fileName: doc.fileName,
        status: doc.status,
        createdAt: doc.createdAt,
        fileSize: doc.fileSize,
        errorMessage: doc.errorMessage,
        extractedText: doc.extractedText?.slice(0, 500),
        mimeType: doc.mimeType,
        // 🔥 FORÇADO: Informações adicionais
        processingInfo: latestSync
          ? {
              transactionsProcessed: latestSync.transactionsProcessed,
              processingTime: latestSync.durationMs ? `${latestSync.durationMs}ms` : null,
              lastUpdate: latestSync.finishedAt || latestSync.startedAt,
            }
          : null,
        hasExtractedText: !!(doc.extractedText && doc.extractedText.length > 10),
        isCompleted: doc.status === "COMPLETED",
        isProcessing: doc.status === "PROCESSING",
        hasError: doc.status === "FAILED",
      }
    })

    return NextResponse.json({
      documents: enrichedDocuments,
      total: enrichedDocuments.length,
      // 🔥 FORÇADO: Estatísticas adicionais
      stats: {
        completed: enrichedDocuments.filter((d) => d.isCompleted).length,
        processing: enrichedDocuments.filter((d) => d.isProcessing).length,
        failed: enrichedDocuments.filter((d) => d.hasError).length,
        withExtractedText: enrichedDocuments.filter((d) => d.hasExtractedText).length,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao buscar documentos:", error)
    return NextResponse.json({ error: "Erro ao buscar documentos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 2. Rate Limiting (não-bloqueante — erro interno não derruba o upload)
    try {
      const rateLimitResult = await checkDocumentsLimit(request)
      if (rateLimitResult.limited) {
        return NextResponse.json(
          {
            error: "Too many requests",
            message: "Limite de uploads excedido. Tente novamente em alguns minutos.",
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
            },
          }
        )
      }
    } catch (rlError) {
      console.warn("⚠️ Rate limit check falhou (ignorado):", rlError)
    }

    // 3. Receber múltiplos arquivos
    const formData = await request.formData()
    const files = formData.getAll("files") as File[] | null
    const name = (formData.get("name") as string) || "Lote de Documentos"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // 🔥 FORÇADO: Validação rigorosa de todos os arquivos
    for (const file of files) {
      if (file.size === 0) {
        return NextResponse.json({ error: `Arquivo vazio: ${file.name}` }, { status: 400 })
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 10MB.` },
          { status: 400 }
        )
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Apenas arquivos PDF são permitidos: ${file.name}` },
          { status: 400 }
        )
      }
    }

    console.log(
      `📄 Iniciando processamento de ${files.length} PDFs:`,
      files.map((f) => f.name)
    )

    // Criar SyncLog para rastreamento (não-bloqueante)
    let syncLogId: string | null = null
    try {
      const syncLog = await prisma.syncLog.create({
        data: {
          status: "STARTED",
          startedAt: new Date(),
        },
      })
      syncLogId = syncLog.id
    } catch (slError) {
      console.warn("⚠️ SyncLog creation falhou (ignorado):", slError)
    }

    // 4. Criar múltiplos documentos no banco
    const documents = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())

        const doc = await prisma.document.create({
          data: {
            userId: session.user.id,
            name: file.name,
            fileName: file.name,
            mimeType: "application/pdf",
            fileSize: file.size,
            status: "PROCESSING",
          },
        })

        console.log("✅ Documento criado no banco:", doc.id)

        processPdfWithTracking(doc.id, buffer, file.name, session.user.id, syncLogId).catch(
          (error) => {
            console.error("❌ Erro no processamento:", error)
          }
        )

        return doc
      })
    )

    console.log(`📊 ${documents.length} documentos criados e processando...`)

    return NextResponse.json(
      {
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          message: "PDF recebido e está sendo processado...",
          syncLogId,
        })),
        total: documents.length,
        syncLogId,
        message: `${documents.length} PDFs recebidos e processando...`,
        processingStarted: new Date().toISOString(),
        expectedDuration: "30-60 segundos por PDF",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ Erro geral:", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Erro ao processar PDF. Tente novamente.", detail },
      { status: 500 }
    )
  }
}

// 🔥 FORÇADO: Versão melhorada com tracking e tratamento robusto
async function processPdfWithTracking(
  documentId: string,
  buffer: Buffer,
  fileName: string,
  userId: string,
  syncLogId: string | null
) {
  const startTime = Date.now()

  try {
    console.log("🔄 Processando PDF com tracking:", documentId)

    // 1. Extrair texto
    const text = await extractTextFromPdf(buffer)

    if (!text || text.length < 10) {
      throw new Error("Não foi possível extrair texto do PDF")
    }

    console.log("📝 Texto extraído:", text.length, "caracteres")

    // 2. Salvar texto extraído
    await prisma.document.update({
      where: { id: documentId },
      data: { extractedText: text.slice(0, 10000) },
    })

    // 3. 🔥 FORÇADO: Detectar banco automaticamente
    const bank = detectBankFromText(text)
    console.log("🏦 Banco detectado:", bank)

    // 4. Parse inteligente de transações
    const rows = parseStatementByBank(text)
    console.log("📊 Transações encontradas:", rows.length)

    if (rows.length === 0) {
      throw new Error("Nenhuma transação encontrada no PDF")
    }

    // 5. 🔥 FORÇADO: Enriquecer transações com informações adicionais
    const transactions = rows.map((row, index) => ({
      type: row.type,
      category: "Outros", // Categoria padrão
      subcategory: null,
      amount: row.amount,
      description: row.description,
      date: row.date,
      // 🔥 FORÇADO: Metadados adicionais
      metadata: {
        source: "pdf",
        bank: bank,
        fileName: fileName,
        extractionIndex: index,
        extractedAt: new Date().toISOString(),
      },
    }))

    // 6. Importar transações com deduplicação forte
    const result = await importTransactionsFromPdfWithDedup(userId, transactions)

    console.log("💾 Transações importadas:", result.success, "Falhas:", result.failed)

    // 7. Atualizar SyncLog com resultados (só se existir)
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          transactionsProcessed: result.success,
          documentId: documentId,
        },
      }).catch(() => {})
    }

    // 8. Atualizar status final do documento
    const finalStatus = result.success > 0 ? "COMPLETED" : "FAILED"
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: finalStatus,
        errorMessage: result.failed > 0 ? result.errors[0] : null,
      },
    })

    console.log("✅ Processamento finalizado:", finalStatus, "em", Date.now() - startTime, "ms")
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error("❌ Erro no processamento:", error)

    // Atualizar SyncLog com erro (só se existir)
    if (syncLogId) {
      await prisma.syncLog
        .update({
          where: { id: syncLogId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            durationMs: processingTime,
            error: error instanceof Error ? error.message : "Erro desconhecido",
            documentId: documentId,
          },
        })
        .catch(() => {})
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
      },
    })
  }
}
