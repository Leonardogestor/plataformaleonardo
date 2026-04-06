/**
 * API para conectar Anamnese ↔ Metas
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

    // Buscar metas existentes
    const existingGoals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: { targetDate: 'asc' }
    })

    // Buscar transações recentes para calcular progresso
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: thirtyDaysAgo }
      }
    })

    // Extrair metas da anamnese
    const responses = anamnesis.responses as any
    const anamnesisGoals = responses.objectives?.goals || []

    // Criar/atualizar metas baseadas na anamnese
    const syncedGoals = await syncGoalsFromAnamnesis(
      session.user.id, 
      anamnesisGoals, 
      existingGoals
    )

    // Calcular progresso real das metas
    const goalsWithProgress = await calculateGoalsProgress(
      syncedGoals,
      transactions,
      responses
    )

    // Gerar recomendações baseadas no progresso
    const recommendations = generateGoalsRecommendations(
      goalsWithProgress,
      responses,
      transactions
    )

    return NextResponse.json({
      userProfile: {
        name: anamnesis.name,
        profileType: anamnesis.profileType,
        riskLevel: anamnesis.riskLevel
      },
      goals: goalsWithProgress,
      recommendations: recommendations,
      anamnesisGoals: anamnesisGoals,
      syncedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ Erro ao buscar metas da anamnese:", error)
    return NextResponse.json({ 
      error: "Erro ao carregar metas" 
    }, { status: 500 })
  }
}

async function syncGoalsFromAnamnesis(
  userId: string, 
  anamnesisGoals: string[], 
  existingGoals: any[]
) {
  const syncedGoals = []

  // Para cada meta da anamnese
  for (const goalText of anamnesisGoals) {
    // Verificar se já existe
    const existing = existingGoals.find(g => 
      g.name.toLowerCase().includes(goalText.toLowerCase()) ||
      goalText.toLowerCase().includes(g.name.toLowerCase())
    )

    if (existing) {
      // Atualizar se existir
      const updated = await prisma.goal.update({
        where: { id: existing.id },
        data: {
          // Manter dados existentes mas marcar como sincronizado
          anamnesisSynced: true,
          updatedAt: new Date()
        }
      })
      syncedGoals.push(updated)
    } else {
      // Criar nova se não existir
      const newGoal = await prisma.goal.create({
        data: {
          userId: userId,
          name: goalText,
          targetAmount: estimateGoalAmount(goalText),
          currentAmount: 0,
          targetDate: estimateGoalDate(goalText),
          category: getGoalCategory(goalText),
          priority: "MEDIUM",
          status: "ACTIVE",
          anamnesisSynced: true
        }
      })
      syncedGoals.push(newGoal)
    }
  }

  return syncedGoals
}

function estimateGoalAmount(goalText: string): number {
  const text = goalText.toLowerCase()
  
  // Estimativas baseadas em palavras-chave
  if (text.includes('casa') || text.includes('imóvel')) return 500000
  if (text.includes('carro') || text.includes('veículo')) return 50000
  if (text.includes('aposentadoria')) return 1000000
  if (text.includes('faculdade') || text.includes('estudo')) return 50000
  if (text.includes('viagem')) return 20000
  if (text.includes('emergência') || text.includes('reserva')) return 30000
  if (text.includes('investimento')) return 100000
  
  return 50000 // Padrão
}

function estimateGoalDate(goalText: string): Date {
  const text = goalText.toLowerCase()
  const now = new Date()
  
  // Estimativas baseadas em palavras-chave
  if (text.includes('curto') || text.includes('breve')) {
    now.setMonth(now.getMonth() + 6)
  } else if (text.includes('médio')) {
    now.setFullYear(now.getFullYear() + 2)
  } else if (text.includes('longo') || text.includes('aposentadoria')) {
    now.setFullYear(now.getFullYear() + 10)
  } else if (text.includes('ano')) {
    now.setFullYear(now.getFullYear() + 1)
  } else {
    now.setFullYear(now.getFullYear() + 3) // Padrão 3 anos
  }
  
  return now
}

function getGoalCategory(goalText: string): string {
  const text = goalText.toLowerCase()
  
  if (text.includes('casa') || text.includes('imóvel')) return "Imóveis"
  if (text.includes('carro') || text.includes('veículo')) return "Veículos"
  if (text.includes('aposentadoria')) return "Aposentadoria"
  if (text.includes('faculdade') || text.includes('estudo')) return "Educação"
  if (text.includes('viagem')) return "Lazer"
  if (text.includes('emergência') || text.includes('reserva')) return "Segurança"
  if (text.includes('investimento')) return "Investimentos"
  
  return "Outros"
}

async function calculateGoalsProgress(
  goals: any[], 
  transactions: any[], 
  responses: any
) {
  // Calcular taxa de poupança real
  const totalIncome = transactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const totalExpenses = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const monthlySavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (monthlySavings / totalIncome) * 100 : 0

  // Calcular progresso para cada meta
  const goalsWithProgress = goals.map(goal => {
    const monthsRemaining = Math.max(1, 
      Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))
    )
    
    // Projeção baseada na poupança atual
    const projectedSavings = monthlySavings * monthsRemaining
    const projectedProgress = Math.min(100, (projectedSavings / Number(goal.targetAmount)) * 100)
    
    // Progresso real (baseado no que já foi economizado)
    const realProgress = Number(goal.targetAmount) > 0 
      ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 
      : 0

    // Análise de viabilidade baseada no perfil
    const viability = analyzeGoalViability(goal, responses, savingsRate, projectedProgress)

    return {
      ...goal,
      progress: {
        real: realProgress,
        projected: projectedProgress,
        monthlySavings,
        monthsRemaining,
        onTrack: projectedProgress >= 100 || realProgress > 0
      },
      viability
    }
  })

  return goalsWithProgress
}

function analyzeGoalViability(goal: any, responses: any, savingsRate: number, projectedProgress: number) {
  const riskProfile = responses.riskProfile?.investmentProfile
  const moneyPriority = responses.financialBehavior?.moneyPriority
  
  let viability = "POSSÍVEL"
  let factors = []

  // Baseado na taxa de poupança
  if (savingsRate < 5) {
    viability = "DIFÍCIL"
    factors.push("Baixa taxa de poupança")
  } else if (savingsRate < 15) {
    viability = "DESAFIADOR"
    factors.push("Taxa de poupança moderada")
  }

  // Baseado no perfil de risco
  if (goal.category === "Investimentos" && riskProfile === "CONSERVADOR") {
    viability = "DIFÍCIL"
    factors.push("Perfil conservador para meta de investimento")
  }

  // Baseado na prioridade de dinheiro
  if (moneyPriority !== "GUARDA_INVESTE" && goal.category !== "Segurança") {
    factors.push("Prioridade não focada em poupança")
  }

  // Baseado na projeção
  if (projectedProgress < 50) {
    viability = "MUITO DIFÍCIL"
    factors.push("Projeção indica não alcançar meta")
  } else if (projectedProgress >= 100) {
    viability = "FÁCIL"
    factors.push("Projeção indica meta alcançável")
  }

  return { viability, factors }
}

function generateGoalsRecommendations(
  goalsWithProgress: any[], 
  responses: any, 
  transactions: any[]
) {
  const recommendations: string[] = []

  // Análise geral das metas
  const totalGoals = goalsWithProgress.length
  const onTrackGoals = goalsWithProgress.filter(g => g.progress.onTrack).length
  const difficultGoals = goalsWithProgress.filter(g => g.viability.viability.includes("DIFÍCIL")).length

  if (totalGoals === 0) {
    recommendations.push("🎯 Você não tem metas definidas. Defina metas para ter direção financeira!")
    return recommendations
  }

  // Baseado no progresso geral
  if (onTrackGoals === totalGoals) {
    recommendations.push("🎉 Excelente! Todas suas metas estão no caminho certo.")
  } else if (onTrackGoals / totalGoals >= 0.7) {
    recommendations.push("👍 Boa parte das suas metas estão bem encaminhadas.")
  } else {
    recommendations.push("⚠️ Muitas das suas metas precisam de atenção. Revise seus hábitos de poupança.")
  }

  // Baseado nas metas difíceis
  if (difficultGoals > 0) {
    recommendations.push(`🔍 ${difficultGoals} meta(s) podem ser difíceis. Considere ajustar prazos ou valores.`)
  }

  // Baseado no perfil
  if (responses.financialBehavior?.moneyPriority === "GASTA") {
    recommendations.push("💡 Seu perfil é focado em gastos. Considere mudar prioridades para alcançar metas.")
  }

  // Baseado na taxa de poupança
  const totalIncome = transactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpenses = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  if (savingsRate < 10) {
    recommendations.push("📈 Aumente sua taxa de poupança para alcançar metas mais rapidamente.")
  }

  // Recomendações específicas por meta
  goalsWithProgress.forEach(goal => {
    if (goal.progress.projected < 50 && goal.viability.viability === "MUITO DIFÍCIL") {
      recommendations.push(`🎯 A meta "${goal.name}" precisa de ajuste. Considere aumentar prazo ou reduzir valor.`)
    }
  })

  return recommendations
}
