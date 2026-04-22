import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromPdf, extractTextFromExcel } from "@/lib/document-extract"
import { checkDocumentsLimit } from "@/lib/rate-limit"
import { uploadToS3, getS3SignedUrl, deleteFromS3 } from "@/lib/s3"
import { extractTransactionsFromPdfWithAI } from "@/lib/pdf-ai-extractor"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"

export const maxDuration = 60

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const where: Record<string, unknown> = { userId: session.user.id }
    if (q && q.length >= 2) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { fileName: { contains: q, mode: "insensitive" } },
        { extractedText: { contains: q, mode: "insensitive" } },
      ]
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("GET /api/documents error:", error)
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

    // 2. Rate limit (não-bloqueante)
    try {
      const rl = await checkDocumentsLimit(request)
      if (rl.limited) {
        return NextResponse.json(
          { error: "Limite de uploads excedido. Tente novamente em alguns minutos." },
          { status: 429 }
        )
      }
    } catch {
      // ignora falha de rate limit
    }

    // 3. Parse do FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (e) {
      console.error("formData parse error:", e)
      return NextResponse.json(
        { error: "Não foi possível ler o arquivo enviado. Tente novamente." },
        { status: 400 }
      )
    }

    // 4. Coletar arquivos - aceita campo "file" (singular) ou "files" (múltiplos)
    const rawFiles = [...formData.getAll("file"), ...formData.getAll("files")]

    const files: File[] = rawFiles.filter((f): f is File => f instanceof File && f.size > 0)

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo válido enviado." }, { status: 400 })
    }

    // 5. Validação de tamanho
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 10MB.` },
          { status: 400 }
        )
      }
    }

    // 6. Processar cada arquivo: extrair texto -> parsear -> importar transações
    const userId = session.user.id
    const createdDocs = await Promise.all(
      files.map(async (file) => {
        const fileName = file.name.toLowerCase()
        const isPdf = fileName.endsWith(".pdf")
        const isExcel =
          fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")
        const mimeType = isPdf ? "application/pdf" : file.type || "application/octet-stream"
        const buffer = Buffer.from(await file.arrayBuffer())

        let extractedText: string | null = null
        let errorMessage: string | null = null
        let status: DocumentStatus = DocumentStatus.COMPLETED
        let transactionsImported = 0

        try {
          if (isPdf) {
            // STEP 1: Upload para S3
            const s3Key = `documents/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
            try {
              await uploadToS3(buffer, s3Key, mimeType)
              console.log(`[ROUTE] PDF enviado para S3: ${s3Key}`)
            } catch (s3Err) {
              console.error("[ROUTE] Erro S3:", s3Err)
            }

            // STEP 2: Extrair texto com pdf-parse
            const pdfText = await extractTextFromPdf(buffer)
            console.log(`[ROUTE] Texto extraido: ${pdfText.length} chars`)

            if (!pdfText || pdfText.length < 50) {
              status = DocumentStatus.FAILED
              errorMessage =
                "Nao foi possivel extrair texto do PDF. O arquivo pode ser uma imagem escaneada."
            } else {
              // STEP 3: GPT interpreta o texto
              const aiResult = await extractTransactionsFromPdfWithAI(pdfText)

              if (aiResult.transactions.length > 0) {
                extractedText = pdfText.slice(0, 10000)
                // STEP 4: Salvar no banco com deduplicacao
                const toImport = aiResult.transactions.map((t) => ({
                  date: t.date,
                  amount: t.amount,
                  type: t.type,
                  category: t.category,
                  description: t.description,
                }))
                const result = await importTransactionsFromPdfWithDedup(userId, toImport as any)
                transactionsImported = result.success
                console.log(`[ROUTE] ${result.success} transacoes importadas`)
                if (result.failed > 0 && result.success === 0) {
                  status = DocumentStatus.FAILED
                  errorMessage = result.errors.slice(0, 3).join("; ")
                }
              } else {
                status = DocumentStatus.FAILED
                errorMessage =
                  "IA nao encontrou transacoes. Verifique se e um extrato bancario valido."
              }
            }

            // Cria o documento no banco, incluindo fileKey
            const doc = await prisma.document.create({
              data: {
                userId,
                name: file.name,
                fileName: file.name,
                mimeType,
                fileSize: file.size,
                status,
                extractedText,
                errorMessage,
                fileKey: s3Key,
              },
            })
            return {
              id: doc.id,
              name: doc.name,
              status: doc.status,
              transactionsImported,
            }
          } else if (isExcel) {
            let text = await extractTextFromExcel(buffer)
            if (!text) {
              status = DocumentStatus.FAILED
              errorMessage =
                "Nao foi possivel extrair texto do arquivo. Verifique se o arquivo e valido."
            } else {
              extractedText = text.slice(0, 100_000)
            }
            // Cria o documento no banco, incluindo fileKey
            const s3Key = `documents/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
            await uploadToS3(buffer, s3Key, mimeType)
            const doc = await prisma.document.create({
              data: {
                userId,
                name: file.name,
                fileName: file.name,
                mimeType,
                fileSize: file.size,
                status,
                extractedText,
                errorMessage,
                fileKey: s3Key,
              },
            })
            return {
              id: doc.id,
              name: doc.name,
              status: doc.status,
              transactionsImported,
            }
          }
        } catch (err) {
          console.error(` Erro ao processar ${file.name}:`, err)
          status = DocumentStatus.FAILED
          errorMessage = err instanceof Error ? err.message : "Erro inesperado no processamento"
        }
        return {
          id: null,
          name: file.name,
          status,
          transactionsImported,
        }
      })
    )

    const totalTransactions = createdDocs.reduce(
      (sum, d) => sum + (d?.transactionsImported ?? 0),
      0
    )

    return NextResponse.json(
      {
        success: true,
        documents: createdDocs,
        total: createdDocs.length,
        transactionsImported: totalTransactions,
        message: `${createdDocs.length} arquivo(s) processado(s). ${totalTransactions} transação(ões) importada(s).`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/documents error:", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Erro ao salvar documento. Tente novamente.", detail },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { ids } = await request.json().catch(() => ({ ids: null }))
    const where = ids?.length
      ? { userId: session.user.id, id: { in: ids as string[] } }
      : { userId: session.user.id }

    const docs = await prisma.document.findMany({
      where,
      select: { id: true, fileUrl: true, fileKey: true },
    })

    await Promise.allSettled(
      docs.map((doc) => {
        const ref = doc.fileUrl ?? doc.fileKey
        return ref ? deleteFromS3(ref) : Promise.resolve()
      })
    )

    await prisma.document.deleteMany({ where })

    return NextResponse.json({ success: true, deleted: docs.length })
  } catch (error) {
    console.error("DELETE /api/documents error:", error)
    return NextResponse.json({ error: "Erro ao excluir documentos" }, { status: 500 })
  }
}
