import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const transactionUpdateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  accountId: z.string().nullable().optional(),
  cardId: z.string().nullable().optional(),
  isPending: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        account: { select: { name: true } },
        card: { select: { name: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Notificar frontend para atualizar dashboard
    if (typeof globalThis !== "undefined" && globalThis.dispatchEvent) {
      globalThis.dispatchEvent(new Event("transaction-updated"))
    }
    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar transação" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const data = transactionUpdateSchema.parse(body)

    // Buscar transação original
    const originalTransaction = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!originalTransaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Se mudou o valor ou tipo, atualizar saldo da conta antiga
    if (originalTransaction.accountId && (data.amount || data.type)) {
      const oldAmount = Number(originalTransaction.amount)
      const oldType = originalTransaction.type
      const oldChange = oldType === "INCOME" ? oldAmount : -oldAmount

      await prisma.account.update({
        where: { id: originalTransaction.accountId },
        data: {
          balance: {
            decrement: oldChange,
          },
        },
      })
    }

    // Atualizar transação
    const updateData: Record<string, unknown> = { ...data }
    if (data.date) {
      updateData.date = new Date(data.date)
    }

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        account: { select: { name: true } },
        card: { select: { name: true } },
      },
    })

    // Aplicar novo saldo se houver conta
    const newAccountId =
      data.accountId !== undefined ? data.accountId : originalTransaction.accountId
    if (newAccountId) {
      const newAmount = data.amount ?? Number(originalTransaction.amount)
      const newType = data.type ?? originalTransaction.type
      const newChange = newType === "INCOME" ? newAmount : -newAmount

      await prisma.account.update({
        where: { id: newAccountId },
        data: {
          balance: {
            increment: newChange,
          },
        },
      })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    console.error("Error updating transaction:", error)
    return NextResponse.json({ error: "Erro ao atualizar transação" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Reverter saldo da conta
    if (transaction.accountId) {
      const amount = Number(transaction.amount)
      const balanceChange = transaction.type === "INCOME" ? -amount : amount

      await prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      })
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    })

    // Notificar frontend para atualizar dashboard
    if (typeof globalThis !== "undefined" && globalThis.dispatchEvent) {
      globalThis.dispatchEvent(new Event("transaction-updated"))
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Erro ao deletar transação" }, { status: 500 })
  }
}
