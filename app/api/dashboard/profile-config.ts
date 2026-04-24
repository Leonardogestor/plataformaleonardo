/**
 * API para configurar dashboard baseado no perfil do usuário
 * ETAPA 3: Dashboard inteligente baseado em dados reais
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar anamnese do usuário
    const anamnesis = await prisma.userAnamnesis.findUnique({
      where: { userId: session.user.id }
    })

    if (!anamnesis) {
      return NextResponse.json({ 
        error: "Anamnese não encontrada. Preencha primeiro." 
      }, { status: 404 })
    }

    // Buscar transações recentes
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' }
    })

    // Calcular métricas baseadas em dados reais
    const totalIncome = transactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0)
      
    const totalExpenses = transactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0)
      
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // Gerar insights baseados no perfil + dados reais
    const insights = generateInsights(anamnesis, transactions, savingsRate)

    // Configuração personalizada do dashboard
    const dashboardConfig = {
      userProfile: {
        name: anamnesis.name,
        profileType: anamnesis.profileType,
        riskLevel: anamnesis.riskLevel,
        completedAt: anamnesis.createdAt
      },
      realData: {
        totalIncome,
        totalExpenses,
        savingsRate,
        transactionCount: transactions.length,
        period: "Últimos 30 dias"
      },
      insights: insights,
      recommendations: insights.recommendations,
      healthScore: calculateHealthScore(anamnesis, savingsRate, transactions),
      configuredAt: new Date().toISOString()
    }

    return NextResponse.json(dashboardConfig)

  } catch (error) {
    console.error("❌ Erro ao buscar configuração do dashboard:", error)
    return NextResponse.json({ 
      error: "Erro ao carregar configuração do dashboard" 
    }, { status: 500 })
  }
}

function generateInsights(anamnesis: any, transactions: any[], savingsRate: number) {
  const responses = anamnesis.responses as any
  
  // Análise de padrões vs anamnese
  const insights = {
    spendingPattern: analyzeSpendingPattern(transactions, responses),
    savingsAnalysis: analyzeSavings(savingsRate, responses),
    riskAlignment: analyzeRiskAlignment(transactions, responses),
    recommendations: generateSmartRecommendations(responses, savingsRate, transactions),
    goalsProgress: analyzeGoalsProgress(anamnesis, transactions)
  }

  return insights
}

function analyzeSpendingPattern(transactions: any[], responses: any) {
  const expensesByCategory = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})

  const biggestExpense = Object.entries(expensesByCategory)
    .sort(([,a], [,b]) => Number(b) - Number(a))[0]

  return {
    categories: expensesByCategory,
    biggestCategory: biggestExpense ? biggestExpense[0] : "N/A",
    biggestAmount: biggestExpense ? Number(biggestExpense[1]) : 0,
    pattern: responses.financialBehavior?.moneyHandling || "Não identificado"
  }
}

function analyzeSavings(savingsRate: number, responses: any) {
  let status = "RUIM"
  if (savingsRate >= 20) status = "EXCELENTE"
  else if (savingsRate >= 10) status = "BOM"
  else if (savingsRate >= 5) status = "REGULAR"

  return {
    currentRate: savingsRate,
    status: status,
    recommendedRate: getRecommendedSavingsRate(responses),
    gap: Math.max(0, getRecommendedSavingsRate(responses) - savingsRate)
  }
}

function getRecommendedSavingsRate(responses: any): number {
  const profile = responses.riskProfile?.investmentProfile
  if (profile === "CONSERVADOR") return 25
  if (profile === "MODERADO") return 20
  if (profile === "AGRESSIVO") return 15
  return 20
}

function analyzeRiskAlignment(transactions: any[], responses: any) {
  const riskyTransactions = transactions.filter(t => 
    t.category?.includes("Alto Risco") || 
    t.description?.toLowerCase().includes("crypto") ||
    t.description?.toLowerCase().includes("bitcoin")
  )

  const userRiskProfile = responses.riskProfile?.investmentProfile
  const hasHighRiskExposure = riskyTransactions.length > 0

  return {
    userProfile: userRiskProfile,
    hasHighRiskExposure,
    riskyTransactionsCount: riskyTransactions.length,
    aligned: !hasHighRiskExposure || userRiskProfile === "AGRESSIVO"
  }
}

function generateSmartRecommendations(responses: any, savingsRate: number, transactions: any[]): string[] {
  const recommendations: string[] = []

  // Baseado na taxa de poupança
  if (savingsRate < 5) {
    recommendations.push("🚨 Sua taxa de poupança está crítica. Reduza despesas imediatamente.")
  } else if (savingsRate < 10) {
    recommendations.push("📊 Sua taxa de poupança está abaixo do ideal. Revise seus gastos.")
  } else if (savingsRate > 30) {
    recommendations.push("🎯 Excelente taxa de poupança! Considere investir o excedente.")
  }

  // Baseado no comportamento
  if (responses.financialBehavior?.trackingFrequency === "RARAMENTE") {
    recommendations.push("📅 Acompanhe suas finanças semanalmente para melhores resultados.")
  }

  // Baseado no perfil de risco
  if (responses.riskProfile?.investmentProfile === "CONSERVADOR") {
    recommendations.push("🛡️ Prefira investimentos seguros como Tesouro e CDBs.")
  } else if (responses.riskProfile?.investmentProfile === "AGRESSIVO") {
    recommendations.push("🚀 Você pode diversificar com ações e criptomoedas.")
  }

  // Baseado nas transações
  const hasRecurringExpenses = transactions.some(t => 
    t.description?.toLowerCase().includes("netflix") ||
    t.description?.toLowerCase().includes("spotify") ||
    t.description?.toLowerCase().includes("assinatura")
  )

  if (hasRecurringExpenses) {
    recommendations.push("📱 Revise suas assinaturas mensais. Algumas podem ser desnecessárias.")
  }

  return recommendations
}

function analyzeGoalsProgress(anamnesis: any, transactions: any[]) {
  const responses = anamnesis.responses as any
  const goals = responses.objectives?.goals || []

  // Simulação de progresso baseada na taxa de poupança atual
  const savingsRate = transactions.length > 0 ? 
    ((transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + Number(t.amount), 0) -
     transactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + Number(t.amount), 0)) /
     transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + Number(t.amount), 0)) * 100 : 0

  return goals.map((goal: string) => ({
    goal: goal,
    estimatedProgress: Math.min(100, savingsRate * 2), // Simulação simples
    onTrack: savingsRate >= 10
  }))
}

function calculateHealthScore(anamnesis: any, savingsRate: number, _transactions: any[]): number {
  let score = 0

  // Taxa de poupança (40 pontos)
  if (savingsRate >= 25) score += 40
  else if (savingsRate >= 15) score += 30
  else if (savingsRate >= 10) score += 20
  else if (savingsRate >= 5) score += 10

  // Controle financeiro (30 pontos)
  const responses = anamnesis.responses as any
  if (responses.financialBehavior?.trackingFrequency === "TODA_SEMANA") score += 30
  else if (responses.financialBehavior?.trackingFrequency === "MENSAL") score += 20
  else if (responses.financialBehavior?.trackingFrequency === "RARAMENTE") score += 5

  // Situação financeira (20 pontos)
  if (responses.financialContext?.financialSituation === "ORGANIZADA") score += 20
  else if (responses.financialContext?.financialSituation === "DESORGANIZADA") score += 10

  // Dívidas (10 pontos)
  if (responses.financialContext?.hasDebts === "NAO") score += 10
  else if (responses.financialContext?.hasDebts === "SIM_CONTROLE") score += 5

  return Math.min(100, score)
}
