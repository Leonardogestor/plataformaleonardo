"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb } from "lucide-react"

interface InsightCardProps {
  text?: string
  netWorth?: number
  cashFlow?: number
  monthExpense?: number
  monthIncome?: number
}

export function InsightCard({
  text,
  cashFlow = 0,
}: InsightCardProps) {
  const generateInsight = (): string => {
    if (text) return text
    if (cashFlow > 0) return "Você teve superávit este mês. Seu patrimônio está crescendo."
    if (cashFlow < 0) return "Atenção: despesas superaram as receitas. Revise seus gastos."
    return "Receitas e despesas equilibradas. Considere aumentar investimentos."
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-warning/20 p-2">
            <Lightbulb className="h-4 w-4 text-warning" strokeWidth={2} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{generateInsight()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
