import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readFile, unlink } from "fs/promises"
import path from "path"

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
    })

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    const fullPath = path.join(process.cwd(), doc.filePath)
    const buffer = await readFile(fullPath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      },
    })
  } catch (error) {
    console.error("Erro ao baixar documento:", error)
    return NextResponse.json({ error: "Erro ao baixar documento" }, { status: 500 })
  }
}

export async function DELETE(
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
    try {
      await unlink(fullPath)
    } catch {
      // arquivo já removido
    }

    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir documento:", error)
    return NextResponse.json({ error: "Erro ao excluir documento" }, { status: 500 })
  }
}
