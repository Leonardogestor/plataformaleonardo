import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const bulkEditSchema = z.object({
  transactionIds: z.array(z.string()).min(1, "Selecione pelo menos uma transação"),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { transactionIds, category, subcategory } = bulkEditSchema.parse(body)

    // Verify that all transactions belong to the current user
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais transações não foram encontradas" },
        { status: 404 }
      )
    }

    // Update all transactions in bulk
    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: transactionIds },
        userId: session.user.id,
      },
      data: {
        category,
        subcategory: subcategory || null,
        updatedAt: new Date(),
      },
    })

    // Trigger event to update dashboard
    // This will be handled by the client-side after successful update

    return NextResponse.json({
      message: "Transações atualizadas com sucesso",
      updatedCount: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    console.error("Error bulk updating transactions:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar transações" },
      { status: 500 }
    )
  }
}
