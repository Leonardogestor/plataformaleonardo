import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  amount: z.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição é obrigatória"),
  date: z.string().datetime(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  isPending: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "50")
    const search = searchParams.get("search") ?? ""
    const category = searchParams.get("category") ?? ""
    const subcategory = searchParams.get("subcategory") ?? ""
    const accountId = searchParams.get("accountId") ?? ""
    const type = searchParams.get("type") ?? ""
    const startDate = searchParams.get("startDate") ?? ""
    const endDate = searchParams.get("endDate") ?? ""
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const where: {
      userId: string
      description?: { contains: string; mode: "insensitive" }
      category?: string
      subcategory?: string
      accountId?: string
      type?: "INCOME" | "EXPENSE" | "TRANSFER"
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }

    // Filter by month/year if provided
    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        const startDateObj = new Date(yearNum, monthNum - 1, 1)
        const endDateObj = new Date(yearNum, monthNum, 0, 23, 59, 59)
        where.date = {
          gte: startDateObj,
          lte: endDateObj,
        }
      }
    }

    if (search) {
      where.description = { contains: search, mode: "insensitive" }
    }
    if (category) {
      where.category = category
    }
    if (subcategory) {
      where.subcategory = subcategory
    }
    if (accountId) {
      where.accountId = accountId
    }
    if (type && (type === "INCOME" || type === "EXPENSE" || type === "TRANSFER")) {
      where.type = type
    }
    if (startDate || endDate) {
      where.date = where.date || {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const skip = (page - 1) * limit

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { name: true, institution: true } },
          card: { select: { name: true, brand: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    // Add status classification (Farol Strategy) based on savings rate
    const transactionsWithStatus = transactions.map((transaction) => {
      let status: "green" | "yellow" | "red" = "green"

      // Map old types to new strict financial system
      let newType: "income" | "expense" | "investment" | "investment_withdraw" = "expense"
      let amount = Number(transaction.amount)

      if (transaction.type === "INCOME") {
        newType = "income"
        // Income is always positive
        amount = Math.abs(amount)
      } else if (transaction.type === "EXPENSE") {
        newType = "expense"
        // Expenses are always negative in database
        amount = -Math.abs(amount)
        // Farol classification for expenses
        if (Math.abs(amount) > 5000) {
          status = "red"
        } else if (Math.abs(amount) > 2000) {
          status = "yellow"
        }
      } else if (transaction.type === "TRANSFER") {
        // Treat transfers as expenses for now (can be enhanced)
        newType = "expense"
        amount = -Math.abs(amount)
        if (Math.abs(amount) > 3000) {
          status = "yellow"
        }
      }

      return {
        ...transaction,
        type: newType,
        amount,
        status,
      }
    })

    return NextResponse.json(transactionsWithStatus)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Erro ao buscar transações" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const data = transactionSchema.parse(body)

    const transaction = await prisma.transaction.create({
      data: {
        type: data.type,
        category: data.category,
        subcategory: data.subcategory ?? null,
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        userId: session.user.id,
        accountId: data.accountId ?? null,
        cardId: data.cardId ?? null,
        isPending: data.isPending ?? null,
      },
      include: {
        account: { select: { name: true } },
        card: { select: { name: true } },
      },
    })

    // Atualizar saldo da conta se houver
    if (data.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: data.accountId },
      })

      if (account) {
        const balanceChange = data.type === "INCOME" ? data.amount : -data.amount
        await prisma.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 })
  }
}
