"use client"
// TELA 4: Projeções - Estrutura inicial
import { useState, useEffect } from "react"
import { SummaryCards } from "@/components/projections/summary-cards"
import { NetWorthChart } from "@/components/projections/net-worth-chart"
import { DetailsTabs } from "@/components/projections/details-tabs"
import { GoalsStatus } from "@/components/projections/goals-status"
import { InsightsBlock } from "@/components/projections/insights-block"

import { TooltipProgressiva } from "@/components/tooltip-progressiva"

export default function ProjectionsPage() {
  // Estado inicial: período e cenário
  const [period, setPeriod] = useState(12) // meses
  const [scenario, setScenario] = useState("baseline")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/projections?period=${period}&scenario=${scenario}`)
      .then((res) => (res.ok ? res.json() : Promise.reject("Erro ao buscar projeções")))
      .then((data) => {
        setSummary(data.summary)
        setSeries(data.series || [])
        setGoals(data.goals || [])
        setInsights(data.insights || [])
      })
      .catch(() => setError("Erro ao buscar projeções"))
      .finally(() => setLoading(false))
  }, [period, scenario])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <TooltipProgressiva
            id="projections_scenario"
            text="Altere o cenário ou período para simular diferentes futuros. Use para planejar com confiança."
            cta="Ver impacto"
          >
            <h2 className="text-3xl font-bold tracking-tight">Projeções Financeiras</h2>
          </TooltipProgressiva>
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
        <div className="text-muted-foreground">Carregando projeções...</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : summary ? (
        <>
          <SummaryCards summary={summary} />
          <NetWorthChart data={series} />
          <DetailsTabs series={series} />
          <GoalsStatus goals={goals} />
          <InsightsBlock insights={insights} />
        </>
      ) : null}
    </div>
  )
}
