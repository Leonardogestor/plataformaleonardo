import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface SummaryCardsProps {
  summary: {
    avgIncome: number
    avgExpense: number
    avgSaving: number
    finalNetWorth: number
    status: string
  }
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  // Verificar se há dados reais para exibir
  const hasData =
    summary.avgIncome > 0 ||
    summary.avgExpense > 0 ||
    summary.avgSaving > 0 ||
    summary.finalNetWorth > 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Receita Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">
            {hasData
              ? `R$ ${summary.avgIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "R$ 0,00"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Despesa Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">
            {hasData
              ? `R$ ${summary.avgExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "R$ 0,00"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Capacidade de Aporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">
            {hasData
              ? `R$ ${summary.avgSaving.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "R$ 0,00"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Patrimônio Projetado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400">
            {hasData
              ? `R$ ${summary.finalNetWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "R$ 0,00"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-lg font-semibold ${hasData ? (summary.status === "dentro do planejado" ? "text-green-400" : summary.status === "exige ajuste" ? "text-amber-400" : "text-red-400") : "text-gray-400"}`}
          >
            {hasData
              ? summary.status.charAt(0).toUpperCase() + summary.status.slice(1)
              : "Sem dados"}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
