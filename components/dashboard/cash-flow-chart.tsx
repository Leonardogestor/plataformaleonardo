import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
;("use client")

export interface Transaction {
  date: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

export interface CashFlowChartProps {
  transactions: Transaction[]
}

function getMonthYear(date: Date) {
  return `${date.getMonth() + 1}/${date.getFullYear()}`
}

export function CashFlowChart({ transactions }: CashFlowChartProps) {
  // Filtra transações do mês atual
  const now = new Date()
  const currentMonth = getMonthYear(now)
  const filtered = transactions.filter((tx) => getMonthYear(new Date(tx.date)) === currentMonth)
  const income = filtered
    .filter((tx) => tx.type === "INCOME")
    .reduce((acc, tx) => acc + tx.amount, 0)
  const expense = filtered
    .filter((tx) => tx.type === "EXPENSE")
    .reduce((acc, tx) => acc + tx.amount, 0)
  const chartData = [
    {
      name: now.toLocaleDateString("pt-BR", { month: "long", year: "2-digit" }),
      Receita: income,
      Despesa: expense,
    },
  ]

  return (
    <div className="bg-dark rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-2 text-white">Receita vs Despesa do mês</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#fff" />
          <YAxis
            stroke="#fff"
            tickFormatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
          <Tooltip
            formatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            labelStyle={{ color: "#0ff" }}
            contentStyle={{ background: "#222", border: "none", color: "#fff" }}
          />
          <Legend />
          <Bar dataKey="Receita" fill="#22c55e" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Despesa" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
