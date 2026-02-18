"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Loader2, Target, Percent, Grid3X3 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const MONTH_LABELS: Record<string, string> = {
  "1": "Jan",
  "2": "Fev",
  "3": "Mar",
  "4": "Abr",
  "5": "Mai",
  "6": "Jun",
  "7": "Jul",
  "8": "Ago",
  "9": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
}

function formatMonth(ym: string) {
  const m = ym.split("-")[1] ?? ""
  return MONTH_LABELS[m] ?? m
}

interface HeatmapExecucao {
  categories: string[]
  months: string[]
  matrix: number[][]
}

function HeatmapCell({ value }: { value: number }) {
  if (value <= 0) {
    return (
      <div
        className="h-8 min-w-[2rem] rounded border border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground"
        title="Sem orçamento"
      >
        —
      </div>
    )
  }
  const pct = Math.min(200, Math.round(value * 100))
  const isOver = value > 1
  const isOk = value <= 1
  const bg = isOver ? "bg-destructive/80 text-destructive-foreground" : isOk ? "bg-emerald-600/80 text-white" : "bg-muted"
  return (
    <div
      className={`h-8 min-w-[2rem] rounded flex items-center justify-center text-xs font-medium ${bg}`}
      title={`${pct}% do orçamento`}
    >
      {pct}%
    </div>
  )
}

export default function PlanningPage() {
  const [months, setMonths] = useState<string[]>([])
  const [categories, setCategories] = useState<Array<{ category: string; byMonth: { month: string; planned: number; actual: number }[] }>>([])
  const [indicePrevisibilidade, setIndicePrevisibilidade] = useState<number | null>(null)
  const [taxaExecucao, setTaxaExecucao] = useState<number | null>(null)
  const [heatmapExecucao, setHeatmapExecucao] = useState<HeatmapExecucao | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("6")

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const fetchPlanning = useCallback(async () => {
    setLoading(true)
    const n = parseInt(period, 10) || 6
    const parts = currentMonth.split("-").map(Number)
    const y = parts[0] ?? new Date().getFullYear()
    const m = parts[1] ?? new Date().getMonth() + 1
    const start = new Date(y, m - 1, 1)
    start.setMonth(start.getMonth() - (n - 1))
    const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`

    try {
      const res = await fetch(
        `/api/planning?startMonth=${startMonth}&endMonth=${currentMonth}`
      )
      if (res.ok) {
        const data = await res.json()
        setMonths(data.months || [])
        setCategories(data.categories || [])
        setIndicePrevisibilidade(data.indice_previsibilidade_financeira ?? null)
        setTaxaExecucao(data.taxa_execucao_orcamento ?? null)
        setHeatmapExecucao(data.heatmap_execucao ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [period, currentMonth])

  useEffect(() => {
    fetchPlanning()
  }, [fetchPlanning])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Planejamento e Controle</h2>
          <p className="text-muted-foreground">
            Compare o planejado com o realizado por categoria e mês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link href="/budget">Ajustar orçamento</Link>
          </Button>
        </div>
      </div>

      {(indicePrevisibilidade != null || taxaExecucao != null) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Índice de previsibilidade financeira</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{indicePrevisibilidade ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                % de vezes que o gasto ficou dentro do orçamento no período
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de execução do orçamento</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{taxaExecucao ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total realizado / total planejado no período
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {heatmapExecucao && heatmapExecucao.months.length > 0 && heatmapExecucao.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Heatmap de execução
            </CardTitle>
            <CardDescription>
              Verde = dentro do orçamento · Vermelho = estouro. Valor = realizado/planejado (%).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 mb-2">
                <div className="w-32 shrink-0" />
                {heatmapExecucao.months.map((month) => (
                  <div
                    key={month}
                    className="h-8 min-w-[2rem] flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {formatMonth(month)}
                  </div>
                ))}
              </div>
              {heatmapExecucao.categories.map((cat, i) => (
                <div key={cat} className="flex gap-1 items-center mb-1">
                  <div className="w-32 shrink-0 text-sm truncate" title={cat}>
                    {cat}
                  </div>
                  <div className="flex gap-1">
                    {heatmapExecucao.matrix[i]?.map((val, j) => (
                      <HeatmapCell key={`${i}-${j}`} value={val} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tabela Planejado x Realizado</CardTitle>
          <CardDescription>
            Valores por categoria. Planejado = orçamento definido; Realizado = gastos do mês.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {months.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum dado no período. Defina orçamentos em{" "}
              <Link href="/budget" className="text-primary underline">
                Orçamento
              </Link>{" "}
              e registre transações para ver a comparação.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Categoria</th>
                  {months.map((month) => (
                    <th key={month} colSpan={2} className="text-center py-2 px-1 font-medium">
                      {formatMonth(month)}
                    </th>
                  ))}
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 px-2" />
                  {months.flatMap((month) => [
                    <th key={`p-${month}`} className="py-1 px-1 text-right font-normal w-24" scope="col">
                      Planej.
                    </th>,
                    <th key={`r-${month}`} className="py-1 px-1 text-right font-normal w-24" scope="col">
                      Real.
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {categories.map((row) => (
                  <tr key={row.category} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{row.category}</td>
                    {row.byMonth.flatMap((cell) => {
                      const over = cell.planned > 0 && cell.actual > cell.planned
                      return [
                        <td key={`${cell.month}-p`} className="py-1 px-1 text-right tabular-nums">
                          {cell.planned > 0 ? formatCurrency(cell.planned) : "—"}
                        </td>,
                        <td
                          key={`${cell.month}-a`}
                          className={`py-1 px-1 text-right tabular-nums ${over ? "text-destructive" : ""}`}
                        >
                          {cell.actual > 0 ? formatCurrency(cell.actual) : "—"}
                        </td>,
                      ]
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
