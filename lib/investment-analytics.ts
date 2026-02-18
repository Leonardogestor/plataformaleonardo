/**
 * Cálculos de analytics para portfolio de investimentos.
 * Usa dados atuais (sem série histórica) com premissas por tipo de ativo.
 */

export type InvestmentType =
  | "STOCKS"
  | "BONDS"
  | "REAL_ESTATE"
  | "FIXED_INCOME"
  | "CRYPTO"
  | "FUNDS"
  | "OTHER"

export interface InvestmentRow {
  id: string
  name: string
  type: InvestmentType
  amount: number
  currentValue: number
  profitability: number | null
  acquiredAt: Date | string
}

export type RiscoPortfolio = "baixo" | "moderado" | "alto"

const RISCO_POR_TIPO: Record<InvestmentType, 1 | 2 | 3> = {
  FIXED_INCOME: 1,
  BONDS: 1,
  REAL_ESTATE: 2,
  FUNDS: 2,
  OTHER: 2,
  STOCKS: 3,
  CRYPTO: 3,
}

const VOLATILIDADE_ANUAL_POR_TIPO: Record<InvestmentType, number> = {
  FIXED_INCOME: 4,
  BONDS: 6,
  REAL_ESTATE: 12,
  FUNDS: 14,
  OTHER: 15,
  STOCKS: 18,
  CRYPTO: 60,
}

const TAXA_LIVRE_RISCO_AA = 10.5

function toNumber(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") return parseFloat(v) || 0
  return 0
}

export function calcRiscoConsolidadoPortfolio(investments: InvestmentRow[]): RiscoPortfolio {
  const total = investments.reduce((s, i) => s + i.currentValue, 0)
  if (total <= 0) return "moderado"

  let weighted = 0
  investments.forEach((i) => {
    const w = i.currentValue / total
    weighted += w * RISCO_POR_TIPO[i.type as InvestmentType]
  })

  if (weighted <= 1.4) return "baixo"
  if (weighted <= 2.2) return "moderado"
  return "alto"
}

/**
 * Índice de Sharpe simplificado: (retorno_portfolio - rf) / volatilidade_portfolio.
 * Retorno: rentabilidade média ponderada (usa profitability ou retorno implícito).
 * Volatilidade: média ponderada das volatilidades típicas por tipo.
 */
export function calcIndiceSharpe(investments: InvestmentRow[]): number | null {
  const total = investments.reduce((s, i) => s + i.currentValue, 0)
  if (total <= 0 || investments.length === 0) return null

  let retornoPond = 0
  let volPond = 0

  investments.forEach((i) => {
    const w = i.currentValue / total
    const retornoAA = getRetornoAnual(i)
    const vol = VOLATILIDADE_ANUAL_POR_TIPO[i.type as InvestmentType]
    retornoPond += w * retornoAA
    volPond += w * vol
  })

  if (volPond <= 0) return null
  const sharpe = (retornoPond - TAXA_LIVRE_RISCO_AA) / volPond
  return Math.round(sharpe * 100) / 100
}

function getRetornoAnual(i: InvestmentRow): number {
  if (i.profitability != null && !Number.isNaN(i.profitability)) return i.profitability
  const amount = i.amount
  if (amount <= 0) return 0
  const years = getAnosDesde(i.acquiredAt)
  if (years <= 0) return 0
  const totalReturn = (i.currentValue - amount) / amount
  const annualized = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100
  return annualized
}

function getAnosDesde(acquiredAt: Date | string): number {
  const from = new Date(acquiredAt).getTime()
  const now = Date.now()
  return (now - from) / (365.25 * 24 * 60 * 60 * 1000)
}

export interface ConcentracaoAtivo {
  id: string
  name: string
  type: InvestmentType
  currentValue: number
  percentual: number
}

export function calcConcentracaoPorAtivo(investments: InvestmentRow[]): ConcentracaoAtivo[] {
  const total = investments.reduce((s, i) => s + i.currentValue, 0)
  if (total <= 0) return []

  return investments.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type as InvestmentType,
    currentValue: i.currentValue,
    percentual: (i.currentValue / total) * 100,
  }))
}

/**
 * Renda passiva mensal estimada: soma de (valor_atual * rentabilidade_aa / 12) por ativo.
 */
export function calcRendaPassivaMensal(investments: InvestmentRow[]): number {
  let total = 0
  investments.forEach((i) => {
    const retornoAA = getRetornoAnual(i)
    total += (i.currentValue * retornoAA) / 100 / 12
  })
  return total
}

export interface SugestaoRebalanceamento {
  tipo: "concentracao" | "alocacao"
  prioridade: "alta" | "media" | "baixa"
  mensagem: string
  ativoOuTipo?: string
}

const ALVO_POR_TIPO: Record<InvestmentType, number> = {
  FIXED_INCOME: 35,
  BONDS: 15,
  REAL_ESTATE: 10,
  FUNDS: 15,
  OTHER: 5,
  STOCKS: 15,
  CRYPTO: 5,
}

const MAX_CONCENTRACAO_ATIVO = 40

export function calcSugestaoRebalanceamento(
  investments: InvestmentRow[],
  concentracao: ConcentracaoAtivo[]
): SugestaoRebalanceamento[] {
  const sugestoes: SugestaoRebalanceamento[] = []
  const total = investments.reduce((s, i) => s + i.currentValue, 0)
  if (total <= 0) return sugestoes

  const porTipo = new Map<InvestmentType, number>()
  investments.forEach((i) => {
    const t = i.type as InvestmentType
    porTipo.set(t, (porTipo.get(t) ?? 0) + i.currentValue)
  })

  const atualPorTipoPct = new Map<InvestmentType, number>()
  porTipo.forEach((val, tipo) => {
    atualPorTipoPct.set(tipo, (val / total) * 100)
  })

  Object.entries(ALVO_POR_TIPO).forEach(([tipo, alvo]) => {
    const atual = atualPorTipoPct.get(tipo as InvestmentType) ?? 0
    const diff = atual - alvo
    if (diff > 8) {
      sugestoes.push({
        tipo: "alocacao",
        prioridade: diff > 15 ? "alta" : "media",
        mensagem: `Reduzir exposição em ${tipo.replace("_", " ")} (atual ${atual.toFixed(0)}%, alvo ~${alvo}%).`,
        ativoOuTipo: tipo,
      })
    } else if (diff < -8) {
      sugestoes.push({
        tipo: "alocacao",
        prioridade: "baixa",
        mensagem: `Considerar aumentar diversificação em ${tipo.replace("_", " ")} (atual ${atual.toFixed(0)}%, alvo ~${alvo}%).`,
        ativoOuTipo: tipo,
      })
    }
  })

  concentracao.forEach((c) => {
    if (c.percentual >= MAX_CONCENTRACAO_ATIVO) {
      sugestoes.push({
        tipo: "concentracao",
        prioridade: c.percentual >= 60 ? "alta" : "media",
        mensagem: `Concentração alta em "${c.name}" (${c.percentual.toFixed(0)}%). Considere diversificar.`,
        ativoOuTipo: c.name,
      })
    }
  })

  sugestoes.sort((a, b) => {
    const p = { alta: 3, media: 2, baixa: 1 }
    return p[b.prioridade] - p[a.prioridade]
  })
  return sugestoes.slice(0, 5)
}

export function normalizeInvestmentRow(raw: {
  id: string
  name: string
  type: string
  amount: unknown
  currentValue: unknown
  profitability: unknown
  acquiredAt: unknown
}): InvestmentRow {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type as InvestmentType,
    amount: toNumber(raw.amount),
    currentValue: toNumber(raw.currentValue),
    profitability: raw.profitability != null ? toNumber(raw.profitability) : null,
    acquiredAt: raw.acquiredAt instanceof Date ? raw.acquiredAt : String(raw.acquiredAt),
  }
}
