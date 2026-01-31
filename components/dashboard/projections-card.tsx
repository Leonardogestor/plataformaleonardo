// Card de projeções financeiras do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideBarChart3 } from "lucide-react"

export type ProjectionsCardProps = {
  revenue: number
  expense: number
  investment: number
  aportes: number
  retiradas: number
}

export function ProjectionsCard({
  revenue,
  expense,
  investment,
  aportes,
  retiradas,
}: ProjectionsCardProps) {
  return (
    <Card className="bg-zinc-900 border-2 border-teal-500 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Projeções Financeiras</CardTitle>
        <LucideBarChart3 className="text-teal-500" size={32} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-sm text-zinc-400">Receita</span>
            <span className="font-bold">
              {revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Despesa</span>
            <span className="font-bold">
              {expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Investimento</span>
            <span className="font-bold">
              {investment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Aportes/Retiradas</span>
            <span className="font-bold">
              {(aportes - retiradas).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
