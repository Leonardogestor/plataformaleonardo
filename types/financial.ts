// Strict transaction model - NO amount sign logic
export type TransactionType = "income" | "expense" | "investment" | "investment_withdraw"

export interface Transaction {
  id: string
  valor: number // padronizado conforme planilha
  tipo: TransactionType
  categoria: string
  data: string
  status: "green" | "yellow" | "red"
  descricao: string
  usuarioId: string
  criadoEm: Date
  atualizadoEm: Date
}

// 🧩 ESTRUTURA HÍBRIDA - Manual + Automático
export interface FinancialField {
  valor: number
  manual: boolean
}

export interface MonthlyProjection {
  mes: number
  ano: number

  receita: FinancialField
  despesas: FinancialField
  percentualInvestimento: FinancialField

  investimento: number
  resultado: number
  taxaEconomia: number

  criadoEm: Date
  atualizadoEm: Date
}

export interface FinancialCalculations {
  receitas: number
  despesas: number
  investimentos: number
  resultado: number
  savingsRate: number
  saldo_anterior: number
  saldo_final: number
}

export interface MonthlyData {
  month: number
  year: number
  calculations: FinancialCalculations
  transactions: Transaction[]
  projection?: MonthlyProjection
}

// 🧠 FUNÇÃO CENTRAL - Lógica Híbrida
export function getValorMes(
  mesAtual: FinancialField,
  mesAnterior: FinancialField,
  padrao: number
): FinancialField {
  if (mesAtual.isManual) {
    return mesAtual
  } else {
    return {
      value: mesAnterior?.value || padrao,
      isManual: false,
    }
  }
}

// 🧠 CÁLCULO DE INVESTIMENTO VARIÁVEL
export function calcularInvestimento(
  receita: FinancialField,
  percentual: FinancialField,
  percentualPadrao: number = 0.2
): number {
  const percentualUsar = percentual.isManual ? percentual.value : percentualPadrao
  return receita.value * percentualUsar
}

// 🧠 CÁLCULO COMPLETO DO MÊS
export function calcularMes(
  projection: MonthlyProjection,
  projectionAnterior?: MonthlyProjection,
  percentualPadrao: number = 0.2
): MonthlyProjection {
  // 1. Aplicar lógica híbrida
  const receitaFinal = getValorMes(
    projection.receita,
    projectionAnterior?.receita ?? { value: 0, isManual: false },
    0
  )
  const despesasFinal = getValorMes(
    projection.despesas,
    projectionAnterior?.despesas ?? { value: 0, isManual: false },
    0
  )
  const percentualFinal = getValorMes(
    projection.percentualInvestimento,
    projectionAnterior?.percentualInvestimento ?? { value: 0.2, isManual: false },
    percentualPadrao
  )

  // 2. Calcular valores derivados
  const investimento = calcularInvestimento(receitaFinal, percentualFinal, percentualPadrao)
  const resultado = receitaFinal.value - Math.abs(despesasFinal.value) - investimento
  const savingsRate = receitaFinal.value > 0 ? resultado / receitaFinal.value : 0

  return {
    ...projection,
    receita: receitaFinal,
    despesas: despesasFinal,
    percentualInvestimento: percentualFinal,
    investimento,
    resultado,
    savingsRate,
  }
}

// Farol classification based on savings rate
export function classifyFarol(savingsRate: number): "green" | "yellow" | "red" {
  if (savingsRate >= 0.2) return "green"
  if (savingsRate >= 0.05) return "yellow"
  return "red"
}

// Calculate financial metrics based on TYPE, not amount sign
export function calculateFinancialMetrics(transactions: Transaction[]): {
  receitas: number
  despesas: number
  investimentos: number
  resultado: number
  savingsRate: number
} {
  const receitas = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const despesas = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0) // expenses already negative in DB

  const investimentos = transactions
    .filter((t) => t.type === "investment" || t.type === "investment_withdraw")
    .reduce((sum, t) => {
      if (t.type === "investment") return sum - Math.abs(t.amount) // negative
      if (t.type === "investment_withdraw") return sum + Math.abs(t.amount) // positive
      return sum
    }, 0)

  const resultado = receitas + despesas + investimentos
  const savingsRate = receitas > 0 ? resultado / receitas : 0

  return {
    receitas,
    despesas,
    investimentos,
    resultado,
    savingsRate,
  }
}
