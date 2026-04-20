import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromExcel } from "@/lib/document-extract"
import { checkDocumentsLimit } from "@/lib/rate-limit"
import { deleteDocumentBlob } from "@/lib/blob"
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
          // 1. Extrair texto
          let text = ""
          if (isPdf) {
            // Usa apenas o novo extractor GPT
            const aiResult = await extractTransactionsFromPdfWithAI(buffer)
            if (!aiResult.transactions || aiResult.transactions.length === 0) {
              status = DocumentStatus.FAILED
              errorMessage = "Nenhuma transação encontrada no PDF."
            } else {
              transactionsImported = aiResult.transactions.length
            }
            extractedText = null // ou pode extrair texto se necessário
          } else if (isExcel) {
            text = await extractTextFromExcel(buffer)
            // Aqui pode adicionar lógica para Excel se necessário
          }

          if (!text && !isPdf) {
            status = DocumentStatus.FAILED
            errorMessage =
              "Não foi possível extrair texto do arquivo. Verifique se o PDF tem texto legível (não é uma imagem escaneada)."
          } else if (!isPdf) {
            extractedText = text?.slice(0, 100_000) || null
          }
        } catch (err) {
          console.error(` Erro ao processar ${file.name}:`, err)
          status = DocumentStatus.FAILED
          errorMessage = err instanceof Error ? err.message : "Erro inesperado no processamento"
        }

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
          },
        })

        return {
          id: doc.id,
          name: doc.name,
          status: doc.status,
          transactionsImported,
        }
      })
    )

    const totalTransactions = createdDocs.reduce((sum, d) => sum + (d.transactionsImported ?? 0), 0)

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
        return ref ? deleteDocumentBlob(ref) : Promise.resolve()
      })
    )

    await prisma.document.deleteMany({ where })

    return NextResponse.json({ success: true, deleted: docs.length })
  } catch (error) {
    console.error("DELETE /api/documents error:", error)
    return NextResponse.json({ error: "Erro ao excluir documentos" }, { status: 500 })
  }
}
