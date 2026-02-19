import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET – Download seguro por proxy: verifica userId e faz stream do blob no servidor.
 * A URL do blob NUNCA é enviada ao cliente (evita compartilhamento e risco jurídico).
 * Quando a Vercel suportar signed URL com expiração (ex: 60s), podemos gerar essa URL
 * server-side e redirecionar, mantendo a URL temporária e não compartilhável.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const doc = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      select: { fileUrl: true, fileName: true, mimeType: true },
    })

    if (!doc || !doc.fileUrl) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    const res = await fetch(doc.fileUrl, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json({ error: "Arquivo indisponível" }, { status: 502 })
    }

    const contentType = doc.mimeType || "application/pdf"
    const disposition = `attachment; filename="${encodeURIComponent(doc.fileName || "documento.pdf")}"`

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
      },
    })
  } catch (error) {
    console.error("Erro ao baixar documento:", error)
    return NextResponse.json({ error: "Erro ao baixar documento" }, { status: 500 })
  }
}
