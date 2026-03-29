import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Endpoint de debug completo para transações
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 DEBUG: Buscando transações do usuário:", session.user.id)

    // 1. Buscar transações direto do Prisma
    const directTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        amount: true,
        description: true,
        type: true,
        category: true,
        date: true,
      },
      orderBy: { date: "desc" },
      take: 10,
    })

    console.log(`📊 DEBUG: Encontradas ${directTransactions.length} transações diretas`)

    // 2. Testar API de transações normal
    const apiTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      include: {
        account: { select: { name: true, institution: true } },
        card: { select: { name: true, brand: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    })

    console.log(`📋 DEBUG: API retornou ${apiTransactions.length} transações`)

    // 3. Verificar contas
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      },
    })

    console.log(`💰 DEBUG: Encontradas ${accounts.length} contas`)

    // 4. Calcular métricas
    const income = directTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = directTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const debug: {
      user: string
      timestamp: string
      checks: any
      samples: any
      issues: string[]
      recommendations: string[]
    } = {
      user: session.user.id,
      timestamp: new Date().toISOString(),
      checks: {
        directTransactionsCount: directTransactions.length,
        apiTransactionsCount: apiTransactions.length,
        accountsCount: accounts.length,
        totalIncome: income,
        totalExpenses: expenses,
        netResult: income - expenses,
      },
      samples: {
        transactions: directTransactions.slice(0, 3).map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type,
          date: t.date,
        })),
        accounts: accounts.slice(0, 3).map((a) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance),
          type: a.type,
        })),
      },
      issues: [],
      recommendations: [],
    }

    // Identificar problemas
    if (directTransactions.length === 0) {
      debug.issues.push("Nenhuma transação encontrada no banco")
      debug.recommendations.push("Importe transações ou cadastre manualmente")
    }

    if (accounts.length === 0) {
      debug.issues.push("Nenhuma conta encontrada")
      debug.recommendations.push("Crie contas bancárias")
    }

    if (income === 0 && expenses === 0 && directTransactions.length > 0) {
      debug.issues.push("Transações encontradas mas valores zerados")
      debug.recommendations.push("Verifique se os valores estão corretos no banco")
    }

    console.log("✅ DEBUG: Diagnóstico concluído:", debug.checks)

    return NextResponse.json(debug)
  } catch (error) {
    console.error("❌ DEBUG: Erro no diagnóstico:", error)
    return NextResponse.json(
      { error: "Erro no debug", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
