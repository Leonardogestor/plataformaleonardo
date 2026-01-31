"use client"

interface Transaction {
  date: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

interface NetWorthChartProps {
  transactions: Transaction[]
  initialBalance: number
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function formatMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

function groupByMonth(transactions: Transaction[]) {
  const map = new Map<string, number>()
  transactions.forEach((tx) => {
    const key = formatMonth(new Date(tx.date))
    map.set(key, (map.get(key) || 0) + tx.amount * (tx.type === "EXPENSE" ? -1 : 1))
  })
  return map
}

export function NetWorthChart({ transactions, initialBalance }: NetWorthChartProps) {
  // Agrupa por mês e calcula saldo acumulado
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return formatMonth(d)
  })
  const grouped = groupByMonth(transactions)
  let saldo = initialBalance
  const data = months.map((month) => {
    saldo += grouped.get(month) || 0
    return { month, saldo }
  })

  return (
    <div className="bg-dark rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-2 text-white">Evolução Patrimonial (6 meses)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" stroke="#fff" />
          <YAxis
            stroke="#fff"
            tickFormatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
          <Tooltip
            formatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            labelStyle={{ color: "#0ff" }}
            contentStyle={{ background: "#222", border: "none", color: "#fff" }}
          />
          <Line type="monotone" dataKey="saldo" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
