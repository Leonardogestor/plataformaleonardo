/**
 * Core Financial Engine - Portfolio Analytics
 * Implementa métricas avançadas para análise de portfólio
 */

export interface Investment {
  id: string
  name: string
  type: "STOCKS" | "BONDS" | "REAL_ESTATE" | "FIXED_INCOME" | "CRYPTO" | "FUNDS" | "OTHER"
  amount: number
  currentValue: number
  profitability: number | null
  acquiredAt: Date | string
  movements?: Array<{
    date: Date | string
    amount: number
    type: "APORTE" | "RETIRADA"
  }>
}

export interface CashFlow {
  date: Date
  amount: number
}

export interface BenchmarkData {
  name: string
  currentReturn: number
  historicalReturns: number[]
}

export interface AdvancedMetrics {
  // IRR (XIRR)
  irr: number | null

  // Benchmark Comparison
  benchmarkComparison: {
    cdi: { return: number; alpha: number; outperformance: boolean }
    ibovespa: { return: number; alpha: number; outperformance: boolean }
    sp500: { return: number; alpha: number; outperformance: boolean }
  }

  // Risk Metrics
  volatility: number | null
  maxDrawdown: number | null
  sharpeRatio: number | null

  // Portfolio Summary
  totalInvested: number
  totalCurrent: number
  totalReturn: number
  totalReturnPct: number
}

export interface PortfolioScore {
  score: number
  classification: "Crítico" | "Ruim" | "Regular" | "Bom" | "Excelente"
  breakdown: {
    diversification: number
    risk: number
    return: number
    concentration: number
  }
  factors: {
    diversificationScore: number
    riskScore: number
    returnScore: number
    concentrationScore: number
  }
}

// Constantes para benchmarks (valores anuais)
const BENCHMARK_RATES = {
  CDI: 10.75, // % ao ano
  IBOVESPA: 15.2, // % ao ano (média histórica)
  SP500: 12.8, // % ao ano (média histórica em BRL)
  RISK_FREE_RATE: 10.75, // CDI como taxa livre de risco
}

// Volatilidade esperada por tipo de ativo (% ao ano)
const ASSET_VOLATILITY = {
  FIXED_INCOME: 4,
  BONDS: 6,
  REAL_ESTATE: 12,
  FUNDS: 14,
  OTHER: 15,
  STOCKS: 18,
  CRYPTO: 60,
}

// Risco ponderado por tipo de ativo
const ASSET_RISK_WEIGHT = {
  FIXED_INCOME: 1,
  BONDS: 1,
  REAL_ESTATE: 2,
  FUNDS: 2,
  OTHER: 2,
  STOCKS: 3,
  CRYPTO: 3,
}

/**
 * Calcula IRR (Taxa Interna de Retorno) usando XIRR para cash flows irregulares
 */
export function calculateXIRR(investments: Investment[]): number | null {
  if (investments.length === 0) return null

  const cashFlows: CashFlow[] = []

  investments.forEach((investment) => {
    // Fluxo de saída (investimento inicial)
    cashFlows.push({
      date: new Date(investment.acquiredAt),
      amount: -investment.amount,
    })

    // Adicionar aportes subsequentes se existirem
    if (investment.movements) {
      investment.movements.forEach((movement) => {
        cashFlows.push({
          date: new Date(movement.date),
          amount: movement.type === "APORTE" ? -movement.amount : movement.amount,
        })
      })
    }
  })

  // Fluxo de entrada (valor atual)
  cashFlows.push({
    date: new Date(),
    amount: investments.reduce((sum, inv) => sum + inv.currentValue, 0),
  })

  if (cashFlows.length < 2) return null

  // Implementação simplificada do XIRR usando Newton-Raphson
  return calculateXIRRIterative(cashFlows)
}

function calculateXIRRIterative(cashFlows: CashFlow[]): number | null {
  let rate = 0.1 // chute inicial de 10%
  const maxIterations = 100
  const tolerance = 1e-6

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let dnpv = 0

    const firstDate = cashFlows[0]?.date?.getTime() || 0

    for (const cf of cashFlows) {
      const days = (cf.date.getTime() - firstDate) / (1000 * 60 * 60 * 24)
      const factor = Math.pow(1 + rate, days / 365)

      npv += cf.amount / factor
      dnpv -= ((days / 365) * cf.amount) / (factor * (1 + rate))
    }

    if (Math.abs(npv) < tolerance) {
      return rate * 100 // converter para percentual
    }

    if (Math.abs(dnpv) < tolerance) break

    rate = rate - npv / dnpv

    // Evitar taxas negativas extremas
    if (rate < -0.99) rate = -0.99
    if (rate > 10) rate = 10
  }

  return rate * 100
}

/**
 * Calcula retorno do portfólio para comparação com benchmarks
 */
export function calculatePortfolioReturn(investments: Investment[]): number {
  if (investments.length === 0) return 0

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0)

  if (totalInvested <= 0) return 0

  // Calcular retorno anualizado baseado no tempo médio
  const avgYears = calculateAverageInvestmentPeriod(investments)
  if (avgYears <= 0) return 0

  const totalReturn = (totalCurrent - totalInvested) / totalInvested
  const annualizedReturn = (Math.pow(1 + totalReturn, 1 / avgYears) - 1) * 100

  return annualizedReturn
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

/**
 * Compara performance com benchmarks
 */
export function calculateBenchmarkComparison(portfolioReturn: number) {
  const benchmarks = ["cdi", "ibovespa", "sp500"] as const

  return benchmarks.reduce(
    (acc, benchmark) => {
      const benchmarkReturn =
        BENCHMARK_RATES[benchmark.toUpperCase() as keyof typeof BENCHMARK_RATES]
      const alpha = portfolioReturn - benchmarkReturn

      acc[benchmark] = {
        return: portfolioReturn,
        alpha: alpha,
        outperformance: alpha > 0,
      }

      return acc
    },
    {} as AdvancedMetrics["benchmarkComparison"]
  )
}

/**
 * Calcula volatilidade do portfólio
 */
export function calculateVolatility(investments: Investment[]): number | null {
  if (investments.length === 0) return null

  const total = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  if (total <= 0) return null

  let weightedVolatility = 0

  investments.forEach((inv) => {
    const weight = inv.currentValue / total
    const assetVol = ASSET_VOLATILITY[inv.type] || 15
    weightedVolatility += weight * assetVol
  })

  return weightedVolatility
}

/**
 * Calcula drawdown máximo (simplificado - baseado em dados atuais)
 */
export function calculateMaxDrawdown(investments: Investment[]): number | null {
  if (investments.length === 0) return null

  // Como não temos série histórica, estimamos baseado na volatilidade
  const volatility = calculateVolatility(investments)
  if (!volatility) return null

  // Regra empírica: drawdown máximo ≈ 2-3x volatilidade anual
  return Math.min(volatility * 2.5, 95) // capped at 95%
}

/**
 * Calcula Sharpe Ratio
 */
export function calculateSharpeRatio(
  portfolioReturn: number,
  volatility: number | null
): number | null {
  if (!volatility || volatility <= 0) return null

  const excessReturn = portfolioReturn - BENCHMARK_RATES.RISK_FREE_RATE
  return excessReturn / volatility
}

/**
 * Calcula todas as métricas avançadas do portfólio
 */
export function calculateAdvancedMetrics(investments: Investment[]): AdvancedMetrics {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const totalReturn = totalCurrent - totalInvested
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const portfolioReturn = calculatePortfolioReturn(investments)
  const volatility = calculateVolatility(investments)
  const maxDrawdown = calculateMaxDrawdown(investments)
  const sharpeRatio = calculateSharpeRatio(portfolioReturn, volatility)
  const irr = calculateXIRR(investments)
  const benchmarkComparison = calculateBenchmarkComparison(portfolioReturn)

  return {
    irr,
    benchmarkComparison,
    volatility,
    maxDrawdown,
    sharpeRatio,
    totalInvested,
    totalCurrent,
    totalReturn,
    totalReturnPct,
  }
}

/**
 * Calcula score do portfólio (0-100)
 */
export function calculatePortfolioScore(investments: Investment[]): PortfolioScore {
  const metrics = calculateAdvancedMetrics(investments)
  const total = metrics.totalCurrent

  if (investments.length === 0 || total <= 0) {
    return {
      score: 0,
      classification: "Crítico",
      breakdown: { diversification: 0, risk: 0, return: 0, concentration: 0 },
      factors: { diversificationScore: 0, riskScore: 0, returnScore: 0, concentrationScore: 0 },
    }
  }

  // 1. Score de Diversificação (0-100)
  const types = new Set(investments.map((inv) => inv.type))
  const diversificationScore = Math.min((types.size / 7) * 100, 100)

  // 2. Score de Risco (0-100) - baseado na volatilidade
  let riskScore = 100
  if (metrics.volatility) {
    if (metrics.volatility > 30) riskScore = 20
    else if (metrics.volatility > 20) riskScore = 40
    else if (metrics.volatility > 15) riskScore = 60
    else if (metrics.volatility > 10) riskScore = 80
  }

  // 3. Score de Retorno (0-100) - baseado na performance vs CDI
  let returnScore = 50 // base
  const portfolioReturn = calculatePortfolioReturn(investments)
  const alphaVsCDI = portfolioReturn - BENCHMARK_RATES.CDI

  if (alphaVsCDI > 5) returnScore = 90
  else if (alphaVsCDI > 2) returnScore = 75
  else if (alphaVsCDI > 0) returnScore = 60
  else if (alphaVsCDI > -2) returnScore = 45
  else if (alphaVsCDI > -5) returnScore = 30
  else returnScore = 15

  // 4. Score de Concentração (0-100)
  const concentrations = investments.map((inv) => inv.currentValue / total)
  const maxConcentration = Math.max(...concentrations)
  let concentrationScore = 100

  if (maxConcentration > 0.6) concentrationScore = 20
  else if (maxConcentration > 0.5) concentrationScore = 40
  else if (maxConcentration > 0.4) concentrationScore = 60
  else if (maxConcentration > 0.3) concentrationScore = 80

  // Cálculo do score final (pesos: 25% cada)
  const finalScore =
    diversificationScore * 0.25 + riskScore * 0.25 + returnScore * 0.25 + concentrationScore * 0.25

  // Classificação
  let classification: PortfolioScore["classification"] = "Crítico"
  if (finalScore >= 80) classification = "Excelente"
  else if (finalScore >= 65) classification = "Bom"
  else if (finalScore >= 45) classification = "Regular"
  else if (finalScore >= 25) classification = "Ruim"

  return {
    score: Math.round(finalScore),
    classification,
    breakdown: {
      diversification: Math.round(diversificationScore),
      risk: Math.round(riskScore),
      return: Math.round(returnScore),
      concentration: Math.round(concentrationScore),
    },
    factors: {
      diversificationScore: Math.round(diversificationScore),
      riskScore: Math.round(riskScore),
      returnScore: Math.round(returnScore),
      concentrationScore: Math.round(concentrationScore),
    },
  }
}
