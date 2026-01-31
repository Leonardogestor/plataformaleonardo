// Card de projeções financeiras do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

export interface ProjectionsCardProps {
  history: {
    revenue: number
    expense: number
    investment: number
    aportes: number
    retiradas: number
  }[]
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getProjection(history: ProjectionsCardProps["history"]) {
  // Média dos últimos 3 meses
  const last = history.slice(-3)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
  return {
    revenue: avg(last.map((h) => h.revenue)),
    expense: avg(last.map((h) => h.expense)),
    investment: avg(last.map((h) => h.investment)),
    aportes: avg(last.map((h) => h.aportes)),
    retiradas: avg(last.map((h) => h.retiradas)),
  }
}

export function ProjectionsCard({ history }: ProjectionsCardProps) {
  const proj = getProjection(history)
  return (
    <Card className="bg-dark border-2 border-teal-500 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="text-teal-400" size={28} /> Projeções Financeiras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <DollarSign size={16} /> Receita
            </span>
            <span className="font-bold text-green-400">{formatCurrency(proj.revenue)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <TrendingDown size={16} /> Despesa
            </span>
            <span className="font-bold text-red-400">{formatCurrency(proj.expense)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <TrendingUp size={16} /> Investimento
            </span>
            <span className="font-bold text-blue-400">{formatCurrency(proj.investment)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <ArrowUpRight size={16} /> Aportes
            </span>
            <span className="font-bold text-teal-400">{formatCurrency(proj.aportes)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <ArrowDownRight size={16} /> Retiradas
            </span>
            <span className="font-bold text-yellow-400">{formatCurrency(proj.retiradas)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
