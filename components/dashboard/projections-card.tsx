"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboard } from "@/contexts/dashboard-context"
import { useDashboardData } from "@/hooks/use-dashboard-data"

export function ProjectionsCard() {
  const { month, year } = useDashboard()
  const { data } = useDashboardData()

  // Calculate projections based on current month data and trends
  const calculateProjections = () => {
    if (!data?.metrics) {
      return [
        { label: "Receita Projetada", value: 0, color: "text-green-400" },
        { label: "Despesa Projetada", value: 0, color: "text-red-400" },
        { label: "Investimento", value: 0, color: "text-blue-400" },
        { label: "Aportes", value: 0, color: "text-primary" },
      ]
    }

    const { monthIncome, monthExpense, cashFlow } = data.metrics

    // Simple projection logic (can be enhanced with ML/trends)
    const incomeGrowth = 1.05 // 5% growth assumption
    const expenseGrowth = 1.03 // 3% growth assumption
    const investmentRate = 0.2 // 20% of positive cash flow

    const projectedIncome = Math.round(monthIncome * incomeGrowth)
    const projectedExpense = Math.round(monthExpense * expenseGrowth)
    const projectedInvestment = cashFlow > 0 ? Math.round(cashFlow * investmentRate) : 0
    const projectedSavings = cashFlow > 0 ? Math.round(cashFlow * 0.8) : 0

    return [
      { label: "Receita Projetada", value: projectedIncome, color: "text-green-400" },
      { label: "Despesa Projetada", value: projectedExpense, color: "text-red-400" },
      { label: "Investimento", value: projectedInvestment, color: "text-blue-400" },
      { label: "Aportes", value: projectedSavings, color: "text-primary" },
    ]
  }

  const projections = calculateProjections()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Projeções -{" "}
          {new Date(year, month - 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projections.map((projection, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{projection.label}</span>
              <span className={`font-semibold ${projection.color}`}>
                {formatCurrency(projection.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
