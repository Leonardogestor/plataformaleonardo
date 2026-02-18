"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CreditCard } from "lucide-react"

interface CardData {
  id: string
  name: string
  limit: number
  currentBalance?: number
}

interface CardsSummaryProps {
  cards?: CardData[] | null
}

export function CardsSummary({ cards }: CardsSummaryProps) {
  const defaultCards = [
    { id: "1", name: "Nubank", limit: 5000, currentBalance: 2300 },
    { id: "2", name: "Inter", limit: 3000, currentBalance: 800 },
  ]

  const displayCards: CardData[] = (cards?.length ?? 0) > 0 ? cards! : defaultCards

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getCardColor = (name: string) => {
    const colors: Record<string, string> = {
      Nubank: "bg-purple-600",
      Inter: "bg-orange-500",
      default: "bg-gray-700",
    }
    return colors[name] || colors.default
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">Cartões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayCards.slice(0, 2).map((card) => {
          const balance = card.currentBalance ?? 0
          const percentage = Math.round((balance / card.limit) * 100)
          const cardColor = getCardColor(card.name)

          return (
            <div key={card.id} className={`p-4 rounded-lg ${cardColor} border border-gray-700`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-white" />
                  <span className="font-bold text-white">{card.name}</span>
                </div>
                <span className="text-sm text-white font-medium">{percentage}%</span>
              </div>
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Limite</span>
                  <span className="text-white font-medium">{formatCurrency(card.limit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Fatura</span>
                  <span className="text-white font-medium">
                    {formatCurrency(card.currentBalance ?? 0)}
                  </span>
                </div>
              </div>
              <Progress value={percentage} className="h-1.5 bg-white/20" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
