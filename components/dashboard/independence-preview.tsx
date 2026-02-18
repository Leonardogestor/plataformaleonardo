"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export interface IndependencePreviewData {
  patrimonioAtual: number
  despesaAnual: number
  patrimonioNecessario: number
  percentual: number
  mensagem: string
}

interface IndependencePreviewProps {
  data: IndependencePreviewData
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function IndependencePreview({ data }: IndependencePreviewProps) {
  const { patrimonioAtual, patrimonioNecessario, percentual, mensagem } = data

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Independência financeira
        </CardTitle>
        <CardDescription>
          Preview com base na regra dos 4% (patrimônio = 25× despesa anual)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{mensagem}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Patrimônio atual</span>
            <span className="font-medium">{formatCurrency(patrimonioAtual)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meta sugerida</span>
            <span className="font-medium">{formatCurrency(patrimonioNecessario)}</span>
          </div>
          <Progress value={Math.min(100, percentual)} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">{percentual.toFixed(0)}% da meta</p>
        </div>
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/planning" className="inline-flex items-center gap-2">
            Ver planejamento completo <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
