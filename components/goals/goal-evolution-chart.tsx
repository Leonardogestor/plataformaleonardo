"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

const MONTH_LABELS: Record<string, string> = {
  "1": "Jan", "2": "Fev", "3": "Mar", "4": "Abr", "5": "Mai", "6": "Jun",
  "7": "Jul", "8": "Ago", "9": "Set", "10": "Out", "11": "Nov", "12": "Dez",
}

function formatMonth(ym: string) {
  const parts = ym.split("-")
  const y = parts[0] ?? ""
  const m = parts[1] ?? ""
  return `${MONTH_LABELS[m] ?? m}/${y.slice(2)}`
}

interface GoalEvolutionChartProps {
  evolution: { month: string; cumulative: number }[]
}

export function GoalEvolutionChart({ evolution }: GoalEvolutionChartProps) {
  if (!evolution?.length) return null

  const data = evolution.map((e) => ({
    month: e.month,
    label: formatMonth(e.month),
    valor: e.cumulative,
  }))

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              return (
                <div className="rounded border bg-card px-2 py-1 text-xs shadow">
                  {payload[0].payload.label}: {formatCurrency(payload[0].value as number)}
                </div>
              )
            }}
          />
          <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
