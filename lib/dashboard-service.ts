import { prisma } from "@/lib/db"
import { ProjectionsEngine } from "@/lib/ProjectionsEngine"
import type { NextRequest } from "next/server"

// Utilitário: converte transações do banco para o formato do motor
export function mapTransactionsToEngineInputs(transactions: { type: string; amount: any }[]) {
  let receita = 0,
    despesasOperacionais = 0,
    investimento = 0
  for (const t of transactions) {
    if (t.type === "INCOME") receita += Number(t.amount)
    else if (t.type === "EXPENSE") despesasOperacionais += Math.abs(Number(t.amount))
    else if (t.type === "INVESTMENT") investimento += Math.abs(Number(t.amount))
  }
  return { receita, despesasOperacionais, investimento }
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
    const { receita, despesasOperacionais, investimento } =
      mapTransactionsToEngineInputs(transactions)

    // 3. Resultado do mês: receitas - despesas operacionais (NÃO desconta investimento)
    const resultado = receita - despesasOperacionais

    // 4. Taxa de poupança: (receita - despesas operacionais) / receita
    // Definição consistente com orchestration-service — não desconta investimentos
    const savingsRate = receita > 0 ? resultado / receita : 0

    // 5. Status crítica/segura
    const statusReserva = resultado > 0 ? "segura" : "crítica"

    // 6. Lógica de cor/alerta
    const alerta = resultado < 0

    // 7. Patrimônio projetado: saldo anterior + resultado + investimento
    // (Aqui pode-se buscar saldo anterior real se disponível)
    const patrimonioProjetado = resultado + investimento

    // 8. Retorno final
    return {
      receita,
      despesasOperacionais,
      investimento,
      resultado,
      savingsRate,
      statusReserva,
      alerta,
      patrimonioProjetado,
      month,
      year,
    }
  }
}
