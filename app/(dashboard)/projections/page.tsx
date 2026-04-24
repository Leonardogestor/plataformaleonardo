"use client"

import { useState, useEffect } from "react"
import { SummaryCards } from "@/components/projections/summary-cards"
import { NetWorthChart } from "@/components/projections/net-worth-chart"
import { DetailsTabs } from "@/components/projections/details-tabs"
import { GoalsStatus } from "@/components/projections/goals-status"
import { InsightsBlock } from "@/components/projections/insights-block"

type ProjectionRow = {
  mes: number
  patrimonio: number
  patrimonioNecessario: number
  despesasMensais: number
  aporteMensal: number
  idadeAposentadoria: number | null
}

type ProjectionData = {
  pessimista: ProjectionRow[]
  base: ProjectionRow[]
  otimista: ProjectionRow[]
}

function buildSummary(base: ProjectionRow[]) {
  if (!base.length) {
    return { avgIncome: 0, avgExpense: 0, avgSaving: 0, finalNetWorth: 0, status: "Sem dados" }
  }
  const last = base[base.length - 1]!
  const avgExpense = base.reduce((s, r) => s + r.despesasMensais, 0) / base.length
  const avgSaving = base.reduce((s, r) => s + r.aporteMensal, 0) / base.length
  return {
    avgIncome: avgExpense + avgSaving,
    avgExpense,
    avgSaving,
    finalNetWorth: last.patrimonio,
    status: last.patrimonio >= last.patrimonioNecessario ? "Meta atingida" : "Em progresso",
  }
}

function buildSeries(base: ProjectionRow[]) {
  return base.map((r) => ({
    month: r.mes,
    netWorth: r.patrimonio,
    income: r.despesasMensais + r.aporteMensal,
    expense: r.despesasMensais,
    saving: r.aporteMensal,
    investment: r.aporteMensal,
  }))
}

export default function ProjectionsPage() {
  const [period, setPeriod] = useState(12)
  const [scenario, setScenario] = useState("baseline")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProjectionData | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/projections?period=${period}&scenario=${scenario}`)
      .then((res) => (res.ok ? res.json() : Promise.reject("Erro ao buscar projeções")))
      .then((json) => {
        if (json.base && Array.isArray(json.base)) {
          setData({
            pessimista: json.pessimista || [],
            base: json.base,
            otimista: json.otimista || [],
          })
        } else {
          setData(null)
        }
      })
      .catch(() => setError("Não foi possível carregar as projeções. Verifique sua conexão."))
      .finally(() => setLoading(false))
  }, [period, scenario])

  const summary = data ? buildSummary(data.base) : null
  const series = data ? buildSeries(data.base) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projeções Financeiras</h2>
          <p className="text-muted-foreground">
            Veja como suas decisões de hoje impactam seu futuro financeiro.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
            <option value={60}>60 meses</option>
          </select>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="baseline">Cenário Atual</option>
            <option value="adjusted">Cenário Ajustado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Carregando projeções...</div>
      ) : error ? (
        <div className="text-destructive py-12 text-center">{error}</div>
      ) : !data ? (
        <div className="text-muted-foreground py-12 text-center">
          Adicione transações para ver suas projeções financeiras.
        </div>
      ) : (
        <>
          {summary && <SummaryCards summary={summary} />}
          <NetWorthChart
            pessimista={data.pessimista}
            base={data.base}
            otimista={data.otimista}
          />
          <DetailsTabs series={series} />
          <GoalsStatus goals={[]} />
          <InsightsBlock insights={[]} />
        </>
      )}
    </div>
  )
}
