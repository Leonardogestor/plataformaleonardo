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
import { Loader2 } from "lucide-react"
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
  const [, m] = ym.split("-")
  return `${MONTH_LABELS[m] || m}`
}

export default function PlanningPage() {
  const [months, setMonths] = useState<string[]>([])
  const [categories, setCategories] = useState<Array<{ category: string; byMonth: { month: string; planned: number; actual: number }[] }>>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("6")

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const fetchPlanning = useCallback(async () => {
    setLoading(true)
    const n = parseInt(period, 10) || 6
    const [y, m] = currentMonth.split("-").map(Number)
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
