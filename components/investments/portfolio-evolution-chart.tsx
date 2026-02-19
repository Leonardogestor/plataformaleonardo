"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { LineChart as LineChartIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export interface PortfolioEvolutionInput {
  amount: string | number
  currentValue: string | number
  acquiredAt: string
}

const GRID_COLOR = "hsl(var(--border))"
const TEXT_MUTED = "hsl(var(--muted-foreground))"
const LINE_COLOR = "hsl(var(--primary))"

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function lastNMonths(n: number): { date: Date; key: string }[] {
  const out: { date: Date; key: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ date: d, key: getMonthKey(d) })
  }
  return out
}

/**
 * Synthetic monthly portfolio value: for each investment, linear interpolation
 * from amount at acquisition to currentValue at "now". No history table required.
 */
function buildSyntheticEvolution(
  investments: PortfolioEvolutionInput[],
  months: { date: Date; key: string }[]
): { month: string; value: number }[] {
  const now = new Date()
  const nowMonth = now.getMonth() + now.getFullYear() * 12

  return months.map(({ date }) => {
    const monthIdx = date.getMonth() + date.getFullYear() * 12
    let total = 0
    for (const inv of investments) {
      const acquired = new Date(inv.acquiredAt)
      const acquiredMonth = acquired.getMonth() + acquired.getFullYear() * 12
      if (monthIdx < acquiredMonth) continue
      const amount = toNum(inv.amount)
      const current = toNum(inv.currentValue)
      const monthsToNow = Math.max(1, nowMonth - acquiredMonth)
      const monthsToM = monthIdx - acquiredMonth
      const progress = Math.min(1, Math.max(0, monthsToM / monthsToNow))
      const valueAtM = amount + (current - amount) * progress
      total += valueAtM
    }
    const shortLabel = date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    })
    return { month: shortLabel, value: Math.round(total * 100) / 100 }
  })
}

interface PortfolioEvolutionChartProps {
  investments: PortfolioEvolutionInput[]
  /** 6 or 12 */
  months?: number
}

export function PortfolioEvolutionChart({
  investments,
  months = 12,
}: PortfolioEvolutionChartProps) {
  const period = Math.min(12, Math.max(6, months))
  const monthList = useMemo(() => lastNMonths(period), [period])
  const data = useMemo(
    () => buildSyntheticEvolution(investments, monthList),
    [investments, monthList]
  )

  const isEmpty = investments.length === 0 || data.every((d) => d.value === 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          Evolução do portfólio
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Valor total estimado por mês (sintético a partir das datas de aquisição)
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LineChartIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              Sem dados para exibir
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione investimentos com data de aquisição para ver a evolução.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="month"
                  stroke={TEXT_MUTED}
                  fontSize={11}
                  tick={{ fill: TEXT_MUTED }}
                />
                <YAxis
                  stroke={TEXT_MUTED}
                  fontSize={11}
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fill: TEXT_MUTED }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [formatCurrency(value), "Portfólio"]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={{ fill: LINE_COLOR, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex justify-end gap-2 text-sm">
              <span className="text-muted-foreground">Último mês</span>
              <span className="font-semibold text-primary">
                {formatCurrency(data[data.length - 1]?.value ?? 0)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
