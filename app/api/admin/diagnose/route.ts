import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Endpoint para diagnóstico completo dos dados
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔍 Iniciando diagnóstico completo...')

    // 1. Verificar transações do usuário
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        amount: true,
        description: true,
        type: true,
        category: true,
        date: true,
      },
      orderBy: { date: 'desc' },
      take: 10
    })

    // 2. Verificar contas do usuário
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      }
    })

    // 3. Calcular métricas financeiras
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // 4. Verificar valores suspeitos
    const suspiciousTransactions = transactions.filter(t => Number(t.amount) > 1000000)

    const diagnosis = {
      user: session.user.id,
      timestamp: new Date().toISOString(),
      data: {
        transactions: {
          total: transactions.length,
          suspicious: suspiciousTransactions.length,
          recent: transactions.map(t => ({
            id: t.id,
            description: t.description,
            amount: Number(t.amount),
            type: t.type,
            date: t.date
          }))
        },
        accounts: {
          total: accounts.length,
          list: accounts.map(a => ({
            id: a.id,
            name: a.name,
            balance: Number(a.balance),
            type: a.type
          }))
        },
        metrics: {
          totalIncome: income,
          totalExpenses: expenses,
          netResult: income - expenses,
          totalBalance,
          savingsRate: income > 0 ? (income - expenses) / income : 0
        }
      },
      issues: [],
      recommendations: []
    }

    // Identificar problemas
    if (suspiciousTransactions.length > 0) {
      diagnosis.issues.push(`Encontradas ${suspiciousTransactions.length} transações com valores suspeitos (> 1M)`)
      diagnosis.recommendations.push('Execute POST /api/admin/fix-transaction-values para corrigir')
    }

    if (totalBalance <= 0 && transactions.length > 0) {
      diagnosis.issues.push('Saldo total inconsistente com transações')
      diagnosis.recommendations.push('Execute POST /api/admin/refresh-cache para atualizar')
    }

    if (transactions.length === 0) {
      diagnosis.issues.push('Nenhuma transação encontrada')
      diagnosis.recommendations.push('Importe transações ou cadastre manualmente')
    }

    console.log('✅ Diagnóstico concluído:', {
      transactions: transactions.length,
      accounts: accounts.length,
      issues: diagnosis.issues.length
    })

    return NextResponse.json(diagnosis)

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error)
    return NextResponse.json(
      { error: "Erro no diagnóstico", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
