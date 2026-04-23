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
  pessimista: Array<any>
  base: Array<any>
  otimista: Array<any>
}

const gridStroke = "hsl(var(--border))"
const axisStroke = "hsl(var(--muted-foreground))"

  return (
    <div className="bg-card rounded-lg border border-border shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2 text-foreground">Evolução do Patrimônio</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="mes" tickFormatter={(m) => `${m}º`} stroke={axisStroke} tick={{ fill: axisStroke }} />
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
            data={pessimista}
            dataKey="resultado"
            name="Pessimista"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            data={base}
            dataKey="resultado"
            name="Base"
            stroke="#f59e42"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            data={otimista}
            dataKey="resultado"
            name="Otimista"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
