import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Endpoint para corrigir valores de transações importados incorretamente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar se é admin (você pode ajustar essa lógica)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("🔧 Iniciando correção de valores de transações...")

    // Buscar todas as transações com valores suspeitos (muito grandes)
    const suspiciousTransactions = await prisma.transaction.findMany({
      where: {
        amount: {
          gte: 1000000, // Valores maiores que 1 milhão
        },
      },
      select: {
        id: true,
        amount: true,
        description: true,
        userId: true,
      },
    })

    console.log(`📊 Encontradas ${suspiciousTransactions.length} transações suspeitas`)

    let fixedCount = 0
    let errorCount = 0
    const fixedTransactions: any[] = []

    for (const transaction of suspiciousTransactions) {
      try {
        const originalAmount = Number(transaction.amount)
        let correctedAmount = originalAmount

        // Lógica de correção baseada nos exemplos do erro
        if (originalAmount >= 100000000) {
          // Valores muito grandes, provavelmente precisam dividir por 1000000
          correctedAmount = originalAmount / 1000000
        } else if (originalAmount >= 1000000) {
          // Valores grandes, provavelmente precisam dividir por 100
          correctedAmount = originalAmount / 100
        }

        // Só atualizar se a correção for significativa e resultar em valor razoável
        if (correctedAmount !== originalAmount && correctedAmount < 100000 && correctedAmount > 0) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { amount: correctedAmount },
          })

          fixedTransactions.push({
            id: transaction.id,
            description: transaction.description,
            originalAmount,
            correctedAmount,
          })

          console.log(`✅ Corrigido: ID ${transaction.id} - ${transaction.description}`)
          console.log(`   Valor original: R$ ${originalAmount.toLocaleString("pt-BR")}`)
          console.log(`   Valor corrigido: R$ ${correctedAmount.toLocaleString("pt-BR")}`)

          fixedCount++
        }
      } catch (error) {
        console.error(`❌ Erro ao corrigir transação ${transaction.id}:`, error)
        errorCount++
      }
    }

    // Atualizar saldos das contas afetadas
    console.log("\n🔄 Atualizando saldos das contas...")

    const updatedAccounts: any[] = []

    // Buscar contas que têm transações corrigidas
    const affectedUserIds = [...new Set(fixedTransactions.map((t) => t.userId))]

    for (const userId of affectedUserIds) {
      const accounts = await prisma.account.findMany({
        where: { userId },
        include: {
          transactions: {
            select: {
              amount: true,
              type: true,
            },
          },
        },
      })

      for (const account of accounts) {
        const correctBalance = account.transactions.reduce((balance, transaction) => {
          const amount = Number(transaction.amount)
          return balance + (transaction.type === "INCOME" ? amount : -amount)
        }, 0)

        const currentBalance = Number(account.balance)
        if (Math.abs(currentBalance - correctBalance) > 0.01) {
          // Diferença significativa
          await prisma.account.update({
            where: { id: account.id },
            data: { balance: correctBalance },
          })

          updatedAccounts.push({
            id: account.id,
            name: account.name,
            oldBalance: currentBalance,
            newBalance: correctBalance,
          })

          console.log(`💰 Saldo atualizado: Conta ${account.name}`)
          console.log(`   Saldo anterior: R$ ${currentBalance.toLocaleString("pt-BR")}`)
          console.log(`   Saldo corrigido: R$ ${correctBalance.toLocaleString("pt-BR")}`)
        }
      }
    }

    const result = {
      message: "Correção concluída com sucesso",
      summary: {
        suspiciousFound: suspiciousTransactions.length,
        transactionsFixed: fixedCount,
        errors: errorCount,
        accountsUpdated: updatedAccounts.length,
      },
      fixedTransactions: fixedTransactions.slice(0, 10), // Limitar para resposta
      updatedAccounts: updatedAccounts.slice(0, 10),
    }

    console.log(`🎉 Correção concluída!`)
    console.log(`✅ Transações corrigidas: ${fixedCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    console.log(`💰 Contas atualizadas: ${updatedAccounts.length}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Erro durante a correção:", error)
    return NextResponse.json(
      {
        error: "Erro ao corrigir valores",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
