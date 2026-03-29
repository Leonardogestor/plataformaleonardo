/**
 * Script para corrigir valores de transações que foram importados com formatação incorreta
 * Executar: npx tsx scripts/fix-transaction-values.ts
 */

import { prisma } from '../lib/db'

async function fixTransactionValues() {
  console.log('🔧 Iniciando correção de valores de transações...')
  
  try {
    // Buscar todas as transações com valores suspeitos (muito grandes)
    const suspiciousTransactions = await prisma.transaction.findMany({
      where: {
        amount: {
          gte: 1000000 // Valores maiores que 1 milhão
        }
      },
      select: {
        id: true,
        amount: true,
        description: true,
        userId: true
      }
    })

    console.log(`📊 Encontradas ${suspiciousTransactions.length} transações suspeitas`)

    let fixedCount = 0
    let errorCount = 0

    for (const transaction of suspiciousTransactions) {
      try {
        // Se o valor for muito grande, provavelmente precisa ser corrigido
        const originalAmount = transaction.amount
        let correctedAmount = originalAmount

        // Tentar identificar se é um valor que precisa ser corrigido
        // Ex: 14022026 -> 140.22 (dividir por 100)
        // Ex: 27506194833 -> 27506.19 (dividir por 1000000)
        
        if (originalAmount > 100000000) {
          // Valores muito grandes, provavelmente precisam dividir por 1M
          correctedAmount = originalAmount / 1000000
        } else if (originalAmount > 1000000) {
          // Valores grandes, provavelmente precisam dividir por 100
          correctedAmount = originalAmount / 100
        }

        // Só atualizar se a correção for significativa
        if (correctedAmount !== originalAmount && correctedAmount < 100000) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { amount: correctedAmount }
          })

          console.log(`✅ Corrigido: ID ${transaction.id}`)
          console.log(`   Descrição: ${transaction.description}`)
          console.log(`   Valor original: R$ ${originalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
          console.log(`   Valor corrigido: R$ ${correctedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
          console.log('')

          fixedCount++
        }
      } catch (error) {
        console.error(`❌ Erro ao corrigir transação ${transaction.id}:`, error)
        errorCount++
      }
    }

    console.log(`🎉 Correção concluída!`)
    console.log(`✅ Transações corrigidas: ${fixedCount}`)
    console.log(`❌ Erros: ${errorCount}`)

    // Atualizar saldos das contas
    console.log('\n🔄 Atualizando saldos das contas...')
    
    const accounts = await prisma.account.findMany({
      include: {
        transactions: {
          select: {
            amount: true,
            type: true
          }
        }
      }
    })

    for (const account of accounts) {
      const correctBalance = account.transactions.reduce((balance, transaction) => {
        return balance + (transaction.type === 'INCOME' ? transaction.amount : -transaction.amount)
      }, 0)

      if (account.balance !== correctBalance) {
        await prisma.account.update({
          where: { id: account.id },
          data: { balance: correctBalance }
        })

        console.log(`💰 Saldo atualizado: Conta ${account.name}`)
        console.log(`   Saldo anterior: R$ ${account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
        console.log(`   Saldo corrigido: R$ ${correctBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      }
    }

    console.log('\n✨ Todos os valores foram corrigidos com sucesso!')

  } catch (error) {
    console.error('❌ Erro durante a correção:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a correção
fixTransactionValues()
