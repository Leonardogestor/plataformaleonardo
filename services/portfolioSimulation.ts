/**
 * Portfolio Simulation Engine
 * Implementa simulação de cenários futuros e motor de recomendações
 */

import { Investment, AdvancedMetrics, PortfolioScore } from "./portfolioAnalytics"

export interface SimulationInputs {
  monthlyContribution: number
  expectedReturn: number
  timeHorizon: number // anos
  volatility?: number
}

export interface SimulationScenario {
  name: string
  description: string
  returnRate: number
  volatility: number
  projectedValues: number[]
  finalValue: number
  totalContributions: number
  totalGains: number
}

export interface SimulationResult {
  base: SimulationScenario
  optimistic: SimulationScenario
  pessimistic: SimulationScenario
  inputs: SimulationInputs
}

export interface Recommendation {
  id: string
  type: "REBALANCE" | "DIVERSIFY" | "REDUCE_RISK" | "INCREASE_RETURN"
  priority: "alta" | "media" | "baixa"
  title: string
  description: string
  expectedImpact: {
    sharpeImprovement?: number
    riskReduction?: number
    returnImprovement?: number
    diversificationImprovement?: number
  }
  action: string
  effort: "baixo" | "medio" | "alto"
}

export interface RebalanceSuggestion {
  investmentId: string
  investmentName: string
  currentAllocation: number
  suggestedAllocation: number
  currentValue: number
  suggestedValue: number
  action: "REDUZIR" | "AUMENTAR" | "MANTER"
}

// Alocações-alvo por tipo de ativo (%)
const TARGET_ALLOCATIONS = {
  FIXED_INCOME: 35,
  BONDS: 15,
  REAL_ESTATE: 10,
  FUNDS: 15,
  STOCKS: 20,
  CRYPTO: 5,
  OTHER: 0,
}

/**
 * Simula evolução do portfólio para diferentes cenários
 */
export function simulatePortfolioFuture(
  currentAmount: number,
  inputs: SimulationInputs
): SimulationResult {
  const months = inputs.timeHorizon * 12
  const baseReturn = inputs.expectedReturn / 100 / 12 // taxa mensal
  const baseVolatility = (inputs.volatility || 15) / 100 / 12 // vol mensal

  // Cenário BASE (retorno esperado)
  const baseScenario = simulateScenario(
    currentAmount,
    inputs.monthlyContribution,
    months,
    baseReturn,
    baseVolatility,
    "base"
  )

  // Cenário OTIMISTA (+30% retorno, mesma volatilidade)
  const optimisticScenario = simulateScenario(
    currentAmount,
    inputs.monthlyContribution,
    months,
    baseReturn * 1.3,
    baseVolatility,
    "optimistic"
  )

  // Cenário PESSIMISTA (-30% retorno, mesma volatilidade)
  const pessimisticScenario = simulateScenario(
    currentAmount,
    inputs.monthlyContribution,
    months,
    baseReturn * 0.7,
    baseVolatility,
    "pessimistic"
  )

  return {
    base: baseScenario,
    optimistic: optimisticScenario,
    pessimistic: pessimisticScenario,
    inputs,
  }
}

function simulateScenario(
  initialAmount: number,
  monthlyContribution: number,
  months: number,
  monthlyReturn: number,
  monthlyVolatility: number,
  scenarioType: "base" | "optimistic" | "pessimistic"
): SimulationScenario {
  const values: number[] = [initialAmount]
  let currentValue = initialAmount

  for (let month = 1; month <= months; month++) {
    // Aplicar retorno mensal
    currentValue = currentValue * (1 + monthlyReturn)

    // Adicionar contribuição mensal
    currentValue += monthlyContribution

    // Adicionar alguma variabilidade para cenários não-base
    if (scenarioType !== "base") {
      const randomFactor = 1 + (Math.random() - 0.5) * monthlyVolatility * 2
      currentValue = currentValue * randomFactor
    }

    values.push(currentValue)
  }

  const finalValue = values[values.length - 1] || 0
  const totalContributions = initialAmount + monthlyContribution * months
  const totalGains = finalValue - totalContributions

  const scenarioConfig = {
    base: {
      name: "Cenário Base",
      description: "Projeção com retorno esperado atual",
    },
    optimistic: {
      name: "Cenário Otimista",
      description: "Projeção com retorno 30% acima do esperado",
    },
    pessimistic: {
      name: "Cenário Pessimista",
      description: "Projeção com retorno 30% abaixo do esperado",
    },
  }

  const config = scenarioConfig[scenarioType]

  return {
    ...config,
    returnRate: monthlyReturn * 12 * 100, // anualizado
    volatility: monthlyVolatility * Math.sqrt(12) * 100, // anualizado
    projectedValues: values,
    finalValue: finalValue || 0,
    totalContributions,
    totalGains,
  }
}

/**
 * Gera recomendações inteligentes baseadas nas métricas do portfólio
 */
export function generateRecommendations(
  investments: Investment[],
  metrics: AdvancedMetrics,
  score: PortfolioScore
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const total = metrics.totalCurrent

  if (investments.length === 0 || total <= 0) {
    return []
  }

  // 1. Recomendações de Concentração
  const concentrations = investments.map((inv) => ({
    ...inv,
    percentage: (inv.currentValue / total) * 100,
  }))

  const highConcentration = concentrations.filter((c) => c.percentage > 40)
  if (highConcentration.length > 0) {
    const topConcentration = highConcentration[0]
    if (topConcentration) {
      recommendations.push({
        id: "concentration-high",
        type: "DIVERSIFY",
        priority: "alta",
        title: "Reduzir Concentração",
        description: `Seu portfólio tem ${highConcentration.length} ativo(s) com mais de 40% de concentração. Isso aumenta o risco específico.`,
        expectedImpact: {
          riskReduction: 15,
          diversificationImprovement: 25,
        },
        action: `Diversificar ${topConcentration.name} que representa ${topConcentration.percentage.toFixed(1)}% do portfólio`,
        effort: "medio",
      })
    }
  }

  // 2. Recomendações de Performance vs CDI
  const portfolioReturn = calculatePortfolioReturn(investments)
  if (portfolioReturn < 10.75) {
    // CDI
    recommendations.push({
      id: "performance-low",
      type: "INCREASE_RETURN",
      priority: "alta",
      title: "Melhorar Performance",
      description: `Seu portfólio está rendendo ${portfolioReturn.toFixed(1)}% ao ano, abaixo do CDI (${10.75}%).`,
      expectedImpact: {
        returnImprovement: 5,
        sharpeImprovement: 0.5,
      },
      action: "Revisar alocação para incluir ativos com maior potencial de retorno",
      effort: "alto",
    })
  }

  // 3. Recomendações de Risco
  if (metrics.volatility && metrics.volatility > 25) {
    recommendations.push({
      id: "risk-high",
      type: "REDUCE_RISK",
      priority: "media",
      title: "Reduzir Volatilidade",
      description: `Seu portfólio tem volatilidade de ${metrics.volatility.toFixed(1)}% ao ano, considerada alta.`,
      expectedImpact: {
        riskReduction: 20,
        sharpeImprovement: 0.3,
      },
      action: "Aumentar exposição a renda fixa para reduzir volatilidade",
      effort: "medio",
    })
  }

  // 4. Recomendações de Diversificação por Tipo
  const typeAllocation = calculateTypeAllocation(investments)
  const diversificationIssues = checkDiversificationByType(typeAllocation)

  diversificationIssues.forEach((issue) => {
    recommendations.push({
      id: `diversification-${issue.type}`,
      type: "DIVERSIFY",
      priority: issue.severity,
      title: `Ajustar Alocação - ${issue.typeLabel}`,
      description: issue.description,
      expectedImpact: {
        diversificationImprovement: 15,
        riskReduction: 10,
      },
      action: issue.action,
      effort: "baixo",
    })
  })

  // 5. Recomendações de Sharpe Ratio
  if (metrics.sharpeRatio && metrics.sharpeRatio < 0.5) {
    recommendations.push({
      id: "sharpe-low",
      type: "REBALANCE",
      priority: "media",
      title: "Melhorar Relação Risco-Retorno",
      description: `Sharpe Ratio de ${metrics.sharpeRatio.toFixed(2)} indica baixa eficiência do portfólio.`,
      expectedImpact: {
        sharpeImprovement: 0.8,
      },
      action: "Rebalancear portfólio para otimizar relação risco-retorno",
      effort: "medio",
    })
  }

  // Ordenar por prioridade
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { alta: 3, media: 2, baixa: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, 6) // Limitar a 6 recomendações
}

function calculatePortfolioReturn(investments: Investment[]): number {
  if (investments.length === 0) return 0

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0)

  if (totalInvested <= 0) return 0

  const avgYears = calculateAverageInvestmentPeriod(investments)
  if (avgYears <= 0) return 0

  const totalReturn = (totalCurrent - totalInvested) / totalInvested
  return (Math.pow(1 + totalReturn, 1 / avgYears) - 1) * 100
}

function calculateAverageInvestmentPeriod(investments: Investment[]): number {
  if (investments.length === 0) return 0

  let totalWeightedYears = 0
  let totalWeight = 0

  investments.forEach((inv) => {
    const years = (Date.now() - new Date(inv.acquiredAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    const weight = inv.amount
    totalWeightedYears += years * weight
    totalWeight += weight
  })

  return totalWeight > 0 ? totalWeightedYears / totalWeight : 0
}

function calculateTypeAllocation(investments: Investment[]) {
  const total = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const allocation: Record<string, number> = {}

  investments.forEach((inv) => {
    allocation[inv.type] = (allocation[inv.type] || 0) + inv.currentValue
  })

  // Converter para percentuais
  Object.keys(allocation).forEach((type) => {
    allocation[type] = ((allocation[type] || 0) / total) * 100
  })

  return allocation
}

function checkDiversificationByType(allocation: Record<string, number>) {
  const issues: Array<{
    type: string
    typeLabel: string
    severity: "alta" | "media" | "baixa"
    description: string
    action: string
  }> = []

  const typeLabels: Record<string, string> = {
    STOCKS: "Ações",
    BONDS: "Títulos",
    REAL_ESTATE: "Imóveis",
    FIXED_INCOME: "Renda Fixa",
    CRYPTO: "Cripto",
    FUNDS: "Fundos",
    OTHER: "Outros",
  }

  Object.entries(TARGET_ALLOCATIONS).forEach(([type, target]) => {
    const current = allocation[type] || 0
    const diff = Math.abs(current - target)

    if (diff > 15) {
      issues.push({
        type,
        typeLabel: typeLabels[type] || type,
        severity: current > target ? "alta" : "media",
        description: `Alocação em ${typeLabels[type]} de ${current.toFixed(1)}% está muito distante do ideal de ${target}%`,
        action:
          current > target
            ? `Reduzir exposição em ${typeLabels[type]} para ~${target}%`
            : `Aumentar exposição em ${typeLabels[type]} para ~${target}%`,
      })
    }
  })

  return issues
}

/**
 * Gera sugestões de rebalanceamento detalhadas
 */
export function generateRebalanceSuggestions(investments: Investment[]): RebalanceSuggestion[] {
  const total = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  if (total <= 0) return []

  const currentTypeAllocation = calculateTypeAllocation(investments)
  const suggestions: RebalanceSuggestion[] = []

  // Calcular alocação ideal por tipo
  Object.entries(TARGET_ALLOCATIONS).forEach(([type, targetPct]) => {
    const currentPct = currentTypeAllocation[type] || 0
    const diff = targetPct - currentPct

    if (Math.abs(diff) > 5) {
      // Só sugere se diferença for significativa
      const targetValue = (targetPct / 100) * total
      const currentValue = (currentPct / 100) * total

      // Encontrar investimentos deste tipo para sugerir ajustes
      const typeInvestments = investments.filter((inv) => inv.type === type)

      typeInvestments.forEach((inv) => {
        const invPct = (inv.currentValue / total) * 100
        const suggestedPct = currentValue > 0 ? (inv.currentValue / currentValue) * targetPct : 0
        const suggestedValue = (suggestedPct / 100) * total

        suggestions.push({
          investmentId: inv.id,
          investmentName: inv.name,
          currentAllocation: invPct,
          suggestedAllocation: suggestedPct,
          currentValue: inv.currentValue,
          suggestedValue,
          action: diff > 0 ? "AUMENTAR" : "REDUZIR",
        })
      })
    }
  })

  return suggestions.sort(
    (a, b) =>
      Math.abs(b.suggestedValue - b.currentValue) - Math.abs(a.suggestedValue - a.currentValue)
  )
}
