// Asset Classes Structure
export type AssetClass =
  | "fixed_income"
  | "equities_brazil"
  | "equities_global"
  | "real_estate"
  | "alternatives"
  | "cash"

export interface AssetClassDefinition {
  id: AssetClass
  name: string
  description: string
  risk_level: "low" | "medium" | "high"
  recommended_min: number
  recommended_max: number
  category: "conservative" | "growth" | "alternative"
  geography: "brazil" | "global" | "neutral"
}

export type CurrentAllocation = {
  [key in AssetClass]: {
    value: number
    percentage: number
    count: number
    investments: string[]
  }
}

export type IdealAllocation = {
  [key in AssetClass]: {
    percentage: number
    reason: string
    priority: number
  }
}

export type AllocationGap = {
  [key in AssetClass]: {
    current: number
    ideal: number
    gap: number
    gap_percentage: number
    priority: number
    action_type: "reduce" | "increase" | "maintain"
  }
}

export interface RebalancingAction {
  id: string
  asset_class: AssetClass
  action: "reduce" | "increase"
  amount: number
  amount_percentage: number
  reason: string
  impact: string
  priority: number
  target_allocation: number
  current_allocation: number
}

export interface InternationalExposure {
  total_percentage: number
  ideal_percentage: number
  gap_percentage: number
  global_assets: number
  brazilian_assets: number
  recommendation: string
}

export interface RiskIntelligence {
  volatility_score: number
  volatility_level: "low" | "medium" | "high"
  concentration_risk: {
    score: number
    level: "low" | "medium" | "high"
    dominant_asset: AssetClass | null
    dominant_percentage: number
  }
  geographic_risk: {
    brazil_exposure: number
    global_exposure: number
    recommendation: string
  }
  overall_risk: "conservative" | "moderate" | "aggressive"
}

export interface InvestmentStrategyProfile {
  risk_profile: "conservative" | "moderate" | "aggressive"
  investment_horizon: "short" | "medium" | "long"
  financial_goal: "growth" | "retirement" | "income" | "preservation"
  age: number
  net_worth: number
  income_stability: "stable" | "variable"
  savings_rate: number
}

export interface InvestmentStrategyEngine {
  // Core Data
  asset_classes: AssetClassDefinition[]
  current_allocation: CurrentAllocation
  ideal_allocation: IdealAllocation
  allocation_gaps: AllocationGap

  // Actions & Insights
  rebalancing_actions: RebalancingAction[]
  international_exposure: InternationalExposure
  risk_intelligence: RiskIntelligence

  // Profile & Confidence
  user_profile: InvestmentStrategyProfile
  confidence_level: "high" | "medium" | "low"

  // Executive Summary
  summary: {
    portfolio_health: "excellent" | "good" | "needs_attention" | "critical"
    primary_gap: AssetClass | null
    priority_actions: number
    diversification_score: number
  }
}

// Helper types for investment mapping
export interface InvestmentMapping {
  id: string
  name: string
  category: string
  asset_class: AssetClass
  value: number
  geography: "brazil" | "global" | "neutral"
  type: "stock" | "bond" | "fund" | "reit" | "alternative" | "cash"
  ticker?: string
}

// Allocation Models
export interface AllocationModel {
  profile: "conservative" | "moderate" | "aggressive"
  allocations: {
    [key in AssetClass]: number
  }
  reasoning: string
  risk_adjustments: {
    variable_income: Partial<{ [key in AssetClass]: number }>
    high_net_worth: Partial<{ [key in AssetClass]: number }>
    low_savings: Partial<{ [key in AssetClass]: number }>
  }
}
