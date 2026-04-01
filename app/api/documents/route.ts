import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { uploadDocumentBlob, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/blob"
import { processDocumentPdf } from "@/lib/pdf-processing"
import { processDocumentExcel } from "@/lib/excel-processing"
import { processPdfFromBuffer } from "@/lib/pdf-processing-temp"
import { checkDocumentsLimit } from "@/lib/rate-limit"
import { randomUUID } from "crypto"

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]

/**
 * GET – List user documents (access control by userId).
 * Returns fileUrl, fileKey, mimeType, fileSize, status; no local file paths.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const where: Prisma.DocumentWhereInput = {
      userId: session.user.id,
    }
    if (q && q.length >= 2) {
      const term = { contains: q, mode: "insensitive" as const }
      where.AND = [
        {
          OR: [
            { name: term },
            { fileName: term },
            ...(q.length <= 500 ? [{ extractedText: term }] : []),
          ],
        },
      ]
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Erro ao listar documentos:", error)
    return NextResponse.json({ error: "Erro ao listar documentos" }, { status: 500 })
  }
}

/**
 * POST – Upload PDF only; store in Vercel Blob; create Document with status PROCESSING; trigger async processing (non-blocking).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar configuração do Blob Storage antes de processar
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN não configurado")
      return NextResponse.json(
        {
          error: "Sistema de upload não configurado. Contate o administrador.",
        },
        { status: 500 }
      )
    }

    // Rate limit desabilitado temporariamente para debug
    // const limit = await checkDocumentsLimit(session.user.id)
    // if (limit.limited) {
    //   const retryAfter = limit.retryAfter ?? 60
    //   return NextResponse.json(
    //     { error: "Muitos uploads. Tente novamente em alguns minutos." },
    //     { status: 429, headers: { "Retry-After": String(retryAfter) } }
    //   )
    // }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const name = (formData.get("name") as string) || "Documento"

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 10MB." }, { status: 400 })
    }

    const mimeType = file.type?.toLowerCase() ?? ""
    const fileName = file.name.toLowerCase()

    const isAllowed =
      ALLOWED_MIME_TYPES.includes(mimeType) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv")

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Apenas PDF, Excel (XLS, XLSX) e CSV são permitidos." },
        { status: 400 }
      )
    }

    console.log("Iniciando upload do arquivo:", { fileName: file.name, size: file.size, mimeType })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExtension = fileName.endsWith(".pdf")
      ? "pdf"
      : fileName.endsWith(".xlsx")
        ? "xlsx"
        : fileName.endsWith(".xls")
          ? "xls"
          : "csv"

    const pathnameSuffix = `${randomUUID()}.${fileExtension}`

    try {
      // Verificar se o Blob Storage está configurado
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("BLOB_READ_WRITE_TOKEN não configurado, usando fallback")

        // Fallback: criar documento sem upload físico por enquanto
        const doc = await prisma.document.create({
          data: {
            userId: session.user.id,
            name: name.trim() || file.name,
            fileName: file.name,
            mimeType: mimeType || (ALLOWED_MIME_TYPES[0] as string),
            fileSize: file.size,
            fileUrl: null, // Sem upload físico por enquanto
            fileKey: null,
            status: "PROCESSING",
          },
        })

        console.log("Documento criado no banco (sem upload):", doc.id)

        // Processar apenas o buffer localmente
        const processingEnabled = process.env.DOCUMENT_PROCESSING_ENABLED !== "false"
        if (processingEnabled && fileExtension === "pdf") {
          console.log("Iniciando processamento PDF local para documento:", doc.id)

          // Processar diretamente do buffer sem salvar no blob
          processPdfFromBuffer(doc.id, buffer).catch((e) => {
            console.error("Background PDF processing failed for document", doc.id, e)
          })
        }

        return NextResponse.json(doc, { status: 201 })
      }

      console.log("Tentando fazer upload para o blob storage...")
      const blobResult = await uploadDocumentBlob(session.user.id, pathnameSuffix, buffer, {
        contentType: mimeType || ALLOWED_MIME_TYPES[0],
      })

      console.log("Blob upload concluído:", blobResult.pathname)

      const doc = await prisma.document.create({
        data: {
          userId: session.user.id,
          name: name.trim() || file.name,
          fileName: file.name,
          mimeType: mimeType || (ALLOWED_MIME_TYPES[0] as string),
          fileSize: file.size,
          fileUrl: blobResult.url,
          fileKey: blobResult.pathname,
          status: "PROCESSING",
        },
      })

      console.log("Documento criado no banco:", doc.id)

      // Processar arquivos PDF e Excel/CSV
      const processingEnabled = process.env.DOCUMENT_PROCESSING_ENABLED !== "false"
      if (processingEnabled) {
        if (fileExtension === "pdf") {
          console.log("Iniciando processamento PDF para documento:", doc.id)
          processDocumentPdf(doc.id).catch((e) => {
            console.error("Background PDF processing failed for document", doc.id, e)
          })
        } else {
          console.log("Iniciando processamento Excel para documento:", doc.id)
          processDocumentExcel(doc.id).catch((e) => {
            console.error("Background Excel processing failed for document", doc.id, e)
          })
        }
      } else {
        console.log("Processamento de documentos desabilitado")
      }

      return NextResponse.json(doc, { status: 201 })
    } catch (blobError) {
      console.error("Erro específico no upload do blob:", blobError)
      return NextResponse.json(
        {
          error: `Falha no upload do arquivo: ${blobError instanceof Error ? blobError.message : "Erro desconhecido"}`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erro geral ao enviar documento:", error)
    return NextResponse.json(
      {
        error: "Erro ao enviar documento. Tente novamente.",
      },
      { status: 500 }
    )
  }
}
