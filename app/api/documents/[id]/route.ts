import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteDocumentBlob } from "@/lib/blob"
import { z } from "zod"

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  vencimentoAt: z.string().nullable().optional(),
})

/**
 * GET – Return document metadata. For file download use GET /api/documents/[id]/download to get secure redirect to blob URL.
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
    })

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error("Erro ao obter documento:", error)
    return NextResponse.json({ error: "Erro ao obter documento" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json()
    const parsed = updateDocumentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const data: { name?: string; vencimentoAt?: Date | null } = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.vencimentoAt !== undefined) {
      data.vencimentoAt = parsed.data.vencimentoAt ? new Date(parsed.data.vencimentoAt) : null
    }

    const updated = await prisma.document.update({
      where: { id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Erro ao atualizar documento:", error)
    return NextResponse.json({ error: "Erro ao atualizar documento" }, { status: 500 })
  }
}

/**
 * DELETE – Delete document record and blob (by fileUrl or fileKey). Safe if blob already removed.
 */
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

    const toDelete = doc.fileUrl ?? doc.fileKey
    if (toDelete) {
      try {
        await deleteDocumentBlob(toDelete)
      } catch {
        // Blob may already be deleted
      }
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
