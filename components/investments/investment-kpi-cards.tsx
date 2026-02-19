"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react"

export interface InvestmentKpiInput {
  amount: string | number
  currentValue: string | number
}

interface InvestmentKpiCardsProps {
  investments: InvestmentKpiInput[]
}

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

export function InvestmentKpiCards({ investments }: InvestmentKpiCardsProps) {
  const kpis = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + toNum(i.amount), 0)
    const totalCurrent = investments.reduce((s, i) => s + toNum(i.currentValue), 0)
    const totalReturn = totalCurrent - totalInvested
    const totalReturnPct =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
    const maxCurrent = Math.max(
      ...investments.map((i) => toNum(i.currentValue)),
      0
    )
    const largestConcentrationPct =
      totalCurrent > 0 ? (maxCurrent / totalCurrent) * 100 : 0

    return {
      totalInvested,
      totalCurrent,
      totalReturn,
      totalReturnPct,
      largestConcentrationPct,
    }
  }, [investments])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatCurrency(kpis.totalInvested)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Soma do capital aplicado
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor do Portfólio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatCurrency(kpis.totalCurrent)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Valor atual total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Retorno Total</CardTitle>
          {kpis.totalReturn >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums ${
              kpis.totalReturn >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {kpis.totalReturn >= 0 ? "+" : ""}
            {formatCurrency(kpis.totalReturn)}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              kpis.totalReturn >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {kpis.totalReturn >= 0 ? "+" : ""}
            {kpis.totalReturnPct.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maior Concentração</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {kpis.largestConcentrationPct.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maior ativo em % do portfólio
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
