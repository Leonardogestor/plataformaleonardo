/**
 * Cálculos de analytics para planejamento (orçamento x realizado).
 */

export interface CategoryByMonth {
  category: string
  byMonth: { month: string; planned: number; actual: number }[]
}

/**
 * Índice de previsibilidade financeira (0–100): percentual de células
 * em que havia orçamento definido e o realizado ficou dentro do planejado.
 */
export function calcIndicePrevisibilidadeFinanceira(categories: CategoryByMonth[]): number {
  let totalComOrcamento = 0
  let dentroDoOrcamento = 0

  categories.forEach((row) => {
    row.byMonth.forEach((cell) => {
      if (cell.planned > 0) {
        totalComOrcamento += 1
        if (cell.actual <= cell.planned) dentroDoOrcamento += 1
      }
    })
  })

  if (totalComOrcamento === 0) return 0
  return Math.round((dentroDoOrcamento / totalComOrcamento) * 100)
}

/**
 * Taxa de execução do orçamento no período: total realizado / total planejado (%).
 * Se total planejado = 0, retorna 0.
 */
export function calcTaxaExecucaoOrcamento(categories: CategoryByMonth[]): number {
  let totalPlanned = 0
  let totalActual = 0

  categories.forEach((row) => {
    row.byMonth.forEach((cell) => {
      totalPlanned += cell.planned
      totalActual += cell.actual
    })
  })

  if (totalPlanned <= 0) return 0
  return Math.round((totalActual / totalPlanned) * 100)
}

export interface HeatmapExecucao {
  categories: string[]
  months: string[]
  /** matrix[categoryIndex][monthIndex] = taxa execução (0 = sem dado, 1 = 100%, >1 = estouro) */
  matrix: number[][]
}

/**
 * Heatmap de execução: por categoria e mês, taxa actual/planned.
 * Quando planned = 0, usa 0 (sem dado).
 */
export function calcHeatmapExecucao(
  categories: CategoryByMonth[],
  months: string[]
): HeatmapExecucao {
  const categoryNames = categories.map((c) => c.category)
  const matrix = categories.map((row) =>
    row.byMonth.map((cell) => {
      if (cell.planned <= 0) return 0
      return cell.actual / cell.planned
    })
  )
  return { categories: categoryNames, months, matrix }
}
