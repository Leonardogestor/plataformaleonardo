/**
 * Analytics para contas: liquidez, custo de oportunidade, patrimônio improdutivo.
 */

export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "CASH" | "OTHER"
export type Liquidez = "alta" | "média" | "baixa"

export interface AccountRow {
  id: string
  type: AccountType
  balance: number
}

const LIQUIDEZ_POR_TIPO: Record<AccountType, Liquidez> = {
  CASH: "alta",
  CHECKING: "alta",
  SAVINGS: "alta",
  OTHER: "média",
  INVESTMENT: "baixa",
}

const ORDEM_LIQUIDEZ: Record<Liquidez, number> = {
  alta: 0,
  média: 1,
  baixa: 2,
}

/** Classificação de liquidez por tipo de conta */
export function getLiquidezPorTipo(type: AccountType): Liquidez {
  return LIQUIDEZ_POR_TIPO[type] ?? "média"
}

/** Ordena contas: maior liquidez primeiro */
export function sortByLiquidez<T extends { type: AccountType }>(accounts: T[]): T[] {
  return [...accounts].sort(
    (a, b) => ORDEM_LIQUIDEZ[getLiquidezPorTipo(a.type as AccountType)] - ORDEM_LIQUIDEZ[getLiquidezPorTipo(b.type as AccountType)]
  )
}

/** Tipos considerados improdutivos (não rendem ou rendem muito pouco) */
const TIPOS_IMPRODUTIVOS: AccountType[] = ["CHECKING", "CASH"]

/** Taxa de referência mensal para custo de oportunidade (ex.: CDI ~0,9% a.m.) */
const TAXA_REFERENCIA_MENSAL = 0.009

/**
 * Custo de oportunidade mensal: valor que deixaria de render se estivesse
 * aplicado à taxa de referência (conta corrente e dinheiro parado).
 */
export function calcCustoOportunidadeMensal(accounts: AccountRow[]): number {
  return accounts
    .filter((a) => TIPOS_IMPRODUTIVOS.includes(a.type as AccountType))
    .reduce((s, a) => s + Math.max(0, a.balance) * TAXA_REFERENCIA_MENSAL, 0)
}

/**
 * Percentual do patrimônio em contas improdutivas (corrente + dinheiro)
 * sobre o total de saldos.
 */
export function calcPercentualPatrimonioImprodutivo(accounts: AccountRow[]): number {
  const total = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0)
  if (total <= 0) return 0
  const improdutivo = accounts
    .filter((a) => TIPOS_IMPRODUTIVOS.includes(a.type as AccountType))
    .reduce((s, a) => s + Math.max(0, a.balance), 0)
  return (improdutivo / total) * 100
}
