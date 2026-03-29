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
      amount: z
        .number()
        .positive()
        .transform((val) => Math.round(val * 100) / 100),
      description: z.string().min(1),
      date: z.string(),
      accountId: z.string().nullable().optional(),
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
    console.log("Dados recebidos na importação:", JSON.stringify(body, null, 2))

    const { transactions } = importSchema.parse(body)
    console.log("Transações validadas com sucesso:", transactions.length)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      duplicates: 0,
    }

    // Get existing transactions to check for duplicates
    const existingTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: { description: true, amount: true, date: true, type: true },
    })

    const createKey = (t: any) => `${t.description}-${t.amount}-${t.date}-${t.type}`
    const existingKeys = new Set(existingTransactions.map(createKey))

    for (const transaction of transactions) {
      try {
        // Check for duplicate
        const transactionKey = createKey(transaction)
        if (existingKeys.has(transactionKey)) {
          results.duplicates++
          results.errors.push(`Transação duplicada ignorada: ${transaction.description}`)
          continue
        }

        // Set default category if none provided (skip categorization API to avoid errors)
        let category = transaction.category || "Outros"
        if (!category || category.trim() === "") {
          category = "Outros"
        }

        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: session.user.id,
              type: transaction.type,
              category,
              subcategory: transaction.subcategory || null,
              amount: transaction.amount,
              description: transaction.description,
              date: new Date(transaction.date),
              accountId: transaction.accountId || null,
              isPending: false,
            },
          })

          if (transaction.accountId) {
            const increment =
              transaction.type === "INCOME" ? transaction.amount : -transaction.amount
            await tx.account.update({
              where: { id: transaction.accountId },
              data: { balance: { increment } },
            })
          }
        })
        results.success++
        existingKeys.add(transactionKey) // Add to avoid duplicates within same import
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Erro ao importar transação "${transaction.description}":`, {
          error: errorMsg,
          transaction,
          stack: error instanceof Error ? error.stack : undefined,
        })
        results.errors.push(`Erro na linha ${transaction.description}: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      message: "Importação concluída",
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Erro de validação Zod:", error.errors)
      const errorDetails = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ")
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors,
          message: `Campos inválidos: ${errorDetails}`,
        },
        { status: 400 }
      )
    }
    console.error("Erro geral na importação:", error)
    return NextResponse.json({ error: "Erro ao importar transações" }, { status: 500 })
  }
}
