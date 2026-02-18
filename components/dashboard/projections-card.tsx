"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProjectionsCard() {
  const projections = [
    { label: "Receita Projetada", value: 10000, color: "text-green-400" },
    { label: "Despesa Projetada", value: 6000, color: "text-red-400" },
    { label: "Investimento", value: 2000, color: "text-blue-400" },
    { label: "Aportes", value: 1500, color: "text-primary" },
  ]

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
        <CardTitle className="text-base font-semibold text-foreground">Projeções</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projections.map((projection, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{projection.label}</span>
            <span className={`text-lg font-bold ${projection.color}`}>
              {formatCurrency(projection.value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
