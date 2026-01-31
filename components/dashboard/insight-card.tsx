"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, AlertTriangle, Info } from "lucide-react"

export interface InsightCardProps {
  cashFlow: number
  monthExpense: number
  monthIncome: number
  netWorthHistory?: number[] // últimos 6 meses
}

const getInsights = (cashFlow: number, monthExpense: number, monthIncome: number) => {
  const insights: string[] = []
  if (cashFlow > 0) insights.push("Você teve superávit este mês!")
  if (cashFlow < 0) insights.push("Atenção: Você teve déficit este mês")
  if (monthExpense > monthIncome * 0.7) insights.push("Seus gastos estão altos")
  return insights.length
    ? insights
    : ["Adicione mais transações para gerar insights personalizados."]
}

function getIcon(insight: string) {
  if (
    insight.toLowerCase().includes("atenção") ||
    insight.toLowerCase().includes("alerta") ||
    insight.toLowerCase().includes("gastos")
  ) {
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }
  if (insight.toLowerCase().includes("superávit") || insight.toLowerCase().includes("crescendo")) {
    return <TrendingUp className="h-4 w-4 text-green-500" />
  }
  return <Info className="h-4 w-4 text-blue-500" />
}

export function InsightCard(props: InsightCardProps) {
  const insights = getInsights(props.cashFlow, props.monthExpense, props.monthIncome)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" /> Insights
        </CardTitle>
        <CardDescription>Análise inteligente das suas finanças</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            {getIcon(insight)}
            <p className="flex-1">{insight}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
