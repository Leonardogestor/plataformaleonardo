"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Brain,
  AlertTriangle,
  Target,
  ArrowRight,
} from "lucide-react"
import { useFinancialData } from "@/hooks/use-financial-data-react-query"
import { useStrategy } from "@/hooks/use-strategy"
import Link from "next/link"

export function StrategicDashboard() {
  const { calculations, finalBalance, isLoading } = useFinancialData()
  const strategy = useStrategy()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)
  }

  if (isLoading || !calculations) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { receitas, despesas, investimentos, resultado, savingsRate } = calculations

  return (
    <div className="space-y-6">
      {/* KEY METRICS - Decision Focus */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Cash Flow - Most Important */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Fluxo de Caixa</p>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div
              className={`text-2xl font-bold ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(resultado)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={Math.max(0, savingsRate * 100)} className="flex-1" />
              <span className="text-xs text-muted-foreground">{formatPercent(savingsRate)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">🟢 Receitas</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(receitas)}</div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">🔴 Despesas</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(Math.abs(despesas))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPercent(Math.abs(despesas) / receitas)} da receita
            </div>
          </CardContent>
        </Card>

        {/* Net Worth */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Patrimônio</p>
              <PiggyBank className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(finalBalance || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STRATEGY INSIGHTS - New Block */}
      {strategy && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Problem Alert */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Problema Principal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm">{strategy.mainProblem.description}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={strategy.mainProblem.severity === "high" ? "destructive" : "default"}
                  >
                    {strategy.mainProblem.severity === "high"
                      ? "Alta"
                      : strategy.mainProblem.severity === "medium"
                        ? "Média"
                        : "Baixa"}{" "}
                    prioridade
                  </Badge>
                  {strategy.mainProblem.impact > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Impacto: {formatCurrency(strategy.mainProblem.impact)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Action */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-green-500" />
                Ação Recomendada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm font-medium">{strategy.actionPlan[0]?.action}</p>
                <p className="text-xs text-muted-foreground">{strategy.actionPlan[0]?.impact}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {strategy.actionPlan[0]?.category &&
                      `Categoria: ${strategy.actionPlan[0]?.category} | `}
                    Impacto: {formatCurrency(strategy.actionPlan[0]?.value || 0)}
                  </span>
                  <Button size="sm" asChild>
                    <Link href="/strategy">
                      Ver Plano Completo <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HEALTH INDICATORS */}
      {strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              Saúde Financeira
            </CardTitle>
            <CardDescription>Visão geral da sua situação financeira atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercent(strategy.diagnosis.savingsRate)}
                </div>
                <p className="text-sm text-muted-foreground">Taxa de Poupança</p>
                <p className="text-xs text-muted-foreground">
                  Ideal: {formatPercent(strategy.diagnosis.idealSavingsRate)}
                </p>
                <Progress value={strategy.diagnosis.savingsRate * 100} className="mt-2" />
              </div>

              <div className="text-center">
                <Badge
                  className={
                    strategy.diagnosis.financialHealth === "excellent"
                      ? "bg-green-100 text-green-800"
                      : strategy.diagnosis.financialHealth === "good"
                        ? "bg-blue-100 text-blue-800"
                        : strategy.diagnosis.financialHealth === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                  }
                >
                  {strategy.diagnosis.financialHealth === "excellent"
                    ? "Excelente"
                    : strategy.diagnosis.financialHealth === "good"
                      ? "Boa"
                      : strategy.diagnosis.financialHealth === "warning"
                        ? "Atenção"
                        : "Crítica"}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">Status Geral</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.floor(strategy.diagnosis.estimatedRetirementAge)} anos
                </div>
                <p className="text-sm text-muted-foreground">Aposentadoria Estimada</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(strategy.futureOutlook.projectedWealth)}
                </div>
                <p className="text-sm text-muted-foreground">Patrimônio Projetado</p>
                <p className="text-xs text-muted-foreground">
                  Meta: {formatCurrency(strategy.futureOutlook.requiredWealth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
