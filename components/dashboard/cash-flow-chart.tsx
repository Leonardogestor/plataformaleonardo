"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"

interface Transaction {
  date: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

interface MonthlyPoint {
  month: string
  income: number
  expense: number
  netWorth?: number
}

export interface CashFlowChartProps {
  transactions?: Transaction[]
  monthIncome?: number
  monthExpense?: number
  /** Dados mensais para gráfico de múltiplos meses (mais profissional) */
  monthlyData?: MonthlyPoint[]
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function getMonthYear(date: Date) {
  return `${date.getMonth() + 1}/${date.getFullYear()}`
}

const CHART_GREEN = "#22C55E"
const CHART_RED = "#EF4444"
const GRID_COLOR = "hsl(var(--border))"
const TEXT_MUTED = "hsl(var(--muted-foreground))"

function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted/50 p-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Sem dados para exibir</p>
      <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
        Conecte seu banco ou importe transações para ver o fluxo de caixa.
      </p>
    </div>
  )
}

export function CashFlowChart({
  transactions = [],
  monthIncome,
  monthExpense,
  monthlyData,
}: CashFlowChartProps) {
  const now = new Date()

  const chartData =
    monthlyData && monthlyData.length > 0
      ? monthlyData.slice(-6).map((m) => ({
          name: m.month.split(" ")[0],
          Receita: m.income,
          Despesa: m.expense,
        }))
      : (() => {
          const currentMonth = getMonthYear(now)
          const filtered = transactions.filter(
            (tx) => getMonthYear(new Date(tx.date)) === currentMonth
          )
          const income =
            monthIncome ??
            filtered.filter((tx) => tx.type === "INCOME").reduce((acc, tx) => acc + tx.amount, 0)
          const expense =
            monthExpense ??
            filtered.filter((tx) => tx.type === "EXPENSE").reduce((acc, tx) => acc + tx.amount, 0)
          return [
            {
              name: now.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
              Receita: income,
              Despesa: expense,
            },
          ]
        })()

  const hasData = chartData.some((d) => d.Receita > 0 || d.Despesa > 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Fluxo de caixa</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[280px]">
            <EmptyChartState />
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                <span className="text-sm text-muted-foreground">Receita</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-sm text-muted-foreground">Despesa</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap={20} barGap={8} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" stroke={TEXT_MUTED} fontSize={11} tick={{ fill: TEXT_MUTED }} />
                <YAxis stroke={TEXT_MUTED} fontSize={11} tickFormatter={formatCurrency} tick={{ fill: TEXT_MUTED }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => formatCurrency(value as number)}
                />
                <Bar dataKey="Receita" fill={CHART_GREEN} radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="Despesa" fill={CHART_RED} radius={[4, 4, 0, 0]} name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
