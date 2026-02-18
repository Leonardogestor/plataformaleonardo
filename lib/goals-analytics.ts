/**
 * Analytics para metas financeiras: classificação, impacto no patrimônio, conflitos.
 */

export type ClassificacaoEstrategica = "URGENTE" | "CURTO_PRAZO" | "MEDIO_PRAZO" | "LONGO_PRAZO"

export interface GoalRow {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: Date | string
  status: string
  monthlyTarget: number
  remaining: number
}

/**
 * Classificação estratégica pelo prazo até o deadline.
 * URGENTE: < 3 meses | CURTO: 3–12 | MÉDIO: 12–36 | LONGO: > 36 meses
 */
export function getClassificacaoEstrategica(goal: GoalRow): ClassificacaoEstrategica {
  const deadline = typeof goal.deadline === "string" ? new Date(goal.deadline) : goal.deadline
  const now = new Date()
  const monthsRemaining = (deadline.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)

  if (monthsRemaining < 3) return "URGENTE"
  if (monthsRemaining < 12) return "CURTO_PRAZO"
  if (monthsRemaining < 36) return "MEDIO_PRAZO"
  return "LONGO_PRAZO"
}

export interface ImpactoPatrimonio {
  totalComprometido: number
  percentualPatrimonio: number
  patrimonioLiquido: number
}

export function calcImpactoNoPatrimonio(
  goals: GoalRow[],
  patrimonioLiquido: number
): ImpactoPatrimonio {
  const active = goals.filter((g) => g.status === "ACTIVE")
  const totalComprometido = active.reduce((s, g) => s + g.currentAmount, 0)
  const percentualPatrimonio =
    patrimonioLiquido > 0 ? (totalComprometido / patrimonioLiquido) * 100 : 0
  return {
    totalComprometido,
    percentualPatrimonio,
    patrimonioLiquido,
  }
}

export interface ConflitoEntreMetas {
  conflito: boolean
  totalNecessarioMensal: number
  disponivelMensal: number
  deficit: number
  metasEmConflito: { goalId: string; name: string; monthlyTarget: number }[]
}

/**
 * Conflito quando a soma dos aportes mensais necessários supera o disponível.
 */
export function detectarConflitoEntreMetas(
  goals: GoalRow[],
  disponivelMensal: number
): ConflitoEntreMetas {
  const active = goals.filter((g) => g.status === "ACTIVE" && g.remaining > 0)
  const totalNecessarioMensal = active.reduce((s, g) => s + g.monthlyTarget, 0)
  const conflito = totalNecessarioMensal > disponivelMensal
  const deficit = conflito ? totalNecessarioMensal - disponivelMensal : 0
  const metasEmConflito = active.map((g) => ({
    goalId: g.id,
    name: g.name,
    monthlyTarget: g.monthlyTarget,
  }))
  return {
    conflito,
    totalNecessarioMensal,
    disponivelMensal,
    deficit,
    metasEmConflito,
  }
}

/**
 * Simulador: com um aporte mensal extra, em quantos meses a meta é concluída?
 */
export function simularAceleracao(
  monthlyTarget: number,
  remaining: number,
  aporteExtraMensal: number
): { mesesParaConcluir: number; mesesAntes: number; novoAporteMensal: number } {
  const novoAporteMensal = monthlyTarget + aporteExtraMensal
  if (novoAporteMensal <= 0) return { mesesParaConcluir: 0, mesesAntes: 0, novoAporteMensal: 0 }
  const mesesParaConcluir = Math.ceil(remaining / novoAporteMensal)
  const mesesAtual = monthlyTarget > 0 ? Math.ceil(remaining / monthlyTarget) : 0
  const mesesAntes = Math.max(0, mesesAtual - mesesParaConcluir)
  return { mesesParaConcluir, mesesAntes, novoAporteMensal }
}
