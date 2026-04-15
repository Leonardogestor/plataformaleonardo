import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromPdf } from "@/lib/document-extract"
import { checkDocumentsLimit } from "@/lib/rate-limit"
import { deleteDocumentBlob } from "@/lib/blob"
import { processSafe, SafeTransaction } from "@/lib/safe-engine"

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

    // 4. Coletar arquivos — aceita campo "file" (singular) ou "files" (múltiplos)
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

    // 6. Processar cada arquivo de forma síncrona dentro da request
    // (Vercel serverless não suporta background tasks — o processo encerra após a resposta)
    const userId = session.user.id
    const createdDocs = await Promise.all(
      files.map(async (file) => {
        const isPdf = file.name.toLowerCase().endsWith(".pdf")
        const mimeType = isPdf ? "application/pdf" : file.type || "application/octet-stream"
        const buffer = Buffer.from(await file.arrayBuffer())

        // Tentar extrair texto e transações dentro da request
        let extractedText: string | null = null
        let errorMessage: string | null = null
        let status: DocumentStatus = DocumentStatus.COMPLETED

        if (isPdf) {
          try {
            // Server-side extraction only (client-side removed for reliability)
            const text = await extractTextFromPdf(buffer)

            if (text && text.length >= 10) {
              extractedText = text.slice(0, 10000)
            } else {
              // Extraction returned empty or very short text - mark as FAILED
              status = DocumentStatus.FAILED
              errorMessage =
                "Não foi possível extrair texto do PDF. Verifique se o documento tem texto legível (não é uma imagem/varredura)."
            }
          } catch (extractErr) {
            console.warn(`⚠️ ${file.name}: extração falhou:`, extractErr)
            status = DocumentStatus.FAILED
            errorMessage =
              extractErr instanceof Error ? extractErr.message : "Falha na extração de PDF"
          }
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

        return { id: doc.id, name: doc.name, status: doc.status }
      })
    )

    return NextResponse.json(
      {
        success: true,
        documents: createdDocs,
        total: createdDocs.length,
        message: `${createdDocs.length} arquivo(s) recebido(s) e sendo processado(s).`,
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
