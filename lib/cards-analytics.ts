/**
 * Cálculos de analytics para cartões de crédito.
 * Usa parcelamentos (InstallmentGroup + Transaction) e limites dos cartões.
 */

export interface CardRow {
  id: string
  limit: number
}

export interface InstallmentGroupRow {
  id: string
  cardId: string
  totalValue: number
  totalInstallments: number
  totalPaid: number
  /** Número de parcelas já pagas (para cálculo de restante) */
  paidCount: number
}

export interface CardAnalyticsResult {
  renda_futura_comprometida: number
  endividamento_12_meses: number
  indicador_alavancagem: number
  por_cartao: {
    cardId: string
    limite: number
    uso_percentual: number
    divida_restante: number
  }[]
}

export function calcCardsAnalytics(
  cards: CardRow[],
  groups: InstallmentGroupRow[]
): CardAnalyticsResult {
  const totalLimit = cards.reduce((s, c) => s + c.limit, 0)
  const porCartao = new Map<string, { limite: number; divida: number }>()

  cards.forEach((c) => {
    porCartao.set(c.id, { limite: c.limit, divida: 0 })
  })

  let renda_futura_comprometida = 0
  let endividamento_12_meses = 0

  groups.forEach((g) => {
    const remaining = g.totalInstallments - g.paidCount
    if (remaining <= 0) return

    const installmentValue = g.totalValue / g.totalInstallments
    const totalToPay = g.totalValue - g.totalPaid
    const entry = porCartao.get(g.cardId)
    if (entry) {
      entry.divida += totalToPay
    }

    renda_futura_comprometida += installmentValue
    endividamento_12_meses += Math.min(remaining, 12) * installmentValue
  })

  const totalDebt = Array.from(porCartao.values()).reduce((s, e) => s + e.divida, 0)
  const indicador_alavancagem = totalLimit > 0 ? totalDebt / totalLimit : 0

  const por_cartao = cards.map((c) => {
    const e = porCartao.get(c.id) ?? { limite: c.limit, divida: 0 }
    const uso_percentual = e.limite > 0 ? (e.divida / e.limite) * 100 : 0
    return {
      cardId: c.id,
      limite: c.limite,
      uso_percentual,
      divida_restante: e.divida,
    }
  })

  return {
    renda_futura_comprometida,
    endividamento_12_meses,
    indicador_alavancagem,
    por_cartao,
  }
}
