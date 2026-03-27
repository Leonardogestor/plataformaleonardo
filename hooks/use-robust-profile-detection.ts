"use client"

import { useMemo } from "react"
import { useFinancialData } from "./use-financial-data-react-query"
import { useGlobalDate } from "@/contexts/global-date-context"

interface RobustProfileData {
  profile: "insufficient_data" | "stable" | "variable" | "investor"
  confidence: {
    score: number
    level: "high" | "medium" | "low"
    factors: {
      dataCompleteness: number
      overrideRatio: number
      dataConsistency: number
    }
  }
  incomeAnalysis: {
    variation: number
    consistency: number
    avg3m: number
    avg6m: number
    monthsWithData: number
    totalMonths: number
  }
  netWorth: {
    total: number
    annualIncomeMultiple: number
  }
  warnings: string[]
  recommendations: string[]
}

export function useRobustProfileDetection(): RobustProfileData | null {
  const { calculations, transactions, investments, finalBalance, isLoading } = useFinancialData()

  return useMemo(() => {
    if (isLoading || !calculations || !transactions) return null

    // 1. DATA SUFFICIENCY CHECK
    const incomeTransactions = transactions.filter((t) => t.type === "income")
    const uniqueMonths = new Set(
      incomeTransactions.map((t) => {
        const date = new Date(t.date)
        return `${date.getFullYear()}-${date.getMonth()}`
      })
    )

    const monthsWithData = uniqueMonths.size
    const totalMonths = 6 // Last 6 months analysis

    if (monthsWithData < 4) {
      return {
        profile: "insufficient_data",
        confidence: {
          score: 0.2,
          level: "low",
          factors: {
            dataCompleteness: monthsWithData / totalMonths,
            overrideRatio: 0,
            dataConsistency: 0.5,
          },
        },
        incomeAnalysis: {
          variation: 0,
          consistency: 0,
          avg3m: 0,
          avg6m: 0,
          monthsWithData,
          totalMonths,
        },
        netWorth: {
          total: finalBalance || 0,
          annualIncomeMultiple: 0,
        },
        warnings: ["Dados insuficientes para análise precisa (menos de 4 meses)"],
        recommendations: ["Continue registrando transações para análise completa"],
      }
    }

    // 2. IMPROVED INCOME ANALYSIS
    const monthlyIncomeData: Record<string, number> = {}

    incomeTransactions.forEach((t) => {
      const date = new Date(t.date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      monthlyIncomeData[key] = (monthlyIncomeData[key] || 0) + t.amount
    })

    const monthlyIncomes = Object.values(monthlyIncomeData)
    const avgIncome = monthlyIncomes.reduce((sum, val) => sum + val, 0) / monthlyIncomes.length

    // Calculate standard deviation
    const variance =
      monthlyIncomes.reduce((sum, val) => {
        return sum + Math.pow(val - avgIncome, 2)
      }, 0) / monthlyIncomes.length

    const stdDev = Math.sqrt(variance)
    const incomeVariation = avgIncome > 0 ? stdDev / avgIncome : 0

    // Consistency: months with income / total months analyzed
    const incomeConsistency = monthsWithData / totalMonths

    // Rolling averages
    const sortedMonths = Object.keys(monthlyIncomeData).sort()
    const last3Months = sortedMonths.slice(-3)
    const last6Months = sortedMonths.slice(-6)

    const avg3m =
      last3Months.length > 0
        ? last3Months.reduce((sum, month) => sum + (monthlyIncomeData[month] || 0), 0) /
          last3Months.length
        : avgIncome

    const avg6m =
      last6Months.length > 0
        ? last6Months.reduce((sum, month) => sum + (monthlyIncomeData[month] || 0), 0) /
          last6Months.length
        : avgIncome

    // 3. NET WORTH ANALYSIS
    const annualIncome = calculations.receitas * 12
    const netWorth = finalBalance || 0
    const annualIncomeMultiple = annualIncome > 0 ? netWorth / annualIncome : 0

    // 4. IMPROVED PROFILE DETECTION
    let profile: "insufficient_data" | "stable" | "variable" | "investor" = "stable"
    const warnings: string[] = []
    const recommendations: string[] = []

    // Variable income detection
    if (incomeVariation > 0.35 && incomeConsistency < 0.8) {
      profile = "variable"
      recommendations.push("Construir reserva de emergência de 12 meses")
      recommendations.push("Diversificar fontes de renda")
      warnings.push("Alta volatilidade na renda detectada")
    } else {
      profile = "stable"
      recommendations.push("Otimizar taxa de poupança para 25%")
      recommendations.push("Investir em carteira diversificada")
    }

    // Investor profile detection (based on net worth)
    if (annualIncomeMultiple > 2) {
      profile = "investor"
      recommendations.push("Rebalancear carteira trimestralmente")
      recommendations.push("Monitorar alocação de ativos")
      recommendations.push("Diversificar entre classes de investimento")
    }

    // 5. CONFIDENCE SCORE CALCULATION
    const dataCompleteness = monthsWithData / totalMonths
    const overrideRatio = 0 // Will be updated by editable system
    const dataConsistency = incomeConsistency

    const confidenceScore =
      dataCompleteness * 0.4 + (1 - overrideRatio) * 0.3 + dataConsistency * 0.3

    let confidenceLevel: "high" | "medium" | "low" = "medium"
    if (confidenceScore > 0.8) confidenceLevel = "high"
    else if (confidenceScore <= 0.5) confidenceLevel = "low"

    // 6. ADDITIONAL WARNINGS
    if (incomeVariation > 0.5) {
      warnings.push("Variação de renda muito alta - reveja fontes de receita")
    }

    if (annualIncomeMultiple < 0.5) {
      warnings.push("Patrimônio baixo em relação à renda anual")
    }

    return {
      profile,
      confidence: {
        score: confidenceScore,
        level: confidenceLevel,
        factors: {
          dataCompleteness,
          overrideRatio,
          dataConsistency,
        },
      },
      incomeAnalysis: {
        variation: incomeVariation,
        consistency: incomeConsistency,
        avg3m,
        avg6m,
        monthsWithData,
        totalMonths,
      },
      netWorth: {
        total: netWorth,
        annualIncomeMultiple,
      },
      warnings,
      recommendations,
    }
  }, [calculations, transactions, investments, finalBalance, isLoading])
}
