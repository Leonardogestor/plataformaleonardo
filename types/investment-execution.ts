import { AssetClass } from "./investment-strategy"

export interface ExecutionPlan {
  id: string
  asset_class: AssetClass
  action: "increase" | "decrease"
  what_to_sell: string
  what_to_buy: string
  how_to_execute: string
  amount: number
  amount_percentage: number
  priority: number
  estimated_impact: string
}

export interface ImpactSimulation {
  scenario_before: {
    retirement_age: number
    risk_level: "low" | "medium" | "high"
    diversification_score: number
    portfolio_score: number
    international_exposure: number
  }
  scenario_after: {
    retirement_age: number
    risk_level: "low" | "medium" | "high"
    diversification_score: number
    portfolio_score: number
    international_exposure: number
  }
  improvements: {
    retirement_years: number
    risk_improvement: string
    diversification_improvement: number
    portfolio_score_improvement: number
    international_improvement: number
  }
}

export interface PortfolioScore {
  overall_score: number
  classification: "excellent" | "good" | "needs_improvement"
  components: {
    diversification_score: number
    alignment_score: number
    risk_balance_score: number
  }
  explanation: string
  main_insight: string
  primary_action: string
}

export interface ContinuousMonitoring {
  is_out_of_balance: boolean
  threshold_triggered: AssetClass[]
  alert_message: string
  severity: "low" | "medium" | "high"
  recommended_review: string
}

export interface SimplifiedInvestmentInsight {
  main_insight: string
  primary_action: string
  expected_impact: string
  confidence_level: "high" | "medium" | "low"
  complexity_level: "simple" | "moderate" | "complex"
}

export interface InvestmentDecisionEngine {
  // Core execution
  execution_plans: ExecutionPlan[]
  impact_simulation: ImpactSimulation
  
  // Portfolio intelligence
  portfolio_score: PortfolioScore
  continuous_monitoring: ContinuousMonitoring
  
  // Simplification layer
  simplified_insight: SimplifiedInvestmentInsight
  
  // Integration
  strategy_integration: {
    retirement_impact: number
    savings_rate_adjustment: number
    risk_profile_alignment: string
  }
  
  // Confidence adaptation
  confidence_adapted: boolean
  recommendation_intensity: "conservative" | "moderate" | "assertive"
}
