/**
 * Insights Engine - Motor de análise e geração de narrativas
 * Transforma dados brutos em insights acionáveis e narrativas inteligentes
 */

import { Investment, AdvancedMetrics, PortfolioScore } from "./portfolioAnalytics"
import { SimulationResult } from "./portfolioSimulation"

export interface Insight {
  id: string
  type: "WARNING" | "OPPORTUNITY" | "RISK" | "SUCCESS" | "INFO"
  severity: "alta" | "media" | "baixa"
  title: string
  description: string
  impact: string
  actionability: "imediata" | "curto_prazo" | "longo_prazo" | "informativa"
  metrics?: string[]
}

export interface PortfolioNarrative {
  summary: string
  strengths: string[]
  concerns: string[]
  recommendations: string[]
  outlook: string
  score: number
  classification: string
}

export interface InsightRule {
  id: string
  condition: (data: InsightData) => boolean
  generate: (data: InsightData) => Insight
  priority: number
}

interface InsightData {
  investments: Investment[]
  metrics: AdvancedMetrics
  score: PortfolioScore
  recommendations: any[] // Using any temporarily since Recommendation interface doesn't exist
  simulation?: SimulationResult
}

/**
 * Gera insights inteligentes baseados em regras predefinidas
 */
export function generateInsights(data: InsightData): Insight[] {
  const insights: Insight[] = []
  const rules = getInsightRules()

  // Aplicar regras em ordem de prioridade
  rules
    .sort((a, b) => b.priority - a.priority)
    .forEach((rule) => {
      if (rule.condition(data)) {
        insights.push(rule.generate(data))
      }
    })

  // Limitar a 8 insights mais relevantes
  return insights.slice(0, 8)
}

/**
 * Define as regras de geração de insights
 */
function getInsightRules(): InsightRule[] {
  return [
    // Regras de Risco Crítico
    {
      id: "concentration-critical",
      priority: 100,
      condition: (data) => {
        const maxConcentration = getMaxConcentration(data.investments)
        return maxConcentration > 60
      },
      generate: (data) => ({
        id: "concentration-critical",
        type: "RISK",
        severity: "alta",
        title: "Concentração Extrema",
        description: `Seu portfólio tem mais de 60% concentrado em um único ativo, representando risco catastrófico.`,
        impact: "Perdas potenciais de até 60% do patrimônio em cenários adversos.",
        actionability: "imediata",
        metrics: ["concentration", "risk"],
      }),
    },

    // Regras de Performance
    {
      id: "underperformance-cdi",
      priority: 90,
      condition: (data) => {
        return data.metrics.benchmarkComparison.cdi.alpha < -2
      },
      generate: (data) => ({
        id: "underperformance-cdi",
        type: "WARNING",
        severity: "alta",
        title: "Performance Abaixo do CDI",
        description: `Seu portfólio está rendendo ${data.metrics.benchmarkComparison.cdi.return.toFixed(1)}% ao ano, ${Math.abs(data.metrics.benchmarkComparison.cdi.alpha).toFixed(1)} pontos percentuais abaixo do CDI.`,
        impact: "Perda de oportunidade de ganhos garantidos e seguros.",
        actionability: "curto_prazo",
        metrics: ["return", "benchmark"],
      }),
    },

    // Regras de Volatilidade
    {
      id: "high-volatility-low-return",
      priority: 85,
      condition: (data): boolean => {
        return !!(
          data.metrics.volatility &&
          data.metrics.volatility > 25 &&
          data.metrics.benchmarkComparison?.cdi?.alpha < 0
        )
      },
      generate: (data) => ({
        id: "high-volatility-low-return",
        type: "RISK",
        severity: "media",
        title: "Risco Desproporcional",
        description: `Você está assumindo volatilidade de ${data.metrics.volatility?.toFixed(1)}% ao ano com retorno abaixo do CDI.`,
        impact: "Relação risco-retorno desfavorável e exposição desnecessária ao risco.",
        actionability: "curto_prazo",
        metrics: ["volatility", "sharpe", "return"],
      }),
    },

    // Regras de Diversificação
    {
      id: "single-asset",
      priority: 80,
      condition: (data) => data.investments.length === 1,
      generate: (data) => ({
        id: "single-asset",
        type: "WARNING",
        severity: "alta",
        title: "Portfólio Não Diversificado",
        description:
          "Você possui apenas um investimento, eliminando completamente os benefícios da diversificação.",
        impact: "Risco total de ativo específico sem qualquer proteção.",
        actionability: "imediata",
        metrics: ["diversification", "concentration"],
      }),
    },

    // Regras de Sharpe Ratio
    {
      id: "poor-sharpe",
      priority: 75,
      condition: (data): boolean => {
        return !!(data.metrics.sharpeRatio && data.metrics.sharpeRatio < 0.3)
      },
      generate: (data) => ({
        id: "poor-sharpe",
        type: "WARNING",
        severity: "media",
        title: "Baixa Eficiência do Portfólio",
        description: `Sharpe Ratio de ${data.metrics.sharpeRatio?.toFixed(2)} indica baixa eficiência na relação risco-retorno.`,
        impact: "Retorno inadequado para o nível de risco assumido.",
        actionability: "curto_prazo",
        metrics: ["sharpe", "risk", "return"],
      }),
    },

    // Regras de Oportunidade
    {
      id: "good-performance",
      priority: 70,
      condition: (data) => {
        return data.metrics.benchmarkComparison.cdi.alpha > 5
      },
      generate: (data) => ({
        id: "good-performance",
        type: "SUCCESS",
        severity: "baixa",
        title: "Excelente Performance",
        description: `Seu portfólio está superando o CDI em ${data.metrics.benchmarkComparison.cdi.alpha.toFixed(1)} pontos percentuais.`,
        impact: "Geração de alfa consistente e acima da média de mercado.",
        actionability: "informativa",
        metrics: ["return", "benchmark", "alpha"],
      }),
    },

    // Regras de Drawdown
    {
      id: "high-drawdown-risk",
      priority: 65,
      condition: (data): boolean => {
        return !!(data.metrics.maxDrawdown && data.metrics.maxDrawdown > 40)
      },
      generate: (data) => ({
        id: "high-drawdown-risk",
        type: "RISK",
        severity: "media",
        title: "Alto Risco de Drawdown",
        description: `Seu portfólio tem potencial de queda máxima de ${data.metrics.maxDrawdown?.toFixed(1)}% baseado na volatilidade atual.`,
        impact: "Possibilidade de perdas significativas em períodos de crise.",
        actionability: "curto_prazo",
        metrics: ["drawdown", "volatility", "risk"],
      }),
    },

    // Regras de IRR
    {
      id: "negative-irr",
      priority: 95,
      condition: (data): boolean => {
        return !!(data.metrics.irr && data.metrics.irr < 0)
      },
      generate: (data) => ({
        id: "negative-irr",
        type: "RISK",
        severity: "alta",
        title: "Retorno Negativo",
        description: `Sua taxa interna de retorno (IRR) é de ${data.metrics.irr?.toFixed(1)}% ao ano, indicando perdas reais.`,
        impact: "Destruição de valor do patrimônio investido.",
        actionability: "imediata",
        metrics: ["irr", "return"],
      }),
    },
  ]
}

/**
 * Gera narrativa automática do portfólio
 */
export function generatePortfolioNarrative(
  investments: Investment[],
  metrics: AdvancedMetrics,
  score: PortfolioScore,
  insights: Insight[],
  recommendations: any[] // Using any temporarily since Recommendation interface doesn't exist
): PortfolioNarrative {
  const summary = generateSummary(metrics, score, insights)
  const strengths = generateStrengths(metrics, score, insights)
  const concerns = generateConcerns(metrics, score, insights)
  const outlook = generateOutlook(metrics, score, recommendations as any[])

  return {
    summary,
    strengths,
    concerns,
    recommendations: recommendations.map((r) => r.description),
    outlook,
    score: score.score,
    classification: score.classification,
  }
}

function generateSummary(
  metrics: AdvancedMetrics,
  score: PortfolioScore,
  insights: Insight[]
): string {
  const performance = metrics.benchmarkComparison.cdi.alpha > 0 ? "acima" : "abaixo"
  const riskLevel =
    score.breakdown.risk > 70 ? "baixo" : score.breakdown.risk < 40 ? "alto" : "moderado"
  const diversification =
    score.breakdown.diversification > 60 ? "bem diversificado" : "pouco diversificado"

  const criticalIssues = insights.filter((i) => i.severity === "alta").length

  let base = `Seu portfólio apresenta um score de ${score.score}/100, classificado como "${score.classification}". `
  base += `A performance está ${performance} do CDI, com nível de risco ${riskLevel} e está ${diversification}.`

  if (criticalIssues > 0) {
    base += ` Foram identificados ${criticalIssues} pontos críticos que requerem atenção imediata.`
  }

  return base
}

function generateStrengths(
  metrics: AdvancedMetrics,
  score: PortfolioScore,
  insights: Insight[]
): string[] {
  const strengths: string[] = []

  if (score.breakdown.return > 70) {
    strengths.push("Excelente performance de retorno, superando benchmarks de mercado")
  }

  if (score.breakdown.diversification > 70) {
    strengths.push("Boa diversificação entre diferentes classes de ativos")
  }

  if (score.breakdown.risk > 70) {
    strengths.push("Nível de risco controlado e adequado ao perfil")
  }

  if (score.breakdown.concentration > 70) {
    strengths.push("Concentração adequada sem exposição excessiva a ativos específicos")
  }

  if (metrics.sharpeRatio && metrics.sharpeRatio > 1) {
    strengths.push("Excelente relação risco-retorno (Sharpe Ratio alto)")
  }

  if (metrics.benchmarkComparison.ibovespa.outperformance) {
    strengths.push("Superando o IBOVESPA, demonstrando boa seleção de ativos")
  }

  return strengths
}

function generateConcerns(
  metrics: AdvancedMetrics,
  score: PortfolioScore,
  insights: Insight[]
): string[] {
  const concerns: string[] = []

  if (score.breakdown.return < 40) {
    concerns.push("Performance abaixo do esperado, possivelmente perdendo oportunidades")
  }

  if (score.breakdown.diversification < 40) {
    concerns.push("Falta de diversificação aumenta risco específico do portfólio")
  }

  if (score.breakdown.risk < 40) {
    concerns.push("Nível de risco elevado para o retorno obtido")
  }

  if (score.breakdown.concentration < 40) {
    concerns.push("Alta concentração em poucos ativos representa risco significativo")
  }

  if (metrics.volatility && metrics.volatility > 25) {
    concerns.push("Volatilidade elevada pode causar grandes oscilações no patrimônio")
  }

  if (metrics.maxDrawdown && metrics.maxDrawdown > 40) {
    concerns.push("Alto potencial de perdas máximas em cenários adversos")
  }

  return concerns
}

function generateOutlook(
  metrics: AdvancedMetrics,
  score: PortfolioScore,
  recommendations: any[] // Using any temporarily since Recommendation interface doesn't exist
): string {
  const hasHighPriority = recommendations.some((r) => r.priority === "alta")
  const hasMediumPriority = recommendations.some((r) => r.priority === "media")

  if (hasHighPriority) {
    return "Perspectiva cautelosa. Recomendações de alta prioridade devem ser implementadas imediatamente para mitigar riscos."
  }

  if (hasMediumPriority) {
    return "Perspectiva moderada. Ajustes de médio prazo podem melhorar significativamente a eficiência do portfólio."
  }

  if (score.score >= 70) {
    return "Perspectiva positiva. Portfólio bem estruturado com boas perspectivas de crescimento sustentável."
  }

  return "Perspectiva estável. Pequenos ajustes podem otimizar ainda mais os resultados."
}

function getMaxConcentration(investments: Investment[]): number {
  if (investments.length === 0) return 0

  const total = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  if (total <= 0) return 0

  const max = Math.max(...investments.map((inv) => inv.currentValue))
  return (max / total) * 100
}

/**
 * Categoriza insights por tipo e severidade
 */
export function categorizeInsights(insights: Insight[]) {
  return {
    critical: insights.filter((i) => i.severity === "alta"),
    warnings: insights.filter((i) => i.severity === "media"),
    info: insights.filter((i) => i.severity === "baixa"),
    byType: {
      risk: insights.filter((i) => i.type === "RISK"),
      warning: insights.filter((i) => i.type === "WARNING"),
      opportunity: insights.filter((i) => i.type === "OPPORTUNITY"),
      success: insights.filter((i) => i.type === "SUCCESS"),
      info: insights.filter((i) => i.type === "INFO"),
    },
  }
}
