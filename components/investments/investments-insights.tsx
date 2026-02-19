"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb } from "lucide-react"

export interface InvestmentsInsightsInput {
  id: string
  name: string
  type: string
  amount: string | number
  currentValue: string | number
}

const TYPE_LABELS: Record<string, string> = {
  STOCKS: "Ações",
  BONDS: "Títulos",
  REAL_ESTATE: "Imóveis",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  FUNDS: "Fundos",
  OTHER: "Outro",
}

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

interface InvestmentsInsightsProps {
  investments: InvestmentsInsightsInput[]
}

export function InvestmentsInsights({ investments }: InvestmentsInsightsProps) {
  const insights = useMemo(() => {
    const list: string[] = []
    if (investments.length === 0) return list

    const total = investments.reduce((s, i) => s + toNum(i.currentValue), 0)
    if (total <= 0) return list

    const byAsset = investments.map((i) => ({
      name: i.name,
      value: toNum(i.currentValue),
      pct: (toNum(i.currentValue) / total) * 100,
    }))
    const byType = investments.reduce<Record<string, number>>((acc, i) => {
      const t = i.type || "OTHER"
      acc[t] = (acc[t] || 0) + toNum(i.currentValue)
      return acc
    }, {})
    const typeEntries = Object.entries(byType).map(([type, value]) => ({
      type,
      pct: (value / total) * 100,
    }))

    const maxAsset = byAsset.reduce((best, a) => (a.pct > best.pct ? a : best), { name: "", pct: 0 })
    if (maxAsset.pct > 40) {
      list.push(`Alta concentração em um único ativo: ${maxAsset.name} representa ${maxAsset.pct.toFixed(0)}% do portfólio. Considere diversificar.`)
    }

    const maxType = typeEntries.reduce((best, e) => (e.pct > best.pct ? e : best), { type: "", pct: 0 })
    if (maxType.pct > 70) {
      const label = TYPE_LABELS[maxType.type] || maxType.type
      list.push(`Mais de 70% alocado em uma única classe (${label}). Avalie distribuir entre outras classes de ativo.`)
    }

    const numTypesWithAllocation = typeEntries.filter((e) => e.pct > 0).length
    if (numTypesWithAllocation >= 3 && list.length === 0) {
      list.push("Portfólio distribuído em várias classes de ativo, o que pode ajudar a reduzir risco.")
    }
    if (numTypesWithAllocation >= 3 && (maxAsset.pct <= 40 && maxType.pct <= 70)) {
      list.push("Boa diversificação: três ou mais classes e concentração moderada.")
    }

    if (investments.length === 1) {
      list.push("Você possui apenas um investimento. Incluir outros ativos pode melhorar a diversificação.")
    }

    return list
  }, [investments])

  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Insights estratégicos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Análise com base na alocação atual (sem dados de mercado)
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
