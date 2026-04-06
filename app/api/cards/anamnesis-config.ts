/**
 * API para conectar Anamnese ↔ Cartões
 * ETAPA 4: Fluxo conectado
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
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

    // Buscar cartões do usuário
    const cards = await prisma.card.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' }
    })

    // Buscar transações recentes de cartões
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const cardTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        cardId: { not: null },
        date: { gte: thirtyDaysAgo }
      },
      include: {
        card: { select: { name: true, limit: true } }
      }
    })

    // Análise baseada na anamnese
    const responses = anamnesis.responses as any
    const analysis = analyzeCardsWithAnamnesis(cards, cardTransactions, responses)

    // Recomendações baseadas no perfil
    const recommendations = generateCardRecommendations(cards, cardTransactions, responses)

    return NextResponse.json({
      userProfile: {
        name: anamnesis.name,
        profileType: anamnesis.profileType,
        riskLevel: anamnesis.riskLevel
      },
      cards: cards,
      analysis: analysis,
      recommendations: recommendations,
      transactionsCount: cardTransactions.length,
      configuredAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ Erro ao buscar configuração de cartões:", error)
    return NextResponse.json({ 
      error: "Erro ao carregar configuração de cartões" 
    }, { status: 500 })
  }
}

function analyzeCardsWithAnamnesis(cards: any[], transactions: any[], responses: any) {
  const cardCount = cards.length
  const installmentFrequency = responses.cardsInstallments?.installmentFrequency || "NUNCA"
  const expectedCardCount = responses.cardsInstallments?.cardCount || "0-1"

  // Análise de uso vs perfil
  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const avgTransaction = transactions.length > 0 ? totalSpent / transactions.length : 0

  // Análise de limite
  const totalLimit = cards.reduce((sum, card) => sum + Number(card.limit || 0), 0)
  const totalUsed = cards.reduce((sum, card) => sum + Number(card.usedLimit || 0), 0)
  const limitUsage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

  // Alinhamento com perfil
  const profileAlignment = {
    hasExpectedCardCount: checkCardCountAlignment(cardCount, expectedCardCount),
    installmentFrequencyMatches: installmentFrequency !== "NUNCA",
    riskAlignment: checkRiskAlignment(responses.riskProfile?.investmentProfile, limitUsage),
    spendingPattern: analyzeSpendingPattern(transactions, responses)
  }

  return {
    cardCount,
    totalLimit,
    totalUsed,
    limitUsage,
    avgTransaction,
    profileAlignment,
    riskLevel: getCardRiskLevel(limitUsage, responses.riskProfile?.investmentProfile)
  }
}

function checkCardCountAlignment(actual: number, expected: string): boolean {
  const ranges: { [key: string]: [number, number] } = {
    "0-1": [0, 1],
    "2-3": [2, 3],
    "4-5": [4, 5],
    "+5": [6, Infinity]
  }
  
  const [min, max] = ranges[expected] || [0, 1]
  return actual >= min && actual <= max
}

function checkRiskAlignment(riskProfile: string, limitUsage: number): boolean {
  if (riskProfile === "CONSERVADOR") return limitUsage < 30
  if (riskProfile === "MODERADO") return limitUsage < 50
  if (riskProfile === "AGRESSIVO") return limitUsage < 70
  return limitUsage < 50
}

function analyzeSpendingPattern(transactions: any[], responses: any) {
  const handling = responses.financialBehavior?.moneyHandling || "GASTA_SEM_PLANEJAR"
  
  // Se planeja antes, deve ter menos transações impulsivas
  const impulseTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes('compra') ||
    t.description.toLowerCase().includes('parcela')
  ).length

  const impulseRate = transactions.length > 0 ? (impulseTransactions / transactions.length) * 100 : 0

  return {
    handling,
    impulseRate,
    isAligned: handling === "PLANEJA_ANTES" ? impulseRate < 20 : true
  }
}

function getCardRiskLevel(limitUsage: number, riskProfile: string): string {
  if (limitUsage > 80) return "CRÍTICO"
  if (limitUsage > 60) return "ALTO"
  if (limitUsage > 40) return "MODERADO"
  if (limitUsage > 20) return "BAIXO"
  return "MUITO BAIXO"
}

function generateCardRecommendations(cards: any[], transactions: any[], responses: any): string[] {
  const recommendations: string[] = []
  const analysis = analyzeCardsWithAnamnesis(cards, transactions, responses)

  // Baseado no uso do limite
  if (analysis.limitUsage > 70) {
    recommendations.push("🚨 Seu uso do limite de cartões está muito alto. Considere reduzir gastos.")
  } else if (analysis.limitUsage < 20) {
    recommendations.push("💡 Você usa pouco seu limite de cartões. Isso pode ser bom para controle.")
  }

  // Baseado no alinhamento do perfil
  if (!analysis.profileAlignment.hasExpectedCardCount) {
    recommendations.push("📊 O número de cartões que você tem não corresponde ao seu perfil informado.")
  }

  // Baseado no perfil de risco
  if (responses.riskProfile?.investmentProfile === "CONSERVADOR" && analysis.limitUsage > 40) {
    recommendations.push("🛡️ Como perfil conservador, mantenha o uso do limite abaixo de 40%.")
  }

  // Baseado na frequência de parcelas
  if (responses.cardsInstallments?.installmentFrequency === "FREQUENTEMENTE") {
    recommendations.push("📅 Você parcela com frequência. Cuidado com o comprometimento de renda futura.")
  }

  // Baseado no comportamento
  if (responses.financialBehavior?.moneyHandling === "GASTA_SEM_PLANEJAR") {
    recommendations.push("📋 Tente planejar seus gastos antes de usar o cartão.")
  }

  // Se não tem cartões mas informou que usa
  if (cards.length === 0 && responses.cardsInstallments?.installantFrequency !== "NUNCA") {
    recommendations.push("💳 Você informou que usa cartões, mas não tem nenhum cadastrado. Cadastre seus cartões!")
  }

  return recommendations
}
