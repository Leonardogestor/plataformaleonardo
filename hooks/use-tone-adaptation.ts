"use client"

import { useMemo } from "react"
import { useRobustProfileDetection } from "./use-robust-profile-detection"
import { useAutosaveEditableData } from "./use-autosave-editable-data"

interface ToneAdaptation {
  level: "high" | "medium" | "low"
  tone: "direct" | "balanced" | "suggestive"
  prefix: string
  intensity: "assertive" | "moderate" | "careful"
  examples: {
    investment: string
    savings: string
    expenses: string
    retirement: string
  }
}

export function useToneAdaptation(): ToneAdaptation {
  const profileData = useRobustProfileDetection()
  const { trustMetrics } = useAutosaveEditableData()

  return useMemo(() => {
    const confidenceLevel = trustMetrics?.level || profileData?.confidence.level || "medium"
    
    if (confidenceLevel === "high") {
      return {
        level: "high",
        tone: "direct",
        prefix: "",
        intensity: "assertive",
        examples: {
          investment: "Você deve aumentar sua taxa de investimento para 20% da renda.",
          savings: "Reduza suas despesas em 15% para alcançar a taxa de poupança ideal.",
          expenses: "Elimine gastos não essenciais para melhorar seu fluxo de caixa.",
          retirement: "Você precisa poupar R$ 2.000 mensais para se aposentar aos 55 anos."
        }
      }
    }

    if (confidenceLevel === "medium") {
      return {
        level: "medium",
        tone: "balanced",
        prefix: "Você pode se beneficiar de ",
        intensity: "moderate",
        examples: {
          investment: "Você pode se beneficiar de aumentar sua taxa de investimento para 20% da renda.",
          savings: "Considere reduzir suas despesas em 15% para melhorar sua taxa de poupança.",
          expenses: "Avalie cortar gastos não essenciais para otimizar seu fluxo de caixa.",
          retirement: "Sugere-se poupar R$ 2.000 mensais para alcançar a aposentadoria aos 55 anos."
        }
      }
    }

    // LOW confidence
    return {
      level: "low",
      tone: "suggestive",
      prefix: "Considere revisar ",
      intensity: "careful",
      examples: {
        investment: "Considere revisar sua estratégia de investimento para otimizar retornos.",
        savings: "Pense em formas de melhorar sua taxa de poupança gradualmente.",
        expenses: "Talvez valha a pena analisar seus gastos para encontrar oportunidades de otimização.",
        retirement: "Recomenda-se avaliar seu planejamento de aposentadoria com mais dados históricos."
      }
    }
  }, [profileData, trustMetrics])
}

// Helper function to adapt any text based on confidence
export function adaptText(text: string, tone: ToneAdaptation): string {
  if (tone.level === "high") {
    // Direct language - assertive
    return text
      .replace(/deveria/gi, "deve")
      .replace(/poderia/gi, "pode")
      .replace(/é recomendado/gi, "é essencial")
      .replace(/sugere-se/gi, "é necessário")
  }

  if (tone.level === "medium") {
    // Balanced tone
    return text
      .replace(/deve/gi, "pode")
      .replace(/é essencial/gi, "é recomendado")
      .replace(/é necessário/gi, "sugere-se")
  }

  // Low confidence - suggestive and careful
  return tone.prefix + text.toLowerCase()
    .replace(/deve/gi, "pode considerar")
    .replace(/elimine/gi, "avalie reduzir")
    .replace(/aumente/gi, "pense em aumentar")
    .replace(/reduza/gi, "considere reduzir")
    .replace(/imediato/gi, "gradual")
    .replace(/urgente/gi, "importante")
}

// Helper to get appropriate recommendations based on confidence
export function getConfidenceAdaptedRecommendations(tone: ToneAdaptation) {
  const baseRecommendations = {
    increaseSavings: "Aumentar a taxa de poupança para 25% da renda",
    reduceExpenses: "Reduzir despesas não essenciais em 20%",
    investMore: "Aumentar investimentos para 15% da renda",
    emergencyFund: "Construir reserva de emergência de 6 meses"
  }

  return Object.entries(baseRecommendations).reduce((acc, [key, value]) => {
    acc[key] = adaptText(value, tone)
    return acc
  }, {} as Record<string, string>)
}

// Helper to get appropriate call-to-action based on confidence
export function getConfidenceAdaptedCTA(tone: ToneAdaptation) {
  if (tone.level === "high") {
    return {
      primary: "Implementar Agora",
      secondary: "Ver Detalhes",
      urgency: "Alta prioridade"
    }
  }

  if (tone.level === "medium") {
    return {
      primary: "Considerar Implementação",
      secondary: "Analisar Mais",
      urgency: "Prioridade média"
    }
  }

  return {
    primary: "Avaliar Possibilidade",
    secondary: "Coletar Mais Dados",
    urgency: "Baixa prioridade"
  }
}
