"use client"

import { useMemo } from "react"
import { useStrategy } from "./use-strategy"
import { useRobustProfileDetection } from "./use-robust-profile-detection"
import { useAutosaveEditableData } from "./use-autosave-editable-data"

interface ConfidenceAdaptedStrategy {
  originalStrategy: any
  adaptedStrategy: {
    diagnosis: {
      savingsRate: number
      financialHealth: "excellent" | "good" | "warning" | "critical"
      monthlyResult: number
      estimatedRetirementAge: number
      currentWealth: number
      idealSavingsRate: number
      confidenceAdjusted: boolean
    }
    mainProblem: {
      type: "low_savings" | "high_expenses" | "underinvestment" | "negative_cashflow" | "none"
      description: string
      severity: "low" | "medium" | "high"
      impact: number
      currentValue: number
      targetValue: number
      confidenceAdjusted: boolean
    }
    actionPlan: {
      action: string
      value: number
      category?: string
      impact: string
      priority: number
      timeframe: string
      confidenceAdjusted: boolean
      aggressiveness: "conservative" | "moderate" | "aggressive"
    }[]
    futureOutlook: {
      financialIndependenceAge: number
      projectedWealth: number
      monthlyGrowthRate: number
      yearsToIndependence: number
      requiredWealth: number
      confidenceAdjusted: boolean
      disclaimer?: string
    }
  }
  confidenceLevel: "high" | "medium" | "low"
  adaptationReasons: string[]
}

export function useConfidenceAdaptedStrategy(): ConfidenceAdaptedStrategy | null {
  const originalStrategy = useStrategy()
  const profileData = useRobustProfileDetection()
  const { trustMetrics } = useAutosaveEditableData()

  return useMemo(() => {
    if (!originalStrategy || !profileData) return null

    const confidenceLevel = trustMetrics?.level || profileData.confidence.level
    const confidenceScore = trustMetrics?.score || profileData.confidence.score
    const adaptationReasons: string[] = []

    // Helper to adjust aggressiveness based on confidence
    const adjustAggressiveness = (original: any, confidence: "high" | "medium" | "low") => {
      if (confidence === "high") return original // Keep original strong recommendations
      if (confidence === "medium") return "moderate"
      return "conservative" // Low confidence = conservative approach
    }

    // Helper to adjust recommendations based on confidence
    const adjustRecommendation = (text: string, confidence: "high" | "medium" | "low") => {
      if (confidence === "high") return text

      const conservativePrefixes = ["Considere ", "Avalie a possibilidade de ", "Pense em "]

      const genericPrefixes = ["É recomendável ", "Sugere-se ", "Pode ser útil "]

      const prefixes = confidence === "low" ? conservativePrefixes : genericPrefixes
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

      // Remove aggressive words for low confidence
      let adjustedText = text
      if (confidence === "low") {
        adjustedText = adjustedText.replace(/aumentar|reduzir|eliminar/gi, "ajustar")
        adjustedText = adjustedText.replace(/imediato|urgente|essencial/gi, "importante")
      }

      return prefix + adjustedText.toLowerCase()
    }

    // Adapt diagnosis
    const adaptedDiagnosis = {
      ...originalStrategy.diagnosis,
      confidenceAdjusted: confidenceLevel !== "high",
      // For low confidence, be more conservative in health assessment
      financialHealth:
        confidenceLevel === "low" && originalStrategy.diagnosis.financialHealth === "excellent"
          ? ("good" as const)
          : originalStrategy.diagnosis.financialHealth,
    }

    // Adapt main problem
    const adaptedMainProblem = {
      ...originalStrategy.mainProblem,
      confidenceAdjusted: confidenceLevel !== "high",
      // Reduce severity for low confidence
      severity:
        confidenceLevel === "low" && originalStrategy.mainProblem.severity === "high"
          ? ("medium" as const)
          : originalStrategy.mainProblem.severity,
      description:
        confidenceLevel === "low"
          ? "Possíveis problemas detectados - mais dados necessários para confirmação"
          : originalStrategy.mainProblem.description,
    }

    // Adapt action plan
    const adaptedActionPlan = originalStrategy.actionPlan.map((action: any, index: number) => {
      const aggressiveness = adjustAggressiveness(action.priority, confidenceLevel)

      // Adjust priority based on confidence
      let adjustedPriority = action.priority
      if (confidenceLevel === "low") {
        adjustedPriority = Math.max(50, action.priority - 20) // Reduce priority
      } else if (confidenceLevel === "medium") {
        adjustedPriority = Math.max(70, action.priority - 10) // Slightly reduce
      }

      return {
        ...action,
        action: adjustRecommendation(action.action, confidenceLevel),
        priority: adjustedPriority,
        aggressiveness,
        confidenceAdjusted: confidenceLevel !== "high",
        // For low confidence, add conservative timeframes
        timeframe:
          confidenceLevel === "low"
            ? action.timeframe.replace(/próximo|imediato/gi, "nos próximos")
            : action.timeframe,
      }
    })

    // Sort by adjusted priority
    adaptedActionPlan.sort((a, b) => b.priority - a.priority)

    // Adapt future outlook
    let disclaimer: string | undefined
    if (confidenceLevel === "low") {
      disclaimer =
        "Projeções baseadas em dados limitados. Valores estimados podem variar significativamente."
      adaptationReasons.push("Projeções conservadas devido à baixa confiança nos dados")
    } else if (confidenceLevel === "medium") {
      disclaimer = "Projeções baseadas em dados razoáveis. Considere possíveis variações."
      adaptationReasons.push("Projeções ajustadas para nível médio de confiança")
    }

    const adaptedFutureOutlook = {
      ...originalStrategy.futureOutlook,
      confidenceAdjusted: confidenceLevel !== "high",
      disclaimer,
      // For low confidence, be more conservative in projections
      financialIndependenceAge:
        confidenceLevel === "low"
          ? originalStrategy.futureOutlook.financialIndependenceAge + 5 // Add 5 years
          : originalStrategy.futureOutlook.financialIndependenceAge,
      projectedWealth:
        confidenceLevel === "low"
          ? originalStrategy.futureOutlook.projectedWealth * 0.8 // Reduce by 20%
          : originalStrategy.futureOutlook.projectedWealth,
    }

    // Add adaptation reasons
    if (profileData.profile === "insufficient_data") {
      adaptationReasons.push("Perfil de dados insuficiente - recomendamos mais transações")
    }

    if (trustMetrics?.overrideRatio && trustMetrics.overrideRatio > 0.3) {
      adaptationReasons.push("Muitas alterações manuais detectadas - estratégia conservada")
    }

    if (trustMetrics?.anomalyCount && trustMetrics.anomalyCount > 0) {
      adaptationReasons.push("Anomalias detectadas - análise mais cautelosa")
    }

    return {
      originalStrategy,
      adaptedStrategy: {
        diagnosis: adaptedDiagnosis,
        mainProblem: adaptedMainProblem,
        actionPlan: adaptedActionPlan,
        futureOutlook: adaptedFutureOutlook,
      },
      confidenceLevel,
      adaptationReasons,
    }
  }, [originalStrategy, profileData, trustMetrics])
}
