"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, TrendingDown, ArrowRightLeft } from "lucide-react"

export interface StatsProps {
  netWorth: number
  monthIncome: number
  monthExpense: number
  cashFlow: number
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const getTrend = (value: number) => {
  if (value > 0) return "↑"
  if (value < 0) return "↓"
  return "→"
}

export function Stats({ netWorth, monthIncome, monthExpense, cashFlow }: StatsProps) {
  const cards = [
    {
      title: "Patrimônio",
      value: netWorth,
      icon: <TrendingUp className="text-teal-400" size={32} />,
      color: "bg-teal-900",
      trend: getTrend(netWorth),
    },
    {
      title: "Receita do mês",
      value: monthIncome,
      icon: <DollarSign className="text-green-400" size={32} />,
      color: "bg-green-900",
      trend: getTrend(monthIncome),
    },
    {
      title: "Despesa do mês",
      value: monthExpense,
      icon: <TrendingDown className="text-red-400" size={32} />,
      color: "bg-red-900",
      trend: getTrend(-monthExpense),
    },
    {
      title: "Fluxo de caixa",
      value: cashFlow,
      icon: <ArrowRightLeft className="text-blue-400" size={32} />,
      color: "bg-blue-900",
      trend: getTrend(cashFlow),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx} className={`${card.color} text-white shadow-lg`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent className="flex flex-col items-start">
            <span className="text-2xl font-bold">{formatCurrency(card.value)}</span>
            <span className="text-sm mt-1 opacity-80">Tendência: {card.trend}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default Stats
