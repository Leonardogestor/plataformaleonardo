"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Target,
  ChevronRight,
  Clock
} from "lucide-react"
import { Recommendation } from "@/services/portfolioSimulation"
import { cn } from "@/lib/utils"

interface IntelligentRecommendationsProps {
  recommendations: Recommendation[]
  className?: string
}

export function IntelligentRecommendations({ recommendations, className }: IntelligentRecommendationsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200'
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'baixa': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DIVERSIFY': return <Target className="h-4 w-4 text-blue-500" />
      case 'REDUCE_RISK': return <Shield className="h-4 w-4 text-red-500" />
      case 'INCREASE_RETURN': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'REBALANCE': return <Lightbulb className="h-4 w-4 text-purple-500" />
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'baixo': return 'text-green-600'
      case 'medio': return 'text-yellow-600'
      case 'alto': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getActionabilityLabel = (priority: string) => {
    switch (priority) {
      case 'alta': return 'Implementar Imediatamente'
      case 'media': return 'Planejar para Curto Prazo'
      case 'baixa': return 'Considerar Futuramente'
      default: return 'Avaliar Oportunidade'
    }
  }

  if (recommendations.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-green-500" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma recomendação no momento
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Seu portfólio está bem equilibrado. Continue monitorando regularmente.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Recomendações Inteligentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sugestões automatizadas baseadas em análise quantitativa do seu portfólio
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">
              {recommendations.filter(r => r.priority === 'alta').length}
            </div>
            <div className="text-xs text-red-600">Alta Prioridade</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">
              {recommendations.filter(r => r.priority === 'media').length}
            </div>
            <div className="text-xs text-yellow-600">Média Prioridade</div>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {recommendations.filter(r => r.priority === 'baixa').length}
            </div>
            <div className="text-xs text-blue-600">Baixa Prioridade</div>
          </div>
        </div>

        {/* Lista de Recomendações */}
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className={cn(
                "p-4 border rounded-lg space-y-3 transition-all hover:shadow-md",
                getPriorityColor(recommendation.priority)
              )}
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(recommendation.type)}
                  <div>
                    <h4 className="font-medium text-sm">{recommendation.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getPriorityColor(recommendation.priority))}
                      >
                        {recommendation.priority.toUpperCase()}
                      </Badge>
                      <span className={cn("text-xs", getEffortColor(recommendation.effort))}>
                        Esforço: {recommendation.effort}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {getActionabilityLabel(recommendation.priority)}
                  </span>
                </div>
              </div>

              {/* Descrição */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {recommendation.description}
              </p>

              {/* Impacto Esperado */}
              {Object.keys(recommendation.expectedImpact).length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">Impacto Esperado:</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {recommendation.expectedImpact.sharpeImprovement && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        <span>Sharpe +{recommendation.expectedImpact.sharpeImprovement}</span>
                      </div>
                    )}
                    {recommendation.expectedImpact.riskReduction && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <span>Risco -{recommendation.expectedImpact.riskReduction}%</span>
                      </div>
                    )}
                    {recommendation.expectedImpact.returnImprovement && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span>Retorno +{recommendation.expectedImpact.returnImprovement}%</span>
                      </div>
                    )}
                    {recommendation.expectedImpact.diversificationImprovement && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span>Diversificação +{recommendation.expectedImpact.diversificationImprovement}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ação Recomendada */}
              <div className="flex items-center justify-between pt-2 border-t border-current/20">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Ação:</span>
                  <span className="text-xs text-muted-foreground">{recommendation.action}</span>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7">
                  Implementar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo de Prioridades */}
        <div className="pt-3 border-t">
          <div className="bg-muted/30 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Plano de Ação Sugerido:</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {recommendations.filter(r => r.priority === 'alta').length > 0 && (
                <div>• Foco imediato nas {recommendations.filter(r => r.priority === 'alta').length} recomendações de alta prioridade</div>
              )}
              {recommendations.filter(r => r.priority === 'media').length > 0 && (
                <div>• Planejar {recommendations.filter(r => r.priority === 'media').length} ajustes de médio prazo</div>
              )}
              {recommendations.filter(r => r.priority === 'baixa').length > 0 && (
                <div>• Considerar {recommendations.filter(r => r.priority === 'baixa').length} otimizações futuras</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
