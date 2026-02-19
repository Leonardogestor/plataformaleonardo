"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export interface TopAssetsInput {
  id: string
  name: string
  currentValue: string | number
}

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
]

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

interface TopAssetsChartProps {
  investments: TopAssetsInput[]
  /** Default 5 */
  topN?: number
}

export function TopAssetsChart({ investments, topN = 5 }: TopAssetsChartProps) {
  const { data } = useMemo(() => {
    const totalVal = investments.reduce((s, i) => s + toNum(i.currentValue), 0)
    const sorted = [...investments]
      .sort((a, b) => toNum(b.currentValue) - toNum(a.currentValue))
      .slice(0, topN)
    const data = sorted.map((inv) => {
      const val = toNum(inv.currentValue)
      const pct = totalVal > 0 ? (val / totalVal) * 100 : 0
      return {
        name: inv.name.length > 18 ? inv.name.slice(0, 18) + "…" : inv.name,
        fullName: inv.name,
        value: val,
        pct,
      }
    })
    return { data, total: totalVal }
  }, [investments, topN])

  const isEmpty = investments.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Maiores ativos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top {topN} por valor atual e % do portfólio
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Sem dados</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => formatCurrency(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((_entry, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
