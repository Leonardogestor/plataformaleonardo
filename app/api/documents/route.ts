import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { uploadDocumentBlob, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/blob"
import { processDocumentPdf } from "@/lib/pdf-processing"
import { processDocumentExcel } from "@/lib/excel-processing"
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

    const limit = await checkDocumentsLimit(session.user.id)
    if (limit.limited) {
      const retryAfter = limit.retryAfter ?? 60
      return NextResponse.json(
        { error: "Muitos uploads. Tente novamente em alguns minutos." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }

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

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExtension = fileName.endsWith(".pdf")
      ? "pdf"
      : fileName.endsWith(".xlsx")
        ? "xlsx"
        : fileName.endsWith(".xls")
          ? "xls"
          : "csv"

    const pathnameSuffix = `${randomUUID()}.${fileExtension}`
    const blobResult = await uploadDocumentBlob(session.user.id, pathnameSuffix, buffer, {
      contentType: mimeType || ALLOWED_MIME_TYPES[0],
    })

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

    // Processar arquivos PDF e Excel/CSV
    const processingEnabled = process.env.DOCUMENT_PROCESSING_ENABLED !== "false"
    if (processingEnabled) {
      if (fileExtension === "pdf") {
        processDocumentPdf(doc.id).catch((e) => {
          console.error("Background PDF processing failed for document", doc.id, e)
        })
      } else {
        // Excel, XLS, CSV
        processDocumentExcel(doc.id).catch((e) => {
          console.error("Background Excel processing failed for document", doc.id, e)
        })
      }
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error("Erro ao enviar documento:", error)
    return NextResponse.json({ error: "Erro ao enviar documento" }, { status: 500 })
  }
}
