"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Edit3,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TrustIndicatorProps {
  trustMetrics: {
    score: number
    level: "high" | "medium" | "low"
    overrideRatio: number
    anomalyCount: number
  }
  pendingChanges: number
  lastSaveTime: Date | null
  isSaving: boolean
}

export function TrustIndicator({ 
  trustMetrics, 
  pendingChanges, 
  lastSaveTime, 
  isSaving 
}: TrustIndicatorProps) {
  const getTrustColor = (level: string) => {
    switch (level) {
      case "high": return "text-green-600 bg-green-100"
      case "medium": return "text-yellow-600 bg-yellow-100"
      case "low": return "text-red-600 bg-red-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getTrustIcon = (level: string) => {
    switch (level) {
      case "high": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "medium": return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "low": return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Shield className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrustLabel = (level: string) => {
    switch (level) {
      case "high": return "Alta Confiança"
      case "medium": return "Confiança Média"
      case "low": return "Baixa Confiança"
      default: return "Indeterminado"
    }
  }

  const getTrustMessage = (level: string, score: number, overrideRatio: number, anomalyCount: number) => {
    if (level === "high") {
      return "Alta precisão da análise - dados consistentes e confiáveis"
    }
    
    if (level === "low") {
      if (anomalyCount > 0) {
        return "Dados insuficientes ou com anomalias detectadas"
      }
      if (overrideRatio > 0.5) {
        return "Muitas alterações manuais - pode afetar precisão"
      }
      return "Dados insuficientes para análise precisa"
    }
    
    return "Análise razoavelmente precisa - alguns dados foram alterados"
  }

  const formatLastSave = (date: Date | null) => {
    if (!date) return "Nunca salvo"
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Agora"
    if (diffMins < 60) return `Há ${diffMins} min`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Há ${diffHours}h`
    
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <Card className={cn(
      "border-l-4",
      trustMetrics.level === "high" && "border-l-green-500",
      trustMetrics.level === "medium" && "border-l-yellow-500", 
      trustMetrics.level === "low" && "border-l-red-500"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getTrustIcon(trustMetrics.level)}
          Nível de Confiança
        </CardTitle>
        <CardDescription>
          Precisão e confiabilidade dos dados financeiros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Trust Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getTrustColor(trustMetrics.level)}>
                {getTrustLabel(trustMetrics.level)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {Math.round(trustMetrics.score * 100)}%
              </span>
            </div>
            <Progress value={trustMetrics.score * 100} className="w-24" />
          </div>

          {/* Trust Message */}
          <p className="text-sm text-muted-foreground">
            {getTrustMessage(trustMetrics.level, trustMetrics.score, trustMetrics.overrideRatio, trustMetrics.anomalyCount)}
          </p>

          {/* Metrics Breakdown */}
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dados Modificados:</span>
              <span className={cn(
                "font-medium",
                trustMetrics.overrideRatio > 0.5 && "text-red-600"
              )}>
                {Math.round(trustMetrics.overrideRatio * 100)}%
              </span>
            </div>
            
            {trustMetrics.anomalyCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Anomalias Detectadas:</span>
                <span className="font-medium text-red-600">
                  {trustMetrics.anomalyCount}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Último Salvamento:</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatLastSave(lastSaveTime)}
              </span>
            </div>
          </div>

          {/* Pending Changes */}
          {pendingChanges > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <Edit3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {pendingChanges} alteração{pendingChanges > 1 ? 'ões' : ''} pendente{pendingChanges > 1 ? 's' : ''}
              </span>
              {isSaving && (
                <span className="text-xs text-blue-600">Salvando...</span>
              )}
            </div>
          )}

          {/* Warnings for Low Trust */}
          {trustMetrics.level === "low" && (
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">Atenção à Precisão</p>
                  <p>
                    {trustMetrics.anomalyCount > 0 
                      ? "Foram detectadas anomalias nos dados. Verifique as alterações."
                      : "Dados insuficientes ou muito alterados. Continue registrando transações para melhorar a precisão."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* High Trust Reinforcement */}
          {trustMetrics.level === "high" && (
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-medium mb-1">Excelente Qualidade de Dados</p>
                  <p>
                    Seus dados financeiros são consistentes e confiáveis. As análises e recomendações têm alta precisão.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
