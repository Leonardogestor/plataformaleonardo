"use client"

import { PeriodHeader } from "@/components/global/period-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Brain,
  Calendar,
  DollarSign,
  PiggyBank,
  ArrowRight,
} from "lucide-react"
import { useStrategy } from "@/hooks/use-strategy"
import { useGlobalDate } from "@/contexts/global-date-context"
import Link from "next/link"

export default function StrategyPage() {
  const { formatDateShort } = useGlobalDate()
  const strategy = useStrategy()

  if (!strategy) {
    return (
      <div className="space-y-6">
        <PeriodHeader />
        <div className="animate-pulse space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-32 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { diagnosis, mainProblem, actionPlan, futureOutlook } = strategy

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

  const getHealthColor = (health: string) => {
    switch (health) {
      case "excellent":
        return "text-green-600 bg-green-100"
      case "good":
        return "text-blue-600 bg-blue-100"
      case "warning":
        return "text-yellow-600 bg-yellow-100"
      case "critical":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getProblemSeverity = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "default"
      default:
        return "default"
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 90) return "bg-red-100 text-red-800"
    if (priority >= 70) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  const getPriorityLabel = (priority: number) => {
    if (priority >= 90) return "Alta"
    if (priority >= 70) return "Média"
    return "Baixa"
  }

  return (
    <div className="space-y-6">
      <PeriodHeader />

      {/* SECTION 1 - FINANCIAL DIAGNOSIS */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Diagnóstico Financeiro
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Poupança</p>
                <PiggyBank className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{formatPercent(diagnosis.savingsRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Ideal: {formatPercent(diagnosis.idealSavingsRate)}
              </div>
              <Progress value={diagnosis.savingsRate * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Saúde Financeira</p>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <Badge className={getHealthColor(diagnosis.financialHealth)}>
                  {diagnosis.financialHealth === "excellent"
                    ? "Excelente"
                    : diagnosis.financialHealth === "good"
                      ? "Boa"
                      : diagnosis.financialHealth === "warning"
                        ? "Atenção"
                        : "Crítica"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Resultado Mensal</p>
                <DollarSign className="h-4 w-4" />
              </div>
              <div
                className={`text-2xl font-bold ${
                  diagnosis.monthlyResult >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(diagnosis.monthlyResult)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Patrimônio Atual</p>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(diagnosis.currentWealth)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Idade Aposentadoria</p>
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">
                {Math.floor(diagnosis.estimatedRetirementAge)} anos
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {futureOutlook.yearsToIndependence} anos
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2 - MAIN PROBLEM DETECTION */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Problema Principal Identificado
        </h2>

        <Alert variant={getProblemSeverity(mainProblem.severity)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{mainProblem.description}</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Severidade:{" "}
                {mainProblem.severity === "high"
                  ? "Alta"
                  : mainProblem.severity === "medium"
                    ? "Média"
                    : "Baixa"}
              </Badge>
              {mainProblem.impact > 0 && (
                <span className="text-sm">Impacto: {formatCurrency(mainProblem.impact)}</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* SECTION 3 - ACTION PLAN */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Plano de Ação Recomendado
        </h2>

        <div className="space-y-4">
          {actionPlan.map((action, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{action.action}</h3>
                      <Badge className={getPriorityColor(action.priority)}>
                        {getPriorityLabel(action.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.impact}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {action.category && <span>Categoria: {action.category}</span>}
                      <span>Valor: {formatCurrency(action.value)}</span>
                      <span>Prazo: {action.timeframe}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Implementar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 4 - FUTURE OUTLOOK */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Perspectivas Futuras
        </h2>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Independência Financeira</CardTitle>
              <CardDescription>Idade estimada para atingir independência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {futureOutlook.financialIndependenceAge} anos
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {futureOutlook.yearsToIndependence} anos restantes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patrimônio Projetado</CardTitle>
              <CardDescription>Valor estimado na aposentadoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(futureOutlook.projectedWealth)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Meta: {formatCurrency(futureOutlook.requiredWealth)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Crescimento</CardTitle>
              <CardDescription>Crescimento mensal realista</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatPercent(futureOutlook.monthlyGrowthRate)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Baseado em 5% ao ano</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patrimônio Necessário</CardTitle>
              <CardDescription>Valor para independência financeira</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(futureOutlook.requiredWealth)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">4% rule anual</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contextual Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Análise Comparativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Situação Atual vs Ideal</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Taxa de Poupança:</span>
                  <span>
                    {formatPercent(diagnosis.savingsRate)} →{" "}
                    {formatPercent(diagnosis.idealSavingsRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Patrimônio:</span>
                  <span>
                    {formatCurrency(diagnosis.currentWealth)} →{" "}
                    {formatCurrency(futureOutlook.requiredWealth)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Próximos Passos</h4>
              <p className="text-sm text-muted-foreground">
                Implemente as ações recomendadas para atingir suas metas financeiras. Consistência é
                fundamental para o sucesso.
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/dashboard">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Ver Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
