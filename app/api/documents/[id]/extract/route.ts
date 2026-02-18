import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import path from "path"
import { extractTextFromFile } from "@/lib/document-extract"

export async function POST(
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
    })

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    const fullPath = path.join(process.cwd(), doc.filePath)
    const buffer = await readFile(fullPath)
    const text = await extractTextFromFile(buffer, doc.mimeType)

    await prisma.document.update({
      where: { id },
      data: { extractedText: text || null },
    })

    return NextResponse.json({
      success: true,
      extractedLength: text?.length ?? 0,
    })
  } catch (error) {
    console.error("Erro ao extrair texto:", error)
    return NextResponse.json(
      { error: "Erro ao extrair texto do documento" },
      { status: 500 }
    )
  }
}
