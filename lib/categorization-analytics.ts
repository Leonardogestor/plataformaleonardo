/**
 * Métricas de categorização: taxa de erro e índice de inteligência do sistema.
 */

import { prisma } from "@/lib/db"

export interface RuleCondition {
  type?: "EXPENSE" | "INCOME"
  amountMin?: number
  amountMax?: number
  descriptionRegex?: string
}

function parseCondition(conditionJson: string | null): RuleCondition | null {
  if (!conditionJson?.trim()) return null
  try {
    const c = JSON.parse(conditionJson) as RuleCondition
    return c
  } catch {
    return null
  }
}

function ruleMatchesTransaction(
  rule: { pattern: string; conditionJson: string | null },
  description: string,
  type: string,
  amount: number
): boolean {
  const descLower = description.toLowerCase()
  if (!descLower.includes(rule.pattern.toLowerCase())) return false

  const cond = parseCondition(rule.conditionJson)
  if (!cond) return true

  if (cond.type != null && cond.type !== type) return false
  if (cond.amountMin != null && amount < cond.amountMin) return false
  if (cond.amountMax != null && amount > cond.amountMax) return false
  if (cond.descriptionRegex) {
    try {
      const re = new RegExp(cond.descriptionRegex, "i")
      if (!re.test(description)) return false
    } catch {
      return false
    }
  }
  return true
}

export async function getCategorizationMetrics(userId: string): Promise<{
  totalTransacoes: number
  cobertasPorRegra: number
  taxaErroCategorizacao: number
  indiceInteligenciaSistema: number
  outrosCount: number
  regrasAtivas: number
}> {
  const [rules, transactions] = await Promise.all([
    prisma.categoryRule.findMany({
      where: { userId, isActive: true },
      select: { pattern: true, conditionJson: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: { description: true, type: true, category: true, amount: true },
    }),
  ])

  const total = transactions.length
  if (total === 0) {
    return {
      totalTransacoes: 0,
      cobertasPorRegra: 0,
      taxaErroCategorizacao: 0,
      indiceInteligenciaSistema: 100,
      outrosCount: 0,
      regrasAtivas: rules.length,
    }
  }

  let cobertas = 0
  let outrosCount = 0
  const typeStr = (t: string) => (t === "INCOME" ? "INCOME" : "EXPENSE")

  for (const t of transactions) {
    const amount = Number(t.amount)
    const type = typeStr(t.type)
    const matched = rules.some((r) =>
      ruleMatchesTransaction(r, t.description, type, amount)
    )
    if (matched) cobertas++
    if (t.category === "Outros" || !t.category?.trim()) outrosCount++
  }

  const taxaErro = total > 0 ? (total - cobertas) / total : 0
  const cobertura = total > 0 ? cobertas / total : 0
  const outrosShare = total > 0 ? outrosCount / total : 0

  const scoreCobertura = cobertura * 50
  const scoreRegras = Math.min(1, rules.length / 30) * 25
  const scoreOutros = (1 - outrosShare) * 25
  const indiceInteligenciaSistema = Math.round(
    scoreCobertura + scoreRegras + scoreOutros
  )

  return {
    totalTransacoes: total,
    cobertasPorRegra: cobertas,
    taxaErroCategorizacao: Math.round(taxaErro * 10000) / 100,
    indiceInteligenciaSistema: Math.min(100, Math.max(0, indiceInteligenciaSistema)),
    outrosCount,
    regrasAtivas: rules.length,
  }
}

export { ruleMatchesTransaction, parseCondition }
