import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { processDocumentPdf } from "@/lib/pdf-processing"
import { checkDocumentsLimit } from "@/lib/rate-limit"

/**
 * POST – Re-trigger async PDF processing for a document (e.g. after FAILED or for reprocess).
 * Does not block: enqueues processing and returns immediately.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const limit = await checkDocumentsLimit(session.user.id)
    if (limit.limited) {
      const retryAfter = limit.retryAfter ?? 60
      return NextResponse.json(
        { error: "Muitas solicitações de processamento. Tente novamente em alguns minutos." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }

    const { id } = await params
    const doc = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, status: true, fileUrl: true },
    })

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    if (!doc.fileUrl) {
      return NextResponse.json(
        { error: "Documento sem arquivo (armazenamento antigo ou inválido)" },
        { status: 400 }
      )
    }

    await prisma.document.update({
      where: { id },
      data: { status: "PROCESSING", errorMessage: null, updatedAt: new Date() },
    })

    processDocumentPdf(id).catch((e) => {
      console.error("Background PDF reprocess failed for document", id, e)
    })

    return NextResponse.json({
      success: true,
      message: "Processamento em background iniciado.",
    })
  } catch (error) {
    console.error("Erro ao extrair/reprocessar documento:", error)
    return NextResponse.json(
      { error: "Erro ao iniciar processamento do documento" },
      { status: 500 }
    )
  }
}
