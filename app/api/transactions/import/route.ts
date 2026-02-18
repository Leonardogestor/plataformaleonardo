import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const importSchema = z.object({
  transactions: z.array(
    z.object({
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
      category: z.string().min(1),
      subcategory: z.string().optional(),
      amount: z.number().positive(),
      description: z.string().min(1),
      date: z.string(),
      accountId: z.string().optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transactions } = importSchema.parse(body)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const transaction of transactions) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: session.user.id,
              type: transaction.type,
              category: transaction.category,
              subcategory: transaction.subcategory || null,
              amount: transaction.amount,
              description: transaction.description,
              date: new Date(transaction.date),
              accountId: transaction.accountId || null,
              isPending: false,
            },
          })

          if (transaction.accountId) {
            const increment = transaction.type === "INCOME" ? transaction.amount : -transaction.amount
            await tx.account.update({
              where: { id: transaction.accountId },
              data: { balance: { increment } },
            })
          }
        })
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Erro na linha ${transaction.description}: ${error}`)
      }
    }

    return NextResponse.json({
      message: "Importação concluída",
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao importar transações" }, { status: 500 })
  }
}
