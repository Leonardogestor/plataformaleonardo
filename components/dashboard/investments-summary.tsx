// Card de resumo de investimentos do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucidePieChart } from "lucide-react"

export type InvestmentsSummaryProps = {
  allocation: number
  profitability: number
  profit: number
}

export function InvestmentsSummary({ allocation, profitability, profit }: InvestmentsSummaryProps) {
  return (
    <Card className="bg-zinc-900 border-2 border-teal-500 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Resumo de Investimentos</CardTitle>
        <LucidePieChart className="text-teal-500" size={32} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-sm text-zinc-400">Alocação</span>
            <span className="font-bold">{allocation}%</span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Rentabilidade</span>
            <span className="font-bold">{profitability}%</span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Lucro/Prejuízo</span>
            <span className="font-bold">
              {profit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
