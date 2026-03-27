import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    // Calculate previous month balance
    let saldo_anterior = 0

    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)

      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        // Get previous month
        let prevMonth = monthNum - 1
        let prevYear = yearNum

        if (prevMonth < 1) {
          prevMonth = 12
          prevYear = yearNum - 1
        }

        // Calculate balance up to previous month
        const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59)

        const transactions = await prisma.transaction.findMany({
          where: {
            userId: session.user.id,
            date: {
              lte: prevMonthEnd,
            },
          },
        })

        // Calculate balance (income - expenses)
        saldo_anterior = transactions.reduce((balance, transaction) => {
          const amount = Number(transaction.amount)
          if (transaction.type === "INCOME") {
            return balance + amount
          } else if (transaction.type === "EXPENSE") {
            return balance - amount
          }
          return balance
        }, 0)
      }
    }

    return NextResponse.json({
      saldo_anterior,
    })
  } catch (error) {
    console.error("Error fetching balance:", error)
    return NextResponse.json({ error: "Erro ao buscar saldo" }, { status: 500 })
  }
}
