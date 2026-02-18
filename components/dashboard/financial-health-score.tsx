"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Shield, TrendingUp } from "lucide-react"

export type RiscoConsolidado = "baixo" | "moderado" | "alto"
export type TendenciaPatrimonial = "ascendente" | "estável" | "descendente"

interface FinancialHealthScoreProps {
  score: number
  risco_consolidado: RiscoConsolidado
  tendencia_patrimonial: TendenciaPatrimonial
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excelente"
  if (score >= 60) return "Bom"
  if (score >= 40) return "Atenção"
  return "Crítico"
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-primary"
  if (score >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

function getRiscoConfig(risco: RiscoConsolidado) {
  const config = {
    baixo: { label: "Risco baixo", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20" },
    moderado: { label: "Risco moderado", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/20" },
    alto: { label: "Risco alto", color: "text-destructive", bg: "bg-destructive/20" },
  }
  return config[risco]
}

function getTendenciaConfig(tendencia: TendenciaPatrimonial) {
  const config = {
    ascendente: { label: "Tendência ascendente", color: "text-emerald-600 dark:text-emerald-400", icon: TrendingUp },
    estável: { label: "Tendência estável", color: "text-muted-foreground", icon: Activity },
    descendente: { label: "Tendência descendente", color: "text-destructive", icon: TrendingUp },
  }
  return config[tendencia]
}

export function FinancialHealthScore({
  score,
  risco_consolidado,
  tendencia_patrimonial,
}: FinancialHealthScoreProps) {
  const scoreLabel = getScoreLabel(score)
  const scoreColor = getScoreColor(score)
  const riscoConfig = getRiscoConfig(risco_consolidado)
  const tendenciaConfig = getTendenciaConfig(tendencia_patrimonial)
  const TendenciaIcon = tendenciaConfig.icon

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{score}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saúde financeira</p>
              <p className={`text-lg font-semibold ${scoreColor}`}>{scoreLabel}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div className="flex flex-wrap gap-4">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${riscoConfig.bg}`}>
              <Shield className={`h-4 w-4 ${riscoConfig.color}`} />
              <span className={`text-sm font-medium ${riscoConfig.color}`}>{riscoConfig.label}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
              <TendenciaIcon
                className={`h-4 w-4 ${tendenciaConfig.color} ${tendencia_patrimonial === "descendente" ? "rotate-180" : ""}`}
              />
              <span className={`text-sm font-medium ${tendenciaConfig.color}`}>{tendenciaConfig.label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
