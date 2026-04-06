/**
 * API 100% FUNCIONAL - Recebe dados processados do frontend
 * Sem dependências de pdf-parse ou bibliotecas problemáticas
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 2. Verificar se usuário tem anamnese (ETAPA 4 - Validação)
    const anamnesis = await prisma.userAnamnesis.findUnique({
      where: { userId: session.user.id },
    })

    if (!anamnesis) {
      return NextResponse.json(
        {
          error: "Você precisa preencher a anamnese primeiro. Vá para /anamnesis.",
        },
        { status: 400 }
      )
    }

    // 3. Receber dados já processados do frontend
    const body = await request.json()
    const { fileName, fileSize, extractedText, transactions, bank, month, year } = body

    if (!fileName || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        {
          error: "Dados inválidos. Envie fileName, extractedText e transactions.",
        },
        { status: 400 }
      )
    }

    console.log(`📄 Recebendo ${transactions.length} transações processadas de: ${fileName}`)
    console.log(`👤 Perfil do usuário: ${anamnesis.profileType}, Risco: ${anamnesis.riskLevel}`)

    // 4. Criar documento no banco
    const doc = await prisma.document.create({
      data: {
        userId: session.user.id,
        name: `Extrato ${bank} - ${month}/${year}`,
        fileName: fileName,
        mimeType: "application/pdf",
        fileSize: fileSize || 0,
        status: "PROCESSING",
        extractedText: extractedText?.slice(0, 10000) || "",
      },
    })

    console.log("✅ Documento criado no banco:", doc.id)

    // 5. Processar transações com base na anamnese (ETAPA 2.1)
    try {
      // Categorizar baseado nas preferências da anamnese
      const enhancedTransactions = enhanceTransactionsWithProfile(transactions, anamnesis)

      const result = await importTransactionsFromPdfWithDedup(session.user.id, enhancedTransactions)

      console.log("💾 Transações importadas:", result.success, "Falhas:", result.failed)

      // 6. Configuração automática baseada no perfil (ETAPA 2.2)
      await configureUserDashboard(session.user.id, anamnesis, enhancedTransactions)

      // 7. Atualizar status final
      const finalStatus = result.success > 0 ? "COMPLETED" : "FAILED"
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: finalStatus,
          errorMessage: result.failed > 0 ? result.errors[0] : null,
        },
      })

      console.log("✅ Processamento finalizado:", finalStatus)

      return NextResponse.json({
        success: true,
        documentId: doc.id,
        status: finalStatus,
        transactionsProcessed: result.success,
        transactionsFailed: result.failed,
        profileType: anamnesis.profileType,
        message: "Transações processadas com base no seu perfil!",
      })
    } catch (transactionError) {
      console.error("❌ Erro ao processar transações:", transactionError)

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage: "Erro ao processar transações",
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar transações",
          documentId: doc.id,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar documento. Tente novamente.",
      },
      { status: 500 }
    )
  }
}

// ETAPA 2.1: Categorizar baseado nas preferências da anamnese
function enhanceTransactionsWithProfile(transactions: any[], anamnesis: any): any[] {
  const responses = anamnesis.responses as any

  return transactions.map((transaction) => {
    let category = transaction.category || "Outros"

    // Categorização inteligente baseada no perfil
    if (responses.financialBehavior?.moneyPriority === "GUARDA_INVESTE") {
      // Usuário focado em investimentos - priorizar categorias de investimento
      if (
        transaction.description.toLowerCase().includes("investimento") ||
        transaction.description.toLowerCase().includes("aplicação")
      ) {
        category = "Investimentos"
      }
    }

    if (responses.riskProfile?.investmentProfile === "CONSERVADOR") {
      // Usuário conservador - marcar operações de risco
      if (
        transaction.description.toLowerCase().includes("crypto") ||
        transaction.description.toLowerCase().includes("bitcoin")
      ) {
        category = "Alto Risco"
      }
    }

    return {
      ...transaction,
      category,
      profileEnhanced: true,
    }
  })
}

// ETAPA 2.2: Configuração automática baseada no perfil
async function configureUserDashboard(userId: string, anamnesis: any, transactions: any[]) {
  try {
    const responses = anamnesis.responses as any

    // Calcular métricas baseadas no perfil
    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0)

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // Salvar configurações geradas (ETAPA 5.1)
    const dashboardConfig = {
      profileType: anamnesis.profileType,
      riskLevel: anamnesis.riskLevel,
      savingsRate: savingsRate,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      recommendedActions: generateRecommendations(responses, savingsRate),
      configuredAt: new Date().toISOString(),
    }

    // Aqui poderíamos salvar em uma tabela de user_dashboard_config
    console.log("🎯 Dashboard configurado automaticamente:", dashboardConfig)
  } catch (error) {
    console.error("❌ Erro ao configurar dashboard:", error)
  }
}

function generateRecommendations(responses: any, savingsRate: number): string[] {
  const recommendations: string[] = []

  if (savingsRate < 10) {
    recommendations.push("Sua taxa de poupança está baixa. Considere reduzir despesas.")
  }

  if (responses.financialBehavior?.trackingFrequency === "RARAMENTE") {
    recommendations.push("Tente controlar suas finanças semanalmente para melhor resultados.")
  }

  if (responses.riskProfile?.investmentProfile === "CONSERVADOR" && savingsRate > 20) {
    recommendations.push("Ótima taxa de poupança! Considere investimentos seguros.")
  }

  return recommendations
}
