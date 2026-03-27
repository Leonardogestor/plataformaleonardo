"use client"

import { PeriodHeader } from "@/components/global/period-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
  Shield,
  Info,
  Lightbulb,
  Calculator
} from "lucide-react"
import { useConfidenceAdaptedStrategy } from "@/hooks/use-confidence-adapted-strategy"
import { useAutosaveEditableData } from "@/hooks/use-autosave-editable-data"
import { useRobustProfileDetection } from "@/hooks/use-robust-profile-detection"
import { useToneAdaptation } from "@/hooks/use-tone-adaptation"
import { useGlobalDate } from "@/contexts/global-date-context"
import { ExplainableConfidence } from "@/components/dashboard/explainable-confidence"
import { RangeProjections } from "@/components/dashboard/range-projections"
import { TrustBadge } from "@/components/dashboard/trust-badge"
import { CalculationExplanation } from "@/components/dashboard/calculation-explanation"
import { adaptText } from "@/hooks/use-tone-adaptation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function FinalTrustStrategyPage() {
  const { formatDateShort } = useGlobalDate()
  const adaptedStrategy = useConfidenceAdaptedStrategy()
  const { trustMetrics, pendingChanges, lastSaveTime, isSaving } = useAutosaveEditableData()
  const profileData = useRobustProfileDetection()
  const tone = useToneAdaptation()

  if (!adaptedStrategy || !profileData) {
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

  const { adaptedStrategy: strategy, confidenceLevel, adaptationReasons } = adaptedStrategy

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
      case "excellent": return "text-green-600 bg-green-100"
      case "good": return "text-blue-600 bg-blue-100"
      case "warning": return "text-yellow-600 bg-yellow-100"
      case "critical": return "text-red-600 bg-red-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getAggressivenessColor = (aggressiveness: string) => {
    switch (aggressiveness) {
      case "aggressive": return "bg-red-100 text-red-800"
      case "moderate": return "bg-yellow-100 text-yellow-800"
      case "conservative": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getAggressivenessLabel = (aggressiveness: string) => {
    switch (aggressiveness) {
      case "aggressive": return "Agressiva"
      case "moderate": return "Moderada"
      case "conservative": return "Conservadora"
      default: return "Padrão"
    }
  }

  return (
    <div className="space-y-6">
      <PeriodHeader />

      {/* Explainable Confidence Section */}
      {trustMetrics && (
        <ExplainableConfidence
          trustMetrics={{
            ...trustMetrics,
            factors: profileData.confidence.factors
          }}
          incomeAnalysis={profileData.incomeAnalysis}
          profile={profileData.profile}
        />
      )}

      {/* Confidence Adaptation Notice */}
      {(confidenceLevel !== "high" || adaptationReasons.length > 0) && (
        <Alert className={cn(
          "border-l-4",
          confidenceLevel === "low" && "border-l-red-500 bg-red-50/50",
          confidenceLevel === "medium" && "border-l-yellow-500 bg-yellow-50/50"
        )}>
          <Info className="h-4 w-4" />
          <AlertTitle>Estratégia Adaptada à Confiança</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                {confidenceLevel === "low" 
                  ? adaptText("Devido à baixa confiança nos dados, as recomendações foram ajustadas para serem mais conservadoras.", tone)
                  : confidenceLevel === "medium"
                  ? adaptText("As recomendações foram moderadas baseadas no nível médio de confiança dos dados.", tone)
                  : adaptText("Análise com alta precisão baseada em dados consistentes.", tone)
                }
              </p>
              {adaptationReasons.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Motivos dos ajustes:</p>
                  <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                    {adaptationReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* SECTION 1 - FINANCIAL DIAGNOSIS WITH TRUST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Diagnóstico Financeiro Adaptado
            {strategy.diagnosis.confidenceAdjusted && (
              <TrustBadge confidenceLevel={confidenceLevel} size="sm" variant="subtle" />
            )}
          </h2>
          <TrustBadge confidenceLevel={confidenceLevel} showIcon={true} showText={true} />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Poupança</p>
                <PiggyBank className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{formatPercent(strategy.diagnosis.savingsRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Ideal: {formatPercent(strategy.diagnosis.idealSavingsRate)}
              </div>
              <Progress value={strategy.diagnosis.savingsRate * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Saúde Financeira</p>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <Badge className={getHealthColor(strategy.diagnosis.financialHealth)}>
                  {strategy.diagnosis.financialHealth === "excellent" ? "Excelente" :
                   strategy.diagnosis.financialHealth === "good" ? "Boa" :
                   strategy.diagnosis.financialHealth === "warning" ? "Atenção" : "Crítica"}
                </Badge>
                {strategy.diagnosis.confidenceAdjusted && (
                  <p className="text-xs text-muted-foreground">Avaliação conservada</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Resultado Mensal</p>
                <DollarSign className="h-4 w-4" />
              </div>
              <div className={`text-2xl font-bold ${
                strategy.diagnosis.monthlyResult >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatCurrency(strategy.diagnosis.monthlyResult)}
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
                {formatCurrency(strategy.diagnosis.currentWealth)}
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
                {Math.floor(strategy.diagnosis.estimatedRetirementAge)} anos
              </div>
              {strategy.diagnosis.confidenceAdjusted && (
                <p className="text-xs text-muted-foreground mt-1">Projeção conservada</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2 - MAIN PROBLEM WITH TONE ADAPTATION */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Problema Principal Identificado
          {strategy.mainProblem.confidenceAdjusted && (
            <TrustBadge confidenceLevel={confidenceLevel} size="sm" variant="subtle" />
          )}
        </h2>

        <Alert variant={strategy.mainProblem.severity === "high" ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{adaptText(strategy.mainProblem.description, tone)}</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Severidade: {strategy.mainProblem.severity === "high" ? "Alta" : 
                           strategy.mainProblem.severity === "medium" ? "Média" : "Baixa"}
              </Badge>
              {strategy.mainProblem.impact > 0 && (
                <span className="text-sm">
                  Impacto: {formatCurrency(strategy.mainProblem.impact)}
                </span>
              )}
              {strategy.mainProblem.confidenceAdjusted && (
                <span className="text-xs text-muted-foreground">Análise conservada</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* SECTION 3 - ACTION PLAN WITH TONE ADAPTATION */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Plano de Ação Adaptado
        </h2>

        <div className="space-y-4">
          {strategy.actionPlan.map((action, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{adaptText(action.action, tone)}</h3>
                      <Badge className={getAggressivenessColor(action.aggressiveness)}>
                        {getAggressivenessLabel(action.aggressiveness)}
                      </Badge>
                      {action.confidenceAdjusted && (
                        <TrustBadge confidenceLevel={confidenceLevel} size="sm" variant="subtle" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.impact}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {action.category && (
                        <span>Categoria: {action.category}</span>
                      )}
                      <span>Valor: {formatCurrency(action.value)}</span>
                      <span>Prazo: {action.timeframe}</span>
                      <span>Prioridade: {action.priority}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {confidenceLevel === "high" ? "Implementar" : 
                     confidenceLevel === "medium" ? "Considerar" : "Avaliar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 4 - RANGE-BASED PROJECTIONS */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Perspectivas Futuras Adaptadas
          {strategy.futureOutlook.confidenceAdjusted && (
            <TrustBadge confidenceLevel={confidenceLevel} size="sm" variant="subtle" />
          )}
        </h2>

        <RangeProjections
          financialIndependenceAge={strategy.futureOutlook.financialIndependenceAge}
          projectedWealth={strategy.futureOutlook.projectedWealth}
          requiredWealth={strategy.futureOutlook.requiredWealth}
          confidenceLevel={confidenceLevel}
          confidenceAdjusted={strategy.futureOutlook.confidenceAdjusted}
        />

        {/* Disclaimer for adjusted projections */}
        {strategy.futureOutlook.disclaimer && (
          <Alert className="mt-4">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              {adaptText(strategy.futureOutlook.disclaimer, tone)}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* SECTION 5 - CALCULATION EXPLANATION */}
      <CalculationExplanation
        incomeType={profileData.profile === "variable" ? "avg6m" : "monthly"}
        incomeValue={profileData.incomeAnalysis.avg6m || profileData.incomeAnalysis.avg3m}
        savingsRate={strategy.diagnosis.savingsRate}
        retirementAge={strategy.diagnosis.estimatedRetirementAge}
        expectedReturn={0.07}
        inflationRate={0.04}
        currentAge={30}
      />

      {/* Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Estratégia adaptada ao seu nível de confiança de dados para maior precisão nas recomendações.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowRight className="h-3 w-3 mr-1" />
                Ver Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
