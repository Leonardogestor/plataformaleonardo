import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "@/lib/ProjectionsEngine"

export class OrchestrationService {
  static async syncAll(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 1)

    // 1. Buscar dados principais — transações APENAS do mês corrente
    const [currentMonthTx, accounts, cards, anamnesis, metas] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: startOfMonth, lt: endOfMonth } },
        select: { type: true, amount: true, category: true, date: true },
      }),
      prisma.account.findMany({ where: { userId }, select: { id: true, name: true, balance: true } }),
      prisma.card.findMany({ where: { userId }, select: { id: true, name: true, limit: true } }),
      prisma.userAnamnesis.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, status: "ACTIVE" } }),
    ])

    // 2. Aggregados all-time de investimentos via groupBy (sem full table scan)
    const [investmentByCategory, investmentTotal] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["category"],
        where: { userId, type: "INVESTMENT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "INVESTMENT" },
        _sum: { amount: true },
      }),
    ])

    // 3. Métricas do mês corrente
    let receita = 0,
      despesasOperacionais = 0,
      investimentoMes = 0

    for (const t of currentMonthTx) {
      if (t.type === "INCOME") receita += Number(t.amount)
      else if (t.type === "EXPENSE") despesasOperacionais += Math.abs(Number(t.amount))
      else if (t.type === "INVESTMENT") investimentoMes += Math.abs(Number(t.amount))
    }

    const resultado = receita - despesasOperacionais
    // savingsRate: porcentagem da receita que sobrou após despesas operacionais
    const savingsRate = receita > 0 ? resultado / receita : 0
    const saldoAcumulado = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // 4. Totais all-time de investimentos
    const totalInvestments = Number(investmentTotal._sum.amount ?? 0)
    const alocacaoPorCategoria: Record<string, number> = {}
    for (const row of investmentByCategory) {
      alocacaoPorCategoria[row.category] = Number(row._sum.amount ?? 0)
    }

    // 5. Patrimônio necessário (regra dos 4%)
    const despesaAnual = despesasOperacionais * 12
    const patrimonioNecessario = despesaAnual / 0.04

    // 6. Idade atual via anamnese
    let idade = 35
    if (anamnesis?.birthDate) {
      const birthDate = new Date(anamnesis.birthDate)
      const hoje = new Date()
      idade = hoje.getFullYear() - birthDate.getFullYear()
      const m = hoje.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < birthDate.getDate())) idade--
    }

    // 7. Aporte mensal = SOMA total de investimentos do mês (não média por transação)
    const aporteMedio = investimentoMes

    // 8. Evolução patrimonial projetada
    const evolucaoPatrimonial = ProjectionsEngine.calcularProjecao(60, {
      patrimonioAtual: saldoAcumulado,
      aporteMensal: aporteMedio,
      taxaJurosMensal: 0.004,
      idade,
      despesasMensais: despesasOperacionais,
    })

    // Extrair idade de aposentadoria projetada do primeiro ponto do array
    const retirementAge =
      Array.isArray(evolucaoPatrimonial) && evolucaoPatrimonial.length > 0
        ? ((evolucaoPatrimonial[0] as any)?.idadeAposentadoria ?? 0)
        : 0

    // 9. Metas: aporte necessário mensal usando deadline real de cada meta
    const now = new Date()
    const aporteMetasNecessario = metas.reduce((sum, meta) => {
      const remaining = Number(meta.targetAmount) - Number(meta.currentAmount)
      if (remaining <= 0) return sum
      const deadline = new Date(meta.deadline)
      const monthsRemaining = Math.max(
        1,
        (deadline.getFullYear() - now.getFullYear()) * 12 +
          (deadline.getMonth() - now.getMonth())
      )
      return sum + remaining / monthsRemaining
    }, 0)

    const metasConflito = aporteMetasNecessario > resultado - investimentoMes

    // 10. Financeiro: Saldos e limites
    const saldosContas = accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      saldo: Number(acc.balance),
    }))
    const limitesCartoes = cards.map((card) => ({
      id: card.id,
      name: card.name,
      limite: Number(card.limit),
    }))

    // 11. Persistir snapshot consolidado com campos alinhados ao schema
    await prisma.financialSummary.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: {
        totalIncome: receita,
        totalExpenses: despesasOperacionais,
        totalInvestments: investimentoMes,
        resultado,
        saldoAcumulado,
        netWorth: saldoAcumulado,
        savingsRate,
        retirementAge,
        patrimonioNecessario,
        evolucaoPatrimonial,
        aporteMedio,
        idade,
        aporteMetasNecessario,
        metasConflito,
        alocacaoPorCategoria,
        saldosContas,
        limitesCartoes,
        updatedAt: new Date(),
      },
      create: {
        userId,
        month,
        year,
        totalIncome: receita,
        totalExpenses: despesasOperacionais,
        totalInvestments: investimentoMes,
        resultado,
        saldoAcumulado,
        netWorth: saldoAcumulado,
        savingsRate,
        retirementAge,
        patrimonioNecessario,
        evolucaoPatrimonial,
        aporteMedio,
        idade,
        aporteMetasNecessario,
        metasConflito,
        alocacaoPorCategoria,
        saldosContas,
        limitesCartoes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // 12. Snapshot histórico imutável
    const snapshotDate = new Date(year, month - 1, 1)
    try {
      await prisma.financial_snapshots.create({
        data: {
          id: `${userId}_${year}_${month}`,
          userId,
          snapshotDate,
          totalAssets: saldoAcumulado,
          totalLiabilities: 0,
          netWorth: saldoAcumulado,
          cashBalance: saldoAcumulado,
          investmentValue: totalInvestments,
          receivables: 0,
          periodIncome: receita,
          periodExpense: despesasOperacionais,
          periodSavings: investimentoMes,
          savingsRate,
          financialScore: null,
          riskLevel: null,
          lastLedgerSequence: 0,
          calculationVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    } catch (e: any) {
      // Único caso aceitável de silêncio: chave duplicada (P2002) — imutabilidade garantida
      if (e?.code !== "P2002") throw e
    }

    return true
  }
}
