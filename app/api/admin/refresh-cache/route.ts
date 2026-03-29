import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Endpoint para forçar atualização de dados e limpar cache
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log('🔄 Forçando atualização de cache...')

    // Buscar dados atualizados para garantir que estão no banco
    const transactionsCount = await prisma.transaction.count({
      where: { userId: session.user.id }
    })

    const accountsCount = await prisma.account.count({
      where: { userId: session.user.id }
    })

    const investmentsCount = await prisma.investment.count({
      where: { userId: session.user.id }
    })

    // Forçar atualização dos saldos das contas
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      include: {
        transactions: {
          select: {
            amount: true,
            type: true
          }
        }
      }
    })

    let updatedAccounts = 0
    for (const account of accounts) {
      const correctBalance = account.transactions.reduce((balance, transaction) => {
        const amount = Number(transaction.amount)
        return balance + (transaction.type === 'INCOME' ? amount : -amount)
      }, 0)

      const currentBalance = Number(account.balance)
      if (Math.abs(currentBalance - correctBalance) > 0.01) {
        await prisma.account.update({
          where: { id: account.id },
          data: { balance: correctBalance }
        })
        updatedAccounts++
      }
    }

    const result = {
      message: "Cache refresh completed",
      data: {
        transactionsCount,
        accountsCount,
        investmentsCount,
        accountsUpdated: updatedAccounts
      },
      timestamp: new Date().toISOString(),
      nextSteps: [
        "1. Limpe o cache do navegador (Ctrl+F5)",
        "2. Recarregue a página do dashboard",
        "3. Verifique se os valores aparecem corretamente"
      ]
    }

    console.log('✅ Cache refresh concluído:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erro ao atualizar cache:', error)
    return NextResponse.json(
      { error: "Erro ao atualizar cache", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
