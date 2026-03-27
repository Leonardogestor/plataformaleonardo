"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Calendar,
  Users,
  Edit3,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

interface ExplainableConfidenceProps {
  trustMetrics: {
    score: number
    level: "high" | "medium" | "low"
    overrideRatio: number
    anomalyCount: number
    factors: {
      dataCompleteness: number
      overrideRatio: number
      dataConsistency: number
    }
  }
  incomeAnalysis?: {
    variation: number
    consistency: number
    avg3m: number
    avg6m: number
    monthsWithData: number
    totalMonths: number
  }
  profile?: "insufficient_data" | "stable" | "variable" | "investor"
}

export function ExplainableConfidence({
  trustMetrics,
  incomeAnalysis,
  profile,
}: ExplainableConfidenceProps) {
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-green-600 bg-green-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "low":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case "high":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "low":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getConfidenceLabel = (level: string) => {
    switch (level) {
      case "high":
        return "Alta Confiança"
      case "medium":
        return "Confiança Média"
      case "low":
        return "Baixa Confiança"
      default:
        return "Indeterminado"
    }
  }

  const getWhyReliable = (level: string, factors: any) => {
    if (level === "high") {
      return [
        {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: "Dados de renda consistentes",
          detail: `${Math.round(factors.dataConsistency * 100)}% dos meses com dados registrados`,
        },
        {
          icon: <Edit3 className="h-4 w-4 text-green-600" />,
          text: "Poucas alterações manuais",
          detail: `Apenas ${Math.round(factors.overrideRatio * 100)}% dos campos foram alterados`,
        },
        {
          icon: <TrendingUp className="h-4 w-4 text-green-600" />,
          text: "Padrão financeiro estável",
          detail: "Comportamento consistente ao longo do tempo",
        },
      ]
    }

    if (level === "medium") {
      return [
        {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          text: "Dados razoavelmente consistentes",
          detail: `${Math.round(factors.dataCompleteness * 100)}% de histórico disponível`,
        },
        {
          icon: <Edit3 className="h-4 w-4 text-yellow-600" />,
          text: "Algumas alterações manuais",
          detail: `${Math.round(factors.overrideRatio * 100)}% dos campos foram ajustados`,
        },
      ]
    }

    if (level === "low") {
      return [
        {
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
          text: "⚠️ Dados insuficientes",
          detail: `Apenas ${Math.round(factors.dataCompleteness * 100)}% do histórico necessário`,
        },
        {
          icon: <Edit3 className="h-4 w-4 text-red-600" />,
          text: "⚠️ Muitas alterações manuais detectadas",
          detail: "Alterações excessivas podem distorcer a realidade",
        },
        {
          icon: <TrendingUp className="h-4 w-4 text-red-600" />,
          text: "⚠️ Padrão de renda inconsistente",
          detail: `Apenas ${Math.round(factors.dataConsistency * 100)}% de consistência nos dados`,
        },
      ]
    }

    return []
  }

  const getWhyLowerConfidence = (level: string, factors: any) => {
    if (level !== "low") return []

    const reasons = []

    if (factors.dataCompleteness < 0.7) {
      reasons.push({
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        text: "Histórico de dados insuficiente",
        detail: "Precisamos de mais transações para análise precisa",
      })
    }

    if (factors.overrideRatio > 0.3) {
      reasons.push({
        icon: <Edit3 className="h-4 w-4 text-red-600" />,
        text: "Muitas alterações manuais detectadas",
        detail: "Alterações excessivas podem distorcer a realidade",
      })
    }

    if (factors.dataConsistency < 0.6) {
      reasons.push({
        icon: <TrendingUp className="h-4 w-4 text-red-600" />,
        text: "Padrão de renda inconsistente",
        detail: "Variação muito alta na renda mensal",
      })
    }

    return reasons
  }

  return (
    <Card
      className={cn(
        "border-l-4",
        trustMetrics.level === "high" && "border-l-green-500",
        trustMetrics.level === "medium" && "border-l-yellow-500",
        trustMetrics.level === "low" && "border-l-red-500"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {getConfidenceIcon(trustMetrics.level)}
          Por que esta análise é confiável
        </CardTitle>
        <CardDescription>
          Transparência sobre a precisão das suas informações financeiras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Confidence Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getConfidenceColor(trustMetrics.level)}>
                {getConfidenceLabel(trustMetrics.level)}
              </Badge>
              <span className="text-sm font-medium">
                Score: {Math.round(trustMetrics.score * 100)}%
              </span>
            </div>
            <Progress value={trustMetrics.score * 100} className="w-32" />
          </div>

          {/* WHY RELIABLE - HIGH CONFIDENCE */}
          {trustMetrics.level === "high" && (
            <div className="space-y-4">
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Esta análise é altamente confiável porque:
              </h4>
              <div className="grid gap-3">
                {getWhyReliable("high", trustMetrics.factors).map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-green-800">{item.text}</p>
                      <p className="text-xs text-green-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHY LOWER CONFIDENCE - LOW CONFIDENCE */}
          {trustMetrics.level === "low" && (
            <div className="space-y-4">
              <h4 className="font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Esta análise tem confiança reduzida porque:
              </h4>
              <div className="grid gap-3">
                {getWhyLowerConfidence("low", trustMetrics.factors).map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-red-800">{item.text}</p>
                      <p className="text-xs text-red-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEDIUM CONFIDENCE */}
          {trustMetrics.level === "medium" && (
            <div className="space-y-4">
              <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Esta análise tem confiança razoável:
              </h4>
              <div className="grid gap-3">
                {getWhyReliable("medium", trustMetrics.factors).map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">{item.text}</p>
                      <p className="text-xs text-yellow-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FACTORS BREAKDOWN */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Fatores considerados:
            </h4>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-muted-foreground">Completude dos dados:</span>
                <span className="font-medium">
                  {formatPercent(trustMetrics.factors.dataCompleteness)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-muted-foreground">Taxa de alterações:</span>
                <span
                  className={cn(
                    "font-medium",
                    trustMetrics.factors.overrideRatio > 0.3 && "text-red-600"
                  )}
                >
                  {formatPercent(trustMetrics.factors.overrideRatio)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-muted-foreground">Consistência da renda:</span>
                <span
                  className={cn(
                    "font-medium",
                    trustMetrics.factors.dataConsistency < 0.6 && "text-red-600"
                  )}
                >
                  {formatPercent(trustMetrics.factors.dataConsistency)}
                </span>
              </div>
            </div>
          </div>

          {/* INCOME ANALYSIS */}
          {incomeAnalysis && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Análise de Renda:
              </h4>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Meses com dados:</p>
                  <p className="font-medium">{incomeAnalysis.monthsWithData}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Variação:</p>
                  <p
                    className={cn("font-medium", incomeAnalysis.variation > 0.3 && "text-red-600")}
                  >
                    {formatPercent(incomeAnalysis.variation)}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Média 3M:</p>
                  <p className="font-medium">{formatCurrency(incomeAnalysis.avg3m)}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Média 6M:</p>
                  <p className="font-medium">{formatCurrency(incomeAnalysis.avg6m)}</p>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE INFO */}
          {profile && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Perfil Detectado:
              </h4>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                <Badge variant="outline">
                  {profile === "stable"
                    ? "Renda Estável"
                    : profile === "variable"
                      ? "Renda Variável"
                      : profile === "investor"
                        ? "Focado em Investimentos"
                        : "Dados Insuficientes"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {profile === "stable"
                    ? "Padrão consistente de renda"
                    : profile === "variable"
                      ? "Renda flutuante ao longo do tempo"
                      : profile === "investor"
                        ? "Foco em crescimento de patrimônio"
                        : "Mais dados necessários"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
