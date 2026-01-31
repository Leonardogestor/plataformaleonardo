// Card de resumo de cartões do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { LucideCreditCard, Flag } from "lucide-react"

export interface CardSummary {
  id: string
  brand: "Visa" | "Mastercard" | "Elo" | "Amex" | "Outros"
  limit: number
  invoice: number
  points: number
  installments: number
  paidPercent: number
}

export interface CardsSummaryProps {
  cards: CardSummary[]
}

function getBrandIcon(brand: string) {
  switch (brand) {
    case "Elo":
      return <Flag className="text-yellow-400" size={24} />
    case "Amex":
      return <Flag className="text-green-400" size={24} />
    default:
      return <LucideCreditCard className="text-teal-400" size={24} />
  }
}

export function CardsSummary({ cards }: CardsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const usedPercent = card.limit > 0 ? (card.invoice / card.limit) * 100 : 0
        return (
          <Card key={card.id} className="bg-dark border-2 border-teal-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {getBrandIcon(card.brand)} {card.brand}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>Limite:</span>
                  <span className="font-bold">
                    {card.limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fatura:</span>
                  <span className="font-bold">
                    {card.invoice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pontos/Fidelidade:</span>
                  <span className="font-bold">{card.points}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Compras Parceladas:</span>
                  <span className="font-bold">{card.installments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pago vs a Pagar:</span>
                  <span className="font-bold">{card.paidPercent.toFixed(1)}%</span>
                </div>
                <div className="mt-2">
                  <Progress value={usedPercent} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    Utilização do limite: {usedPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
