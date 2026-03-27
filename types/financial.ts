// Strict transaction model - NO amount sign logic
export type TransactionType = "income" | "expense" | "investment" | "investment_withdraw"

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category: string
  date: string
  status: "green" | "yellow" | "red"
  description: string
  userId: string
  createdAt: Date
  updatedAt: Date
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
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const despesas = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0) // expenses already negative in DB

  const investimentos = transactions
    .filter(t => t.type === "investment" || t.type === "investment_withdraw")
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
