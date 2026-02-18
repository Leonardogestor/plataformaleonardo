import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

// Estrutura consultiva do relatório
export interface RelatorioEstruturado {
  diagnostico: string
  principal_risco: string
  principal_oportunidade: string
  decisao_recomendada: string
}

export interface BenchmarkItem {
  metrica: string
  seuValor: string
  referencia: string
  status: "acima" | "no_alvo" | "abaixo"
  descricao: string
}

// Interface para relatório mensal
export interface MonthlyReport {
  period: {
    month: string
    year: number
    start: Date
    end: Date
  }
  summary: {
    totalIncome: number
    totalExpense: number
    cashFlow: number
    savingsRate: number
    netWorth: number
  }
  topCategories: Array<{
    category: string
    amount: number
    percentage: number
    count: number
  }>
  dailyEvolution: Array<{
    date: string
    balance: number
    income: number
    expense: number
  }>
  insights: string[]
  diagnostico: string
  principal_risco: string
  principal_oportunidade: string
  decisao_recomendada: string
  benchmarking_comparativo: BenchmarkItem[]
}

// Interface para relatório anual
export interface AnnualReport {
  period: {
    year: number
    start: Date
    end: Date
  }
  summary: {
    totalIncome: number
    totalExpense: number
    averageMonthlyIncome: number
    averageMonthlyExpense: number
    totalCashFlow: number
    annualSavingsRate: number
    netWorthGrowth: number
    netWorthGrowthPercentage: number
  }
  monthlyComparison: Array<{
    month: string
    income: number
    expense: number
    cashFlow: number
    savingsRate: number
  }>
  topCategories: Array<{
    category: string
    amount: number
    percentage: number
  }>
  bestMonth: {
    month: string
    cashFlow: number
  }
  worstMonth: {
    month: string
    cashFlow: number
  }
  goalsProgress: Array<{
    name: string
    targetAmount: number
    currentAmount: number
    progress: number
    status: string
  }>
  diagnostico: string
  principal_risco: string
  principal_oportunidade: string
  decisao_recomendada: string
  benchmarking_comparativo: BenchmarkItem[]
}

// Referências de mercado para benchmarking
const BENCHMARK_TAXA_POUPANCA = 20
const BENCHMARK_DESPESA_RECEITA_MAX = 70
const BENCHMARK_CRESCIMENTO_PATRIMONIAL_MIN = 0

function buildRelatorioMensal(
  summary: MonthlyReport["summary"],
  topCategories: MonthlyReport["topCategories"]
): RelatorioEstruturado & { benchmarking: BenchmarkItem[] } {
  const expenseRatio = summary.totalIncome > 0 ? (summary.totalExpense / summary.totalIncome) * 100 : 0
  let diagnostico = `No período, sua receita foi de R$ ${summary.totalIncome.toFixed(2)} e as despesas de R$ ${summary.totalExpense.toFixed(2)}, `
  if (summary.cashFlow >= 0) {
    diagnostico += `com superávit de R$ ${summary.cashFlow.toFixed(2)} e taxa de poupança de ${summary.savingsRate.toFixed(1)}%.`
  } else {
    diagnostico += `com déficit de R$ ${Math.abs(summary.cashFlow).toFixed(2)}.`
  }
  if (topCategories.length > 0 && topCategories[0]) {
    diagnostico += ` A maior categoria de gasto foi ${topCategories[0].category} (${topCategories[0].percentage.toFixed(0)}% das despesas).`
  }

  let principal_risco = "Concentração de gastos em poucas categorias pode aumentar vulnerabilidade."
  if (summary.cashFlow < 0) principal_risco = "Déficit recorrente compromete reserva e metas de longo prazo."
  else if (expenseRatio > 90) principal_risco = "Margem muito apertada entre receita e despesa; qualquer imprevisto gera estresse financeiro."
  else if (summary.savingsRate < 10 && summary.savingsRate >= 0) principal_risco = "Taxa de poupança baixa reduz capacidade de formar reserva e investir."

  let principal_oportunidade = "Manter disciplina de gastos e buscar elevar gradualmente a taxa de poupança."
  if (summary.savingsRate >= 20) principal_oportunidade = "Boa taxa de poupança permite reforçar reserva de emergência ou aportes em metas."
  if (summary.cashFlow > 0 && topCategories.length > 0 && topCategories[0] && topCategories[0].percentage > 30) {
    principal_oportunidade = "Reduzir gastos em " + topCategories[0].category + " pode liberar valor para metas sem sacrificar o restante."
  }

  let decisao_recomendada = "Manter acompanhamento mensal e revisar categorias que mais pesam no orçamento."
  if (summary.cashFlow < 0) decisao_recomendada = "Priorize cortar despesas não essenciais ou aumentar receita para eliminar o déficit no próximo período."
  else if (summary.savingsRate >= 20) decisao_recomendada = "Considere destinar parte do superávit a uma reserva de emergência ou a metas com prazo definido."

  const benchmarking: BenchmarkItem[] = [
    {
      metrica: "Taxa de poupança",
      seuValor: `${summary.savingsRate.toFixed(1)}%`,
      referencia: `${BENCHMARK_TAXA_POUPANCA}%`,
      status: summary.savingsRate >= BENCHMARK_TAXA_POUPANCA ? "acima" : summary.savingsRate >= 10 ? "no_alvo" : "abaixo",
      descricao: "Recomendação: poupar pelo menos 20% da receita",
    },
    {
      metrica: "Despesa / Receita",
      seuValor: `${expenseRatio.toFixed(0)}%`,
      referencia: `até ${BENCHMARK_DESPESA_RECEITA_MAX}%`,
      status: expenseRatio <= BENCHMARK_DESPESA_RECEITA_MAX ? "acima" : expenseRatio <= 90 ? "no_alvo" : "abaixo",
      descricao: "Ideal manter despesas em até 70% da receita",
    },
  ]

  return { diagnostico, principal_risco, principal_oportunidade, decisao_recomendada, benchmarking }
}

function buildRelatorioAnual(
  summary: AnnualReport["summary"],
  bestMonth: AnnualReport["bestMonth"],
  worstMonth: AnnualReport["worstMonth"]
): RelatorioEstruturado & { benchmarking: BenchmarkItem[] } {
  const expenseRatio = summary.totalIncome > 0 ? (summary.totalExpense / summary.totalIncome) * 100 : 0
  let diagnostico = `No ano, receita total de R$ ${summary.totalIncome.toFixed(2)} e despesas de R$ ${summary.totalExpense.toFixed(2)}, `
  diagnostico += `com fluxo de caixa de R$ ${summary.totalCashFlow.toFixed(2)} e taxa de poupança de ${summary.annualSavingsRate.toFixed(1)}%. `
  diagnostico += `Patrimônio ${summary.netWorthGrowth >= 0 ? "cresceu" : "recuou"} ${Math.abs(summary.netWorthGrowthPercentage).toFixed(1)}% (${summary.netWorthGrowth >= 0 ? "" : "-"}R$ ${Math.abs(summary.netWorthGrowth).toFixed(2)}). `
  diagnostico += `Melhor mês: ${bestMonth.month} (fluxo ${bestMonth.cashFlow >= 0 ? "" : "-"}R$ ${Math.abs(bestMonth.cashFlow).toFixed(2)}); pior: ${worstMonth.month}.`

  let principal_risco = "Variabilidade mensal alta entre melhor e pior mês pode indicar sazonalidade ou gastos irregulares."
  if (summary.totalCashFlow < 0) principal_risco = "Ano com déficit compromete reserva e metas; é essencial reverter no próximo ano."
  else if (expenseRatio > 85) principal_risco = "Despesas consomem grande parte da receita; margem baixa para imprevistos e investimentos."

  let principal_oportunidade = "Estabilizar fluxo mensal e manter ou elevar a taxa de poupança no próximo ano."
  if (summary.annualSavingsRate >= 20) principal_oportunidade = "Boa taxa de poupança anual permite planejar aportes maiores em metas ou investimentos."
  if (summary.netWorthGrowth > 0) principal_oportunidade += " Crescimento patrimonial abre espaço para revisão de alocação e metas."

  let decisao_recomendada = "Revisar orçamento anual e definir prioridades para o próximo ano, mantendo reserva de emergência."
  if (summary.totalCashFlow < 0) decisao_recomendada = "Definir plano concreto para eliminar déficit no próximo ano (corte de gastos ou aumento de receita) e evitar novos endividamentos."
  else if (summary.annualSavingsRate >= 20) decisao_recomendada = "Considerar aumentar aportes em metas de longo prazo ou diversificar aplicações."

  const benchmarking: BenchmarkItem[] = [
    {
      metrica: "Taxa de poupança anual",
      seuValor: `${summary.annualSavingsRate.toFixed(1)}%`,
      referencia: `${BENCHMARK_TAXA_POUPANCA}%`,
      status: summary.annualSavingsRate >= BENCHMARK_TAXA_POUPANCA ? "acima" : summary.annualSavingsRate >= 10 ? "no_alvo" : "abaixo",
      descricao: "Meta: poupar pelo menos 20% da receita no ano",
    },
    {
      metrica: "Despesa / Receita",
      seuValor: `${expenseRatio.toFixed(0)}%`,
      referencia: `até ${BENCHMARK_DESPESA_RECEITA_MAX}%`,
      status: expenseRatio <= BENCHMARK_DESPESA_RECEITA_MAX ? "acima" : expenseRatio <= 90 ? "no_alvo" : "abaixo",
      descricao: "Ideal manter despesas em até 70% da receita",
    },
    {
      metrica: "Crescimento patrimonial",
      seuValor: `${summary.netWorthGrowthPercentage >= 0 ? "+" : ""}${summary.netWorthGrowthPercentage.toFixed(1)}%`,
      referencia: `acima de ${BENCHMARK_CRESCIMENTO_PATRIMONIAL_MIN}%`,
      status: summary.netWorthGrowthPercentage >= BENCHMARK_CRESCIMENTO_PATRIMONIAL_MIN ? "acima" : "abaixo",
      descricao: "Patrimônio deve crescer ou manter valor real",
    },
  ]

  return { diagnostico, principal_risco, principal_oportunidade, decisao_recomendada, benchmarking }
}

export async function generateMonthlyReport(
  userId: string,
  month: number,
  year: number
): Promise<MonthlyReport> {
  const periodStart = startOfMonth(new Date(year, month - 1))
  const periodEnd = endOfMonth(new Date(year, month - 1))

  const [transactions, accounts, previousBalance] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    }),
    // Saldo até o mês anterior para calcular evolução
    prisma.transaction.findMany({
      where: {
        userId,
        date: { lt: periodStart },
      },
      select: { type: true, amount: true },
    }),
  ])

  // Cálculos do resumo
  const totalIncome = transactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const cashFlow = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (cashFlow / totalIncome) * 100 : 0
  const netWorth = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0)

  // Top categorias
  const categoryMap = new Map<string, { amount: number; count: number }>()
  transactions
    .filter((t: any) => t.type === "EXPENSE")
    .forEach((t: any) => {
      const current = categoryMap.get(t.category) || { amount: 0, count: 0 }
      categoryMap.set(t.category, {
        amount: current.amount + Number(t.amount),
        count: current.count + 1,
      })
    })

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Evolução diária
  const dailyMap = new Map<string, { income: number; expense: number }>()
  transactions.forEach((t: any) => {
    const day = t.date.toISOString().split("T")[0]
    const current = dailyMap.get(day) || { income: 0, expense: 0 }
    if (t.type === "INCOME") {
      current.income += Number(t.amount)
    } else if (t.type === "EXPENSE") {
      current.expense += Number(t.amount)
    }
    dailyMap.set(day, current)
  })

  let runningBalance = previousBalance.reduce((sum: number, t: any) => {
    return sum + (t.type === "INCOME" ? Number(t.amount) : -Number(t.amount))
  }, 0)

  const dailyEvolution = Array.from(dailyMap.entries())
    .map(([date, data]) => {
      runningBalance += data.income - data.expense
      return {
        date,
        balance: runningBalance,
        income: data.income,
        expense: data.expense,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  // Insights simples
  const insights: string[] = []
  if (savingsRate > 20) {
    insights.push(
      `Você está no ritmo certo para atingir seus objetivos. Sua taxa de poupança foi de ${savingsRate.toFixed(1)}% neste período.`
    )
  } else if (savingsRate < 0) {
    insights.push(
      `Vale revisar este ponto para manter o planejamento em dia. Houve déficit de R$ ${Math.abs(cashFlow).toFixed(2)} neste período.`
    )
  }
  if (topCategories.length > 0 && topCategories[0]) {
    insights.push(
      `${topCategories[0].category} foi a maior despesa: R$ ${topCategories[0].amount.toFixed(2)}`
    )
  }

  const { diagnostico, principal_risco, principal_oportunidade, decisao_recomendada, benchmarking } = buildRelatorioMensal(
    { totalIncome, totalExpense, cashFlow, savingsRate, netWorth },
    topCategories
  )

  return {
    period: {
      month: new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" }),
      year,
      start: periodStart,
      end: periodEnd,
    },
    summary: {
      totalIncome,
      totalExpense,
      cashFlow,
      savingsRate,
      netWorth,
    },
    topCategories,
    dailyEvolution,
    insights,
    diagnostico,
    principal_risco,
    principal_oportunidade,
    decisao_recomendada,
    benchmarking_comparativo: benchmarking,
  }
}

export async function generateAnnualReport(userId: string, year: number): Promise<AnnualReport> {
  const periodStart = startOfYear(new Date(year, 0))
  const periodEnd = endOfYear(new Date(year, 0))

  const [transactions, goals, startBalance, endBalance] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: {
        contributions: {
          where: {
            date: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
      },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { balance: true, createdAt: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    }),
  ])

  // Cálculos anuais
  const totalIncome = transactions
    .filter((t: any) => t.type === "INCOME")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

  const totalCashFlow = totalIncome - totalExpense
  const annualSavingsRate = totalIncome > 0 ? (totalCashFlow / totalIncome) * 100 : 0

  const netWorthEnd = endBalance.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0)
  const netWorthStart = startBalance
    .filter((acc: any) => acc.createdAt < periodStart)
    .reduce((sum: number, acc: any) => sum + Number(acc.balance), 0)

  const netWorthGrowth = netWorthEnd - netWorthStart
  const netWorthGrowthPercentage = netWorthStart > 0 ? (netWorthGrowth / netWorthStart) * 100 : 0

  // Comparação mensal
  const monthlyMap = new Map<number, { income: number; expense: number }>()
  transactions.forEach((t: any) => {
    const month = t.date.getMonth()
    const current = monthlyMap.get(month) || { income: 0, expense: 0 }
    if (t.type === "INCOME") {
      current.income += Number(t.amount)
    } else if (t.type === "EXPENSE") {
      current.expense += Number(t.amount)
    }
    monthlyMap.set(month, current)
  })

  const monthlyComparison = Array.from({ length: 12 }, (_, i) => {
    const data = monthlyMap.get(i) || { income: 0, expense: 0 }
    const cashFlow = data.income - data.expense
    const savingsRate = data.income > 0 ? (cashFlow / data.income) * 100 : 0
    return {
      month: new Date(year, i).toLocaleDateString("pt-BR", { month: "short" }),
      income: data.income,
      expense: data.expense,
      cashFlow,
      savingsRate,
    }
  })

  // Top categorias do ano
  const categoryMap = new Map<string, number>()
  transactions
    .filter((t: any) => t.type === "EXPENSE")
    .forEach((t: any) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + Number(t.amount))
    })

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Melhor e pior mês
  const monthsWithCashFlow = monthlyComparison.filter((m) => m.income > 0 || m.expense > 0)
  const bestMonth =
    monthsWithCashFlow.length > 0
      ? monthsWithCashFlow.reduce((best, current) =>
          current.cashFlow > best.cashFlow ? current : best
        )
      : { month: "-", cashFlow: 0 }

  const worstMonth =
    monthsWithCashFlow.length > 0
      ? monthsWithCashFlow.reduce((worst, current) =>
          current.cashFlow < worst.cashFlow ? current : worst
        )
      : { month: "-", cashFlow: 0 }

  // Progresso de metas
  const goalsProgress = goals.map((goal: any) => ({
    name: goal.name,
    targetAmount: Number(goal.targetAmount),
    currentAmount: Number(goal.currentAmount),
    progress:
      Number(goal.targetAmount) > 0
        ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100
        : 0,
    status: goal.status,
  }))

  const { diagnostico, principal_risco, principal_oportunidade, decisao_recomendada, benchmarking } = buildRelatorioAnual(
    {
      totalIncome,
      totalExpense,
      averageMonthlyIncome: totalIncome / 12,
      averageMonthlyExpense: totalExpense / 12,
      totalCashFlow,
      annualSavingsRate,
      netWorthGrowth,
      netWorthGrowthPercentage,
    },
    { month: bestMonth.month, cashFlow: bestMonth.cashFlow },
    { month: worstMonth.month, cashFlow: worstMonth.cashFlow }
  )

  return {
    period: {
      year,
      start: periodStart,
      end: periodEnd,
    },
    summary: {
      totalIncome,
      totalExpense,
      averageMonthlyIncome: totalIncome / 12,
      averageMonthlyExpense: totalExpense / 12,
      totalCashFlow,
      annualSavingsRate,
      netWorthGrowth,
      netWorthGrowthPercentage,
    },
    monthlyComparison,
    topCategories,
    bestMonth: {
      month: bestMonth.month,
      cashFlow: bestMonth.cashFlow,
    },
    worstMonth: {
      month: worstMonth.month,
      cashFlow: worstMonth.cashFlow,
    },
    goalsProgress,
    diagnostico,
    principal_risco,
    principal_oportunidade,
    decisao_recomendada,
    benchmarking_comparativo: benchmarking,
  }
}
