// Card de resumo de cartões do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideCreditCard } from "lucide-react"

export type CardsSummaryProps = {
  limit: number
  invoice: number
  points: number
}

export function CardsSummary({ limit, invoice, points }: CardsSummaryProps) {
  return (
    <Card className="bg-zinc-900 border-2 border-teal-500 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Resumo de Cartões</CardTitle>
        <LucideCreditCard className="text-teal-500" size={32} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-sm text-zinc-400">Limite</span>
            <span className="font-bold">
              {limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Fatura</span>
            <span className="font-bold">
              {invoice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div>
            <span className="block text-sm text-zinc-400">Pontos</span>
            <span className="font-bold">{points}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
