import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const rule = await prisma.categoryRule.findUnique({
      where: { id },
    })

    if (!rule || rule.userId !== session.user.id) {
      return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 })
    }

    await prisma.categoryRule.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Regra excluída" })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir regra" }, { status: 500 })
  }
}

const conditionSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME"]).optional(),
    amountMin: z.number().optional(),
    amountMax: z.number().optional(),
    descriptionRegex: z.string().optional(),
  })
  .optional()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive, category, condition } = body as {
      isActive?: boolean
      category?: string
      condition?: z.infer<typeof conditionSchema>
    }

    const rule = await prisma.categoryRule.findUnique({
      where: { id },
    })

    if (!rule || rule.userId !== session.user.id) {
      return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 })
    }

    const data: { isActive?: boolean; category?: string; conditionJson?: string | null } = {}
    if (typeof isActive === "boolean") data.isActive = isActive
    if (typeof category === "string" && category.trim()) data.category = category.trim()
    if (condition !== undefined) {
      data.conditionJson =
        condition && Object.keys(condition).length > 0
          ? JSON.stringify(condition)
          : null
    }

    const updated = await prisma.categoryRule.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar regra" }, { status: 500 })
  }
}
