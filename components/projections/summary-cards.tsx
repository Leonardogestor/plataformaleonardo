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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Receita Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">
            R$ {summary.avgIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Despesa Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">
            R$ {summary.avgExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Capacidade de Aporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">
            R$ {summary.avgSaving.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Patrimônio Projetado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400">
            R$ {summary.finalNetWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-lg font-semibold ${summary.status === "dentro do planejado" ? "text-green-400" : summary.status === "exige ajuste" ? "text-amber-400" : "text-red-400"}`}
          >
            {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
