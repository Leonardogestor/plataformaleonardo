"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

interface Transaction {
  date: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

interface EvolutionPoint {
  month: string
  netWorth: number
}

interface NetWorthChartProps {
  transactions?: Transaction[]
  initialBalance: number
  evolutionData?: EvolutionPoint[]
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function groupByMonth(transactions: Transaction[]) {
  const map = new Map<string, number>()
  transactions.forEach((tx) => {
    const key = formatMonth(new Date(tx.date))
    map.set(key, (map.get(key) || 0) + tx.amount * (tx.type === "EXPENSE" ? -1 : 1))
  })
  return map
}

const CHART_BLUE = "#3B82F6"
const GRID_COLOR = "hsl(var(--border))"
const TEXT_MUTED = "hsl(var(--muted-foreground))"

function EmptyEvolutionState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted/50 p-4">
        <LineChartIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Sem histórico ainda</p>
      <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
        Suas transações vão gerar a evolução do patrimônio ao longo do tempo.
      </p>
    </div>
  )
}

export function NetWorthChart({ transactions = [], initialBalance, evolutionData }: NetWorthChartProps) {
  const data = evolutionData?.length
    ? evolutionData.map((p) => ({ month: p.month, saldo: p.netWorth }))
    : (() => {
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date()
          d.setMonth(d.getMonth() - (5 - i))
          return formatMonth(d)
        })
        const grouped = groupByMonth(transactions)
        let saldo = initialBalance
        return months.map((month) => {
          saldo += grouped.get(month) || 0
          return { month, saldo }
        })
      })()

  const hasData = data.some((d) => d.saldo !== 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Evolução patrimonial</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[280px]">
            <EmptyEvolutionState />
          </div>
        ) : (
          <>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="month" stroke={TEXT_MUTED} fontSize={11} tick={{ fill: TEXT_MUTED }} />
            <YAxis stroke={TEXT_MUTED} fontSize={11} tickFormatter={formatCurrency} tick={{ fill: TEXT_MUTED }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [formatCurrency(value), "Patrimônio"]}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke={CHART_BLUE}
              strokeWidth={2}
              dot={{ fill: CHART_BLUE, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Valor atual</span>
          <span className="font-semibold text-primary">
            {formatCurrency(data[data.length - 1]?.saldo ?? 0)}
          </span>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  )
}
