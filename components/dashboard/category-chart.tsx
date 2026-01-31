"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export interface Transaction {
  date: string
  amount: number
  type: "INCOME" | "EXPENSE"
  category: string
}

export interface CategoryChartProps {
  transactions: Transaction[]
}

const COLORS = [
  "#22c55e", // Verde
  "#eab308", // Amarelo
  "#ef4444", // Vermelho
  "#a21caf", // Roxo
  "#3b82f6", // Azul
  "#64748b", // Cinza
]

function groupExpensesByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>()
  transactions.forEach((tx) => {
    if (tx.type === "EXPENSE") {
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
    }
  })
  return Array.from(map.entries()).map(([category, total]) => ({ category, total }))
}

export function CategoryChart({ transactions }: CategoryChartProps) {
  const expenses = groupExpensesByCategory(transactions)
  if (!expenses.length) {
    return (
      <div className="bg-dark rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-white">Gastos por Categoria</h3>
        <div className="flex h-[250px] items-center justify-center text-muted-foreground">
          Nenhuma despesa registrada neste mês.
        </div>
      </div>
    )
  }
  const chartData = expenses.map((item) => ({ name: item.category, value: Math.abs(item.total) }))

  return (
    <div className="bg-dark rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-2 text-white">Gastos por Categoria</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            labelStyle={{ color: "#0ff" }}
            contentStyle={{ background: "#222", border: "none", color: "#fff" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
