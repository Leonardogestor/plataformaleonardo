"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

interface Investment {
  id: string
  type: string
  currentValue: number
}

interface InvestmentsSummaryProps {
  investments?: Investment[] | null
}

const TYPE_LABELS: Record<string, string> = {
  FIXED_INCOME: "Renda Fixa",
  STOCKS: "Ações",
  BONDS: "Títulos",
  REAL_ESTATE: "Imóveis",
  CRYPTO: "Cripto",
  FUNDS: "Fundos",
  OTHER: "Outros",
}

const TYPE_COLORS: Record<string, string> = {
  FIXED_INCOME: "#22c55e",
  STOCKS: "#eab308",
  BONDS: "#3b82f6",
  REAL_ESTATE: "#ef4444",
  CRYPTO: "#a855f7",
  FUNDS: "#06b6d4",
  OTHER: "#6b7280",
}

export function InvestmentsSummary({ investments }: InvestmentsSummaryProps) {
  const list = investments?.length ? investments : []
  const total = list.reduce((s, i) => s + i.currentValue, 0)
  const byType = list.reduce<Record<string, number>>((acc, i) => {
    const t = i.type || "OTHER"
    acc[t] = (acc[t] || 0) + i.currentValue
    return acc
  }, {})
  const allocationData = Object.entries(byType).map(([type, value]) => ({
    name: TYPE_LABELS[type] || type,
    value: total > 0 ? Math.round((value / total) * 100) : 0,
    color: TYPE_COLORS[type] || TYPE_COLORS.OTHER,
  }))

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Investimentos</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Nenhum investimento cadastrado.</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/investments">Cadastrar investimento</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => (value > 0 ? `${name} ${value}%` : "")}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(total)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
