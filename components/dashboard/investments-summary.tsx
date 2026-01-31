// Card de resumo de investimentos do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { LucidePieChart } from "lucide-react"

export interface Investment {
  id: string
  type: string
  value: number
  profit: number
  profitPercent: number
  dividends: number
}

export interface InvestmentsSummaryProps {
  investments: Investment[]
}

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#a21caf", "#ef4444", "#64748b"]

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function InvestmentsSummary({ investments }: InvestmentsSummaryProps) {
  // ...existing code...
  const data = investments.map((inv) => ({ name: inv.type, value: inv.value }))
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-dark border-2 border-teal-500 text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <LucidePieChart className="text-teal-400" size={28} /> Alocação de Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                dataKey="value"
              >
                {data.map((_entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatCurrency(v as number)}
                labelStyle={{ color: "#0ff" }}
                contentStyle={{ background: "#222", border: "none", color: "#fff" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="bg-dark border-2 border-teal-500 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Carteira e Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {investments.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-1 p-2 rounded bg-zinc-800">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{inv.type}</span>
                  <span>{formatCurrency(inv.value)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lucro/Prejuízo:</span>
                  <span>
                    {formatCurrency(inv.profit)} ({inv.profitPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dividendos:</span>
                  <span>{formatCurrency(inv.dividends)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
