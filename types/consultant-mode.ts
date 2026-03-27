import { AssetClass } from "./investment-strategy"
import { ExecutionPlan } from "./investment-execution"

export interface ConsultantMode {
  is_active: boolean
  consultant_id?: string
  consultant_name?: string
  edit_permissions: {
    can_edit_recommendations: boolean
    can_edit_allocations: boolean
    can_add_notes: boolean
    can_adjust_values: boolean
  }
  custom_notes: ConsultantNote[]
  modified_recommendations: ModifiedRecommendation[]
  version: number
  last_modified: Date
}

export interface ConsultantNote {
  id: string
  section: "portfolio" | "allocation" | "gap_analysis" | "execution" | "impact" | "general"
  title: string
  content: string
  priority: "low" | "medium" | "high"
  is_public: boolean // visible to client
  created_at: Date
  created_by: string
}

export interface ModifiedRecommendation {
  id: string
  original_recommendation: ExecutionPlan
  modified_recommendation: ExecutionPlan
  modification_reason: string
  modified_by: string
  modified_at: Date
  is_approved: boolean
}

export interface EditableAsset {
  id: string
  name: string
  category: string
  asset_class: AssetClass
  value: number
  original_value: number
  is_modified: boolean
  type: "stock" | "bond" | "fund" | "reit" | "alternative" | "cash"
  ticker?: string
  geography: "brazil" | "global" | "neutral"
  consultant_notes?: string
}

export interface ConsultantPortfolioState {
  // Original system data
  system_execution_plans: ExecutionPlan[]
  system_portfolio_score: number
  system_allocation: Record<AssetClass, number>
  
  // Consultant modifications
  consultant_execution_plans: ExecutionPlan[]
  consultant_portfolio_score: number
  consultant_allocation: Record<AssetClass, number>
  consultant_assets: EditableAsset[]
  
  // Comparison
  has_modifications: boolean
  modification_summary: {
    total_changes: number
    impact_on_score: number
    impact_on_retirement: number
  }
}

export interface ConsultantPermissions {
  can_edit_recommendations: boolean
  can_edit_allocations: boolean
  can_add_notes: boolean
  can_adjust_values: boolean
  can_approve_changes: boolean
  can_export_reports: boolean
}
