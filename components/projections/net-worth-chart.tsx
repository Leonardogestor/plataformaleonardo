import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

interface NetWorthChartProps {
  data: Array<{
    month: number
    netWorth: number
    income: number
    expense: number
    saving: number
    investment: number
  }>
}

const gridStroke = "hsl(var(--border))"
const axisStroke = "hsl(var(--muted-foreground))"

export function NetWorthChart({ data }: NetWorthChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2 text-foreground">Evolução do Patrimônio</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tickFormatter={(m) => `${m}º`} stroke={axisStroke} tick={{ fill: axisStroke }} />
          <YAxis tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`} stroke={axisStroke} tick={{ fill: axisStroke }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number) =>
              `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            }
            labelFormatter={(m) => `Mês ${m}`}
          />
          <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
          <Line
            type="monotone"
            dataKey="netWorth"
            name="Patrimônio"
            stroke="#f59e42"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="investment"
            name="Investimentos"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Receita"
            stroke="#22c55e"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Despesa"
            stroke="#ef4444"
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
