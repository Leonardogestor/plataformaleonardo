"use client"

import { useMemo } from "react"
import { useFinancialData } from "./use-financial-data-react-query"
import { useGlobalDate } from "@/contexts/global-date-context"

interface ProfileData {
  profile: "stable" | "variable" | "investor"
  incomeVariation: number
  effectiveIncome: number
  incomeAvg3m: number
  incomeAvg6m: number
  emergencyReserveMonths: number
  profileCharacteristics: {
    focus: string[]
    risks: string[]
    recommendations: string[]
  }
}

export function useProfileAdaptive(): ProfileData | null {
  const { calculations, transactions, isLoading } = useFinancialData()

  return useMemo(() => {
    if (isLoading || !calculations || !transactions) return null

    // Calculate income variation from last 6 months
    const last6Months = transactions
      .filter(t => t.type === "income")
      .slice(0, 6) // Assuming sorted by date desc
    
    if (last6Months.length < 2) {
      // Not enough data, assume stable
      return {
        profile: "stable",
        incomeVariation: 0,
        effectiveIncome: calculations.receitas,
        incomeAvg3m: calculations.receitas,
        incomeAvg6m: calculations.receitas,
        emergencyReserveMonths: 6,
        profileCharacteristics: {
          focus: ["expense_optimization", "investment_growth"],
          risks: ["inflation", "job_loss"],
          recommendations: ["increase_savings_rate", "diversify_investments"]
        }
      }
    }

    // Calculate monthly income totals
    const monthlyIncomes = last6Months.reduce((acc, transaction) => {
      const month = new Date(transaction.date).getMonth()
      const year = new Date(transaction.date).getFullYear()
      const key = `${year}-${month}`
      acc[key] = (acc[key] || 0) + transaction.amount
      return acc
    }, {} as Record<string, number>)

    const incomeValues = Object.values(monthlyIncomes)
    const avgIncome = incomeValues.reduce((sum, val) => sum + val, 0) / incomeValues.length
    
    // Calculate standard deviation
    const variance = incomeValues.reduce((sum, val) => {
      return sum + Math.pow(val - avgIncome, 2)
    }, 0) / incomeValues.length
    
    const stdDev = Math.sqrt(variance)
    const incomeVariation = avgIncome > 0 ? stdDev / avgIncome : 0

    // Determine profile
    let profile: "stable" | "variable" | "investor" = "stable"
    
    if (incomeVariation > 0.3) {
      profile = "variable"
    } else if (calculations.investimentos > calculations.receitas * 0.3) {
      profile = "investor"
    }

    // Calculate effective income based on profile
    const incomeAvg3m = incomeValues.slice(0, 3).reduce((sum, val) => sum + val, 0) / Math.min(3, incomeValues.length)
    const incomeAvg6m = avgIncome
    
    const effectiveIncome = profile === "variable" ? incomeAvg6m : calculations.receitas

    // Emergency reserve months based on profile
    const emergencyReserveMonths = profile === "variable" ? 12 : 6

    // Profile characteristics
    const profileCharacteristics = {
      stable: {
        focus: ["expense_optimization", "investment_growth", "retirement_planning"],
        risks: ["inflation", "interest_rate_changes", "career_stagnation"],
        recommendations: [
          "increase_savings_rate_to_25_percent",
          "diversify_investment_portfolio",
          "create_additional_income_streams"
        ]
      },
      variable: {
        focus: ["income_stabilization", "emergency_reserve", "cash_management"],
        risks: ["income_volatility", "dry_periods", "irregular_clients"],
        recommendations: [
          "build_12_month_emergency_reserve",
          "create_income_smoothing_strategy",
          "diversify_client_base"
        ]
      },
      investor: {
        focus: ["asset_allocation", "risk_management", "portfolio_optimization"],
        risks: ["market_volatility", "concentration_risk", "liquidity_issues"],
        recommendations: [
          "rebalance_portfolio_quarterly",
          "maintain_asset_allocation_targets",
          "monitor_portfolio_performance"
        ]
      }
    }

    return {
      profile,
      incomeVariation,
      effectiveIncome,
      incomeAvg3m,
      incomeAvg6m,
      emergencyReserveMonths,
      profileCharacteristics: profileCharacteristics[profile]
    }
  }, [calculations, transactions, isLoading])
}
