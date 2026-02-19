"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { PieChart as PieChartIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export interface PortfolioAllocationInput {
  type: string
  currentValue: string | number
}

const TYPE_LABELS: Record<string, string> = {
  STOCKS: "Ações",
  BONDS: "Títulos",
  REAL_ESTATE: "Imóveis",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  FUNDS: "Fundos",
  OTHER: "Outro",
}

/** Dark-theme friendly palette */
const TYPE_COLORS: Record<string, string> = {
  FIXED_INCOME: "hsl(142, 76%, 36%)",
  STOCKS: "hsl(48, 96%, 53%)",
  BONDS: "hsl(217, 91%, 60%)",
  REAL_ESTATE: "hsl(0, 72%, 51%)",
  CRYPTO: "hsl(263, 70%, 50%)",
  FUNDS: "hsl(187, 94%, 43%)",
  OTHER: "hsl(var(--muted-foreground))",
}

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

interface PortfolioAllocationChartProps {
  investments: PortfolioAllocationInput[]
}

export function PortfolioAllocationChart({ investments }: PortfolioAllocationChartProps) {
  const { data, total } = useMemo(() => {
    const totalVal = investments.reduce((s, i) => s + toNum(i.currentValue), 0)
    const byType: Record<string, number> = {}
    for (const inv of investments) {
      const t = inv.type || "OTHER"
      byType[t] = (byType[t] || 0) + toNum(inv.currentValue)
    }
    const data = Object.entries(byType).map(([type, value]) => ({
      name: TYPE_LABELS[type] || type,
      type,
      value: totalVal > 0 ? (value / totalVal) * 100 : 0,
      rawValue: value,
    }))
    return { data, total: totalVal }
  }, [investments])

  const isEmpty = investments.length === 0 || total === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          Alocação por tipo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentual do portfólio por classe de ativo
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PieChartIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Sem dados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione investimentos para ver a alocação.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-full md:w-[55%] h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {data.map((entry) => (
                      <Cell
                        key={`cell-${entry.type}`}
                        fill={TYPE_COLORS[entry.type] || TYPE_COLORS.OTHER}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number, name: string, props: { payload?: { rawValue?: number } }) => [
                      `${value.toFixed(1)}% · ${formatCurrency(props?.payload?.rawValue ?? 0)}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="md:w-[45%] space-y-1.5 text-sm">
              {data.map((d) => (
                <div key={d.type} className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium tabular-nums">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
