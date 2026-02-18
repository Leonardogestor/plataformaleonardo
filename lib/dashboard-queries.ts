import { prisma } from "./db"

interface DashboardMetrics {
  netWorth: number
  monthIncome: number
  monthExpense: number
  cashFlow: number
  savingsRate: number
}

interface CategoryData {
  category: string
  total: number
  percentage: number
  count: number
}

interface MonthlyData {
  month: string
  income: number
  expense: number
  netWorth: number
}

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId, isActive: true },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      select: { type: true, amount: true },
    }),
  ])

  const netWorth = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0)
  
  const monthIncome = transactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  
  const monthExpense = transactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  
  const cashFlow = monthIncome - monthExpense
  const savingsRate = monthIncome > 0 ? (cashFlow / monthIncome) * 100 : 0

  return { netWorth, monthIncome, monthExpense, cashFlow, savingsRate }
}

export async function getCategoryBreakdown(userId: string): Promise<CategoryData[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    select: { category: true, amount: true },
  })

  const categoryMap = new Map<string, { total: number; count: number }>()
  let totalExpenses = 0

  transactions.forEach((t: any) => {
    const amount = Number(t.amount)
    totalExpenses += amount
    const current = categoryMap.get(t.category) || { total: 0, count: 0 }
    categoryMap.set(t.category, {
      total: current.total + amount,
      count: current.count + 1,
    })
  })

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
}

export async function getMonthlyEvolution(userId: string): Promise<MonthlyData[]> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: sixMonthsAgo },
    },
    select: { type: true, amount: true, date: true },
    orderBy: { date: "asc" },
  })

  const monthlyMap = new Map<string, { income: number; expense: number }>()

  transactions.forEach((t: any) => {
    const month = new Date(t.date).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
    })
    const amount = Number(t.amount)
    const current = monthlyMap.get(month) || { income: 0, expense: 0 }

    if (t.type === "INCOME") {
      current.income += amount
    } else if (t.type === "EXPENSE") {
      current.expense += amount
    }

    monthlyMap.set(month, current)
  })

  let runningBalance = 0
  return Array.from(monthlyMap.entries()).map(([month, data]) => {
    runningBalance += data.income - data.expense
    return {
      month,
      income: data.income,
      expense: data.expense,
      netWorth: runningBalance,
    }
  })
}

export async function getRecentTransactions(userId: string, limit = 10) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      account: { select: { name: true, institution: true } },
      card: { select: { name: true, brand: true } },
    },
  })
}

export async function getInsights(userId: string) {
  const [metrics, categories, monthlyData] = await Promise.all([
    getDashboardMetrics(userId),
    getCategoryBreakdown(userId),
    getMonthlyEvolution(userId),
  ])

  const insights: string[] = []

  // Insight 1: Categoria dominante
  if (categories.length > 0) {
    const topCategory = categories[0]
    if (topCategory) {
      if (topCategory.percentage > 40) {
        insights.push(
          `⚠️ Atenção! ${topCategory.category} representa ${topCategory.percentage.toFixed(0)}% dos seus gastos - concentração muito alta.`
        )
      } else if (topCategory.percentage > 25) {
        insights.push(
          `📊 ${topCategory.category} é sua maior despesa (${topCategory.percentage.toFixed(0)}%).`
        )
      } else {
        insights.push(
          `✅ Gastos bem distribuídos - ${topCategory.category} representa apenas ${topCategory.percentage.toFixed(0)}%.`
        )
      }
    }
  }

  // Insight 2: Taxa de poupança
  if (metrics.savingsRate > 30) {
    insights.push(
      `🎯 Excelente! Você economizou ${metrics.savingsRate.toFixed(0)}% da sua receita - acima do ideal de 20%.`
    )
  } else if (metrics.savingsRate > 20) {
    insights.push(
      `✨ Muito bom! Taxa de poupança de ${metrics.savingsRate.toFixed(0)}% está no objetivo recomendado.`
    )
  } else if (metrics.savingsRate > 10) {
    insights.push(
      `📈 Você economizou ${metrics.savingsRate.toFixed(0)}%. Tente alcançar 20% para segurança financeira.`
    )
  } else if (metrics.savingsRate > 0) {
    insights.push(
      `⚡ Taxa de poupança de ${metrics.savingsRate.toFixed(0)}% está baixa. Revise despesas não essenciais.`
    )
  } else if (metrics.cashFlow < 0) {
    const deficit = Math.abs(metrics.cashFlow)
    insights.push(
      `🚨 Déficit de R$ ${deficit.toFixed(2)}! Suas despesas superaram sua receita este mês.`
    )
  }

  // Insight 3: Tendência de despesas
  if (monthlyData.length >= 2) {
    const currentMonth = monthlyData[monthlyData.length - 1]
    const previousMonth = monthlyData[monthlyData.length - 2]
    
    if (currentMonth && previousMonth && previousMonth.expense > 0) {
      const expenseChange =
        ((currentMonth.expense - previousMonth.expense) / previousMonth.expense) * 100

      if (expenseChange > 20) {
        insights.push(
          `📈 Alerta: Suas despesas aumentaram ${expenseChange.toFixed(0)}% no último mês. Investigue o motivo.`
        )
      } else if (expenseChange > 10) {
        insights.push(
          `📊 Suas despesas cresceram ${expenseChange.toFixed(0)}% em relação ao mês anterior.`
        )
      } else if (expenseChange < -20) {
        insights.push(
          `🎉 Parabéns! Você reduziu suas despesas em ${Math.abs(expenseChange).toFixed(0)}% no último mês.`
        )
      } else if (expenseChange < -10) {
        insights.push(
          `✅ Bom trabalho! Despesas diminuíram ${Math.abs(expenseChange).toFixed(0)}%.`
        )
      }
    }
  }

  // Insight 4: Evolução patrimonial (3 meses)
  if (monthlyData.length >= 3) {
    const lastThreeMonths = monthlyData.slice(-3)
    const allPositive = lastThreeMonths.every(m => (m.income - m.expense) > 0)
    const allNegative = lastThreeMonths.every(m => (m.income - m.expense) < 0)
    
    if (allPositive) {
      insights.push(
        `🚀 Tendência excelente! Fluxo de caixa positivo nos últimos 3 meses consecutivos.`
      )
    } else if (allNegative) {
      insights.push(
        `⚠️ Atenção: Déficit nos últimos 3 meses. Ação urgente necessária para reverter a tendência.`
      )
    }
  }

  // Insight 5: Patrimônio líquido e reserva
  if (metrics.netWorth < 0) {
    insights.push(
      `🔴 Patrimônio líquido negativo de R$ ${Math.abs(metrics.netWorth).toFixed(2)}. Priorize redução de dívidas.`
    )
  } else if (metrics.netWorth > 0 && metrics.monthIncome > 0) {
    const monthsOfReserve = metrics.netWorth / metrics.monthIncome
    if (monthsOfReserve >= 12) {
      insights.push(
        `💰 Excelente! Seu patrimônio cobre ${monthsOfReserve.toFixed(0)} meses de despesas - reserva sólida.`
      )
    } else if (monthsOfReserve >= 6) {
      insights.push(
        `👍 Bom! Você tem ${monthsOfReserve.toFixed(0)} meses de reserva de emergência.`
      )
    } else if (monthsOfReserve >= 3) {
      insights.push(
        `📊 Reserva de ${monthsOfReserve.toFixed(0)} meses. Meta ideal: 6-12 meses de despesas.`
      )
    } else if (monthsOfReserve > 0) {
      insights.push(
        `⚡ Reserva de apenas ${monthsOfReserve.toFixed(1)} mês. Construa emergência de 6 meses.`
      )
    }
  }

  // Insight 6: Diversificação de categorias
  if (categories.length >= 2 && categories.length <= 3) {
    insights.push(
      `🎯 Despesas concentradas em ${categories.length} categorias. Considere diversificar gastos.`
    )
  } else if (categories.length >= 7) {
    insights.push(
      `📊 Gastos distribuídos em ${categories.length} categorias - boa diversificação.`
    )
  }

  // Insight 7: Receita vs Despesa (intensidade)
  if (metrics.monthIncome > 0 && metrics.monthExpense > 0) {
    const expenseRatio = (metrics.monthExpense / metrics.monthIncome) * 100
    
    if (expenseRatio > 100) {
      insights.push(
        `🚨 Gastando ${expenseRatio.toFixed(0)}% da receita! Corte imediato necessário.`
      )
    } else if (expenseRatio > 90) {
      insights.push(
        `⚠️ Você está gastando ${expenseRatio.toFixed(0)}% da sua renda. Margem muito apertada.`
      )
    } else if (expenseRatio < 50) {
      insights.push(
        `🌟 Excelente controle! Gastando apenas ${expenseRatio.toFixed(0)}% da receita.`
      )
    }
  }

  return insights.slice(0, 5) // Limitar a 5 insights mais relevantes
}

export type RiscoConsolidado = "baixo" | "moderado" | "alto"
export type TendenciaPatrimonial = "ascendente" | "estável" | "descendente"

export async function getRiscoConsolidado(userId: string): Promise<RiscoConsolidado> {
  const metrics = await getDashboardMetrics(userId)
  const expenseRatio = metrics.monthIncome > 0
    ? (metrics.monthExpense / metrics.monthIncome) * 100
    : 100

  if (metrics.netWorth < 0 || expenseRatio > 100 || metrics.savingsRate < 0) return "alto"
  if (expenseRatio > 85 || metrics.savingsRate < 10) return "moderado"
  return "baixo"
}

export async function getTendenciaPatrimonial(userId: string): Promise<TendenciaPatrimonial> {
  const monthlyData = await getMonthlyEvolution(userId)
  if (monthlyData.length < 2) return "estável"

  const last = monthlyData[monthlyData.length - 1]!.netWorth
  const prev = monthlyData[monthlyData.length - 2]!.netWorth
  const diff = last - prev
  const threshold = Math.abs(prev) * 0.05 || 100

  if (diff > threshold) return "ascendente"
  if (diff < -threshold) return "descendente"
  return "estável"
}

export async function getInsightsEstrategicos(userId: string): Promise<{
  impacto_longo_prazo: string | null
  decisao_recomendada: string | null
}> {
  const [metrics, monthlyData] = await Promise.all([
    getDashboardMetrics(userId),
    getMonthlyEvolution(userId),
  ])

  let impacto_longo_prazo: string | null = null
  let decisao_recomendada: string | null = null

  const expenseRatio = metrics.monthIncome > 0
    ? (metrics.monthExpense / metrics.monthIncome) * 100
    : 0
  const monthsReserve = metrics.monthExpense > 0 ? metrics.netWorth / metrics.monthExpense : 0

  if (metrics.savingsRate >= 20 && metrics.netWorth > 0) {
    impacto_longo_prazo = `Poupar ${metrics.savingsRate.toFixed(0)}% da renda e patrimônio positivo reforçam sua segurança futura e capacidade de investir a longo prazo.`
  } else if (metrics.cashFlow < 0) {
    impacto_longo_prazo = `Déficit recorrente reduz patrimônio e adia metas. Reverter isso é prioritário para não comprometer o longo prazo.`
  } else if (monthsReserve < 6 && metrics.monthExpense > 0) {
    impacto_longo_prazo = `Com menos de 6 meses de reserva, qualquer imprevisto pode afetar investimentos e metas de longo prazo.`
  } else if (monthlyData.length >= 3) {
    const lastThree = monthlyData.slice(-3).map((m) => m.income - m.expense)
    const avgFlow = lastThree.reduce((a, b) => a + b, 0) / 3
    if (avgFlow > 0) {
      impacto_longo_prazo = `Fluxo médio positivo nos últimos meses tende a elevar seu patrimônio no longo prazo se mantido.`
    }
  }

  if (expenseRatio > 100) {
    decisao_recomendada = "Priorize cortar despesas ou aumentar receita para eliminar o déficit antes de novos compromissos."
  } else if (expenseRatio > 90) {
    decisao_recomendada = "Recomendado: revisar gastos não essenciais para abrir margem de segurança e poupança."
  } else if (monthsReserve < 3 && metrics.monthExpense > 0) {
    decisao_recomendada = "Foque em formar reserva de emergência de pelo menos 3 a 6 meses de despesas."
  } else if (metrics.savingsRate >= 20) {
    decisao_recomendada = "Manter disciplina de gastos e considerar aumentar aportes em investimentos ou metas."
  } else if (metrics.netWorth < 0) {
    decisao_recomendada = "Reduzir dívidas deve vir antes de novos investimentos; evite novos parcelamentos."
  } else {
    decisao_recomendada = "Manter controle de gastos e, se possível, elevar gradualmente a taxa de poupança."
  }

  return { impacto_longo_prazo, decisao_recomendada }
}

export interface IndependenciaFinanceira {
  patrimonioAtual: number
  despesaAnual: number
  patrimonioNecessario: number
  percentual: number
  mensagem: string
}

const FATOR_INDEPENDENCIA = 25 // regra dos 4% (patrimônio = despesa_anual * 25)

export async function getIndependenciaFinanceira(userId: string): Promise<IndependenciaFinanceira> {
  const metrics = await getDashboardMetrics(userId)
  const patrimonioAtual = metrics.netWorth
  const despesaAnual = metrics.monthExpense * 12
  const patrimonioNecessario = despesaAnual * FATOR_INDEPENDENCIA
  const percentual =
    patrimonioNecessario > 0 ? Math.min(100, (patrimonioAtual / patrimonioNecessario) * 100) : 0

  let mensagem = "Com seu nível de despesas, o patrimônio sugerido para independência financeira (regra dos 4%) é "
  if (patrimonioNecessario <= 0) {
    mensagem = "Cadastre despesas para estimar o patrimônio necessário para independência financeira."
  } else if (percentual >= 100) {
    mensagem = "Parabéns! Seu patrimônio já atinge o valor sugerido para independência financeira (regra dos 4%)."
  } else {
    mensagem = `Você está em ${percentual.toFixed(0)}% do patrimônio sugerido para independência (regra dos 4%).`
  }

  return {
    patrimonioAtual,
    despesaAnual,
    patrimonioNecessario,
    percentual,
    mensagem,
  }
}
