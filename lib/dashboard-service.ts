import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "@/lib/ProjectionsEngine"
import type { NextRequest } from "next/server"

// Utilitário: converte transações do banco para o formato do motor
function mapTransactionsToEngineInputs(transactions: any[]) {
  // Exemplo: agrupar receitas, despesas, investimentos, etc.
  let receita = 0,
    despesas = 0,
    investimento = 0
  for (const t of transactions) {
    if (t.type === "INCOME") receita += Number(t.amount)
    else if (t.type === "EXPENSE") despesas += Math.abs(Number(t.amount))
    else if (t.type === "INVESTMENT") investimento += Math.abs(Number(t.amount))
  }
  return { receita, despesas, investimento }
}

export class DashboardService {
  static async getDashboardData(userId: string, month: number, year: number) {
    // 1. Buscar transações do usuário para o mês
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      select: { amount: true, type: true, category: true, date: true },
    })

    // 2. Mapear para inputs do motor
    const engineInputs = mapTransactionsToEngineInputs(transactions)

    // 3. Rodar projeção do motor
    const projecoes = ProjectionsEngine.calcularProjecao(1, engineInputs)
    const proj = projecoes[0]

    // 4. Calcular taxa de poupança
    const savingsRate = proj && proj.receita.valor > 0 ? proj.resultado / proj.receita.valor : 0

    // 5. Status crítica/segura (dummy)
    const statusReserva = proj && proj.resultado > 0 ? "segura" : "crítica"

    // 6. Lógica de cor/alerta
    const alerta = proj && proj.resultado < 0

    // 7. Patrimônio projetado (dummy)
    const patrimonioProjetado = proj && proj.resultado + proj.investimento

    // 8. Retorno final
    return {
      receita: proj.receita.valor,
      despesas: proj.despesas.valor,
      investimento: proj.investimento,
      resultado: proj.resultado,
      savingsRate,
      statusReserva,
      alerta,
      patrimonioProjetado,
      month,
      year,
    }
  }
}
