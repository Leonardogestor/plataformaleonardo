"use client"

import { useMemo } from "react"
import { useFinancialDataSafe } from "./use-financial-data-safe"
import { useGlobalDate } from "@/contexts/global-date-context"
import { useAnamnesis } from "./use-anamnesis"

interface StrategyData {
  diagnosis: {
    savingsRate: number
    financialHealth: "excellent" | "good" | "warning" | "critical"
    monthlyResult: number
    estimatedRetirementAge: number
    currentWealth: number
    idealSavingsRate: number
  }
  mainProblem: {
    type: "low_savings" | "high_expenses" | "underinvestment" | "negative_cashflow" | "none"
    description: string
    severity: "low" | "medium" | "high"
    impact: number
    currentValue: number
    targetValue: number
  }
  actionPlan: {
    action: string
    value: number
    category?: string
    impact: string
    priority: number
    timeframe: string
  }[]
  futureOutlook: {
    financialIndependenceAge: number
    projectedWealth: number
    monthlyGrowthRate: number
    yearsToIndependence: number
    requiredWealth: number
  }
}

function calcAge(birthDate: string | null): number {
  if (!birthDate) return 30
  const birth = new Date(birthDate)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return hasBirthdayPassed ? age : age - 1
}

function idealSavingsForRisk(riskLevel: string | null): number {
  if (riskLevel === "CONSERVADOR") return 0.30
  if (riskLevel === "AGRESSIVO") return 0.20
  return 0.25 // MODERADO ou não definido
}

export function useStrategy(): StrategyData | null {
  const { calculations, finalBalance, isLoading } = useFinancialDataSafe()
  useGlobalDate()
  const { profile: anamnesisProfile } = useAnamnesis()

  return useMemo(() => {
    if (isLoading || !calculations) return null

    const { receitas, despesas, investimentos, resultado, savingsRate } = calculations
    const currentAge = calcAge(anamnesisProfile?.birthDate ?? null)
    const annualSavings = resultado * 12
    const currentWealth = finalBalance || 0

    // Verificar se há dados reais para cálculos
    const hasRealData =
      receitas > 0 || despesas !== 0 || investimentos !== 0 || resultado !== 0 || currentWealth > 0

    // Se não houver dados, retornar valores zerados
    if (!hasRealData) {
      return {
        diagnosis: {
          savingsRate: 0,
          financialHealth: "critical",
          monthlyResult: 0,
          estimatedRetirementAge: 65,
          currentWealth: 0,
          idealSavingsRate: 0.25,
        },
        mainProblem: {
          type: "none",
          description: "Sem dados disponíveis para análise",
          severity: "low",
          impact: 0,
          currentValue: 0,
          targetValue: 0,
        },
        actionPlan: [],
        futureOutlook: {
          financialIndependenceAge: 65,
          projectedWealth: 0,
          monthlyGrowthRate: 0,
          yearsToIndependence: 35,
          requiredWealth: 0,
        },
      }
    }

    // REALISTIC GROWTH RATE - 5% annual return
    const annualRate = 0.05
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1 // ~0.4% per month

    // RETIREMENT CALCULATION - Future Value Formula
    const retirementAnnualExpense = Math.abs(despesas) * 12 * 0.8 // 80% of current expenses
    const requiredWealth = retirementAnnualExpense / 0.04 // 4% withdrawal rule

    // Calculate years to retirement using FV formula
    // FV = PV * (1 + r)^t + PMT * ((1 + r)^t - 1) / r
    const calculateYearsToRetirement = (pv: number, pmt: number, fv: number, r: number): number => {
      if (pv >= fv) return 0
      if (r <= 0) return Infinity

      // Using approximation for compound interest with regular contributions
      let years = 0
      let currentValue = pv

      while (currentValue < fv && years < 50) {
        currentValue = currentValue * (1 + r) + pmt * 12
        years++
      }

      return years
    }

    const yearsToRetirement = calculateYearsToRetirement(
      currentWealth,
      resultado,
      requiredWealth,
      annualRate
    )

    const estimatedRetirementAge = currentAge + yearsToRetirement

    // 1. FINANCIAL DIAGNOSIS - personalizado pelo perfil da anamnese
    const idealSavingsRate = idealSavingsForRisk(anamnesisProfile?.riskLevel ?? null)

    const diagnosis = {
      savingsRate,
      financialHealth:
        savingsRate >= 0.25
          ? ("excellent" as const)
          : savingsRate >= 0.2
            ? ("good" as const)
            : savingsRate >= 0.1
              ? ("warning" as const)
              : ("critical" as const),
      monthlyResult: resultado,
      estimatedRetirementAge,
      currentWealth,
      idealSavingsRate,
    }

    // 2. MAIN PROBLEM DETECTION - FIXED SAVINGS RATE LOGIC
    let mainProblem: StrategyData["mainProblem"] = {
      type: "none",
      description: "Sem problemas críticos identificados",
      severity: "low",
      impact: 0,
      currentValue: 0,
      targetValue: 0,
    }

    if (resultado < 0) {
      mainProblem = {
        type: "negative_cashflow",
        description: "Fluxo de caixa negativo - despesas superam receitas",
        severity: "high",
        impact: Math.abs(resultado),
        currentValue: resultado,
        targetValue: receitas * 0.1, // Target: 10% positive cash flow
      }
    } else if (savingsRate < 0.05) {
      mainProblem = {
        type: "low_savings",
        description: `Taxa de poupança crítica: ${Math.round(savingsRate * 100)}% (ideal: ${Math.round(idealSavingsRate * 100)}%)`,
        severity: "high",
        impact: (idealSavingsRate - savingsRate) * receitas,
        currentValue: savingsRate,
        targetValue: idealSavingsRate,
      }
    } else if (Math.abs(despesas) > receitas * 0.85) {
      mainProblem = {
        type: "high_expenses",
        description: `Ratio despesa/receita alto: ${Math.round((Math.abs(despesas) / receitas) * 100)}% (ideal: <70%)`,
        severity: "medium",
        impact: Math.abs(despesas) - receitas * 0.7,
        currentValue: Math.abs(despesas) / receitas,
        targetValue: 0.7,
      }
    } else if (investimentos < receitas * 0.15) {
      mainProblem = {
        type: "underinvestment",
        description: `Investimentos abaixo do ideal: ${Math.round((investimentos / receitas) * 100)}% (ideal: >15%)`,
        severity: "medium",
        impact: receitas * 0.15 - investimentos,
        currentValue: investimentos / receitas,
        targetValue: 0.15,
      }
    }

    // 3. ACTION PLAN - SPECIFIC AND ACTIONABLE
    const actionPlan: StrategyData["actionPlan"] = []

    if (mainProblem.type === "low_savings" || mainProblem.type === "negative_cashflow") {
      const targetSavings = Math.max(receitas * 0.25, Math.abs(despesas) * 0.2)
      actionPlan.push({
        action: `Aumentar poupança mensal para R$ ${Math.round(targetSavings).toLocaleString("pt-BR")}`,
        value: targetSavings,
        impact: `Aumenta taxa de poupança para ${Math.round((targetSavings / receitas) * 100)}%`,
        priority: 100,
        timeframe: "Próximo mês",
      })
    }

    if (mainProblem.type === "high_expenses") {
      const expenseReduction = Math.abs(despesas) - receitas * 0.7
      actionPlan.push({
        action: `Reduzir despesas em R$ ${Math.round(expenseReduction).toLocaleString("pt-BR")}/mês`,
        value: expenseReduction,
        category: "Gerais",
        impact: `Reduz ratio despesa/receita para 70%`,
        priority: 90,
        timeframe: "Próximos 2 meses",
      })

      // Specific category recommendation
      actionPlan.push({
        action: `Reduzir alimentação em R$ ${Math.round(expenseReduction * 0.3).toLocaleString("pt-BR")}/mês`,
        value: expenseReduction * 0.3,
        category: "Alimentação",
        impact: `Reduz 15% das despesas com alimentação`,
        priority: 80,
        timeframe: "Próximo mês",
      })
    }

    if (mainProblem.type === "underinvestment") {
      const targetInvestment = receitas * 0.15
      actionPlan.push({
        action: `Aumentar investimentos para R$ ${Math.round(targetInvestment).toLocaleString("pt-BR")}/mês`,
        value: targetInvestment,
        category: "Investimentos",
        impact: `Aumenta alocação para 15% da receita`,
        priority: 85,
        timeframe: "A partir do próximo mês",
      })
    }

    // Always add emergency fund if low
    if (currentWealth < Math.abs(despesas) * 6) {
      const emergencyFundTarget = Math.abs(despesas) * 6
      actionPlan.push({
        action: `Construir reserva de emergência de R$ ${Math.round(emergencyFundTarget).toLocaleString("pt-BR")}`,
        value: emergencyFundTarget - currentWealth,
        category: "Reserva",
        impact: `6 meses de despesas cobertas`,
        priority: 75,
        timeframe: "12 meses",
      })
    }

    // Sort by priority
    actionPlan.sort((a, b) => b.priority - a.priority)

    // 4. FUTURE OUTLOOK - REALISTIC PROJECTIONS
    const futureOutlook = {
      financialIndependenceAge: Math.floor(estimatedRetirementAge),
      projectedWealth:
        currentWealth * Math.pow(1 + annualRate, yearsToRetirement) +
        annualSavings * ((Math.pow(1 + annualRate, yearsToRetirement) - 1) / annualRate),
      monthlyGrowthRate: monthlyRate, // Realistic 0.4% per month
      yearsToIndependence: yearsToRetirement,
      requiredWealth,
    }

    return {
      diagnosis,
      mainProblem,
      actionPlan,
      futureOutlook,
    }
  }, [calculations, finalBalance, isLoading])
}
