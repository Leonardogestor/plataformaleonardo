"use client"

import React from "react"
import { TrendingUp, DollarSign, TrendingDown, ArrowRightLeft } from "lucide-react"
import { useDashboard } from "@/contexts/dashboard-context"
import { useDashboardData } from "@/hooks/use-dashboard-data"

export interface StatsProps {
  netWorth: number
  monthIncome: number
  monthExpense: number
  cashFlow: number
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function DashboardStats({ netWorth, monthIncome, monthExpense, cashFlow }: StatsProps) {
  const { month, year } = useDashboard()
  const { data } = useDashboardData()

  // Calculate month-over-month changes
  const calculateChanges = () => {
    // For now, return mock changes - in real implementation,
    // this would compare with previous month data
    return {
      netWorthChange: netWorth > 0 ? "+12,5%" : "—",
      netWorthChangeUp: netWorth > 0,
      incomeChange: monthIncome > 0 ? "+8,2%" : "—",
      incomeChangeUp: monthIncome > 0,
      expenseChange: monthExpense > 0 ? "+3,1%" : "—",
      expenseChangeUp: false,
      cashFlowChange: cashFlow > 0 ? "+15,3%" : "—",
      cashFlowChangeUp: cashFlow > 0,
    }
  }

  const changes = calculateChanges()
  const savingsRate = monthIncome > 0 ? Math.min(100, (cashFlow / monthIncome) * 100) : 0
  const expenseRate = monthIncome > 0 ? Math.min(100, (monthExpense / monthIncome) * 100) : 0

  const cards = [
    {
      label: "Patrimônio Líquido",
      value: netWorth,
      icon: TrendingUp,
      barColor: "bg-primary",
      barPercent: netWorth > 0 ? Math.min(100, 30 + Math.log10(Math.abs(netWorth)) * 15) : 10,
      change: changes.netWorthChange,
      changeUp: changes.netWorthChangeUp,
    },
    {
      label: "Receita do Mês",
      value: monthIncome,
      icon: DollarSign,
      barColor: "bg-info",
      barPercent: monthIncome > 0 ? Math.min(100, 20 + savingsRate / 5) : 10,
      change: changes.incomeChange,
      changeUp: changes.incomeChangeUp,
    },
    {
      label: "Despesa do Mês",
      value: monthExpense,
      icon: TrendingDown,
      barColor: "bg-warning",
      barPercent: expenseRate,
      change: changes.expenseChange,
      changeUp: changes.expenseChangeUp,
    },
    {
      label: "Fluxo de Caixa",
      value: cashFlow,
      icon: ArrowRightLeft,
      barColor: cashFlow >= 0 ? "bg-success" : "bg-destructive",
      barPercent:
        cashFlow >= 0
          ? Math.min(100, 50 + savingsRate / 2)
          : Math.min(100, Math.abs((cashFlow / monthIncome) * 100)),
      change: changes.cashFlowChange,
      changeUp: changes.cashFlowChangeUp,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, barColor, barPercent, change, changeUp }) => (
        <div
          key={label}
          className="rounded-lg border border-border/60 bg-card p-5 transition-colors hover:border-border"
        >
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(value)}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`text-xs font-semibold ${
                change === "—"
                  ? "text-muted-foreground"
                  : changeUp
                    ? "text-success"
                    : "text-destructive"
              }`}
            >
              {change === "—" ? change : `${changeUp ? "↑" : "↓"} ${change}`}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
