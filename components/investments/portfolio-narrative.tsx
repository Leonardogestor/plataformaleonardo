"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Target, Eye } from "lucide-react"
import { PortfolioNarrative as PortfolioNarrativeType } from "@/services/insightsEngine"
import { cn } from "@/lib/utils"

interface PortfolioNarrativeProps {
  narrative: PortfolioNarrativeType
  className?: string
}

export function PortfolioNarrative({ narrative, className }: PortfolioNarrativeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800"
    if (score >= 65) return "bg-blue-100 text-blue-800"
    if (score >= 45) return "bg-yellow-100 text-yellow-800"
    if (score >= 25) return "bg-orange-100 text-orange-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-indigo-500" />
          Análise Inteligente do Portfólio
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Narrativa automática baseada em análise quantitativa avançada
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score e Classificação */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Score Geral</div>
            <div className="text-2xl font-bold">{narrative.score}/100</div>
          </div>
          <Badge className={cn("text-sm px-3 py-1", getScoreColor(narrative.score))}>
            {narrative.classification}
          </Badge>
        </div>

        {/* Resumo Executivo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium text-sm">Resumo Executivo</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{narrative.summary}</p>
        </div>

        {/* Pontos Fortes */}
        {narrative.strengths.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h4 className="font-medium text-sm">Pontos Fortes</h4>
            </div>
            <ul className="space-y-2">
              {narrative.strengths.map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pontos de Atenção */}
        {narrative.concerns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="font-medium text-sm">Pontos de Atenção</h4>
            </div>
            <ul className="space-y-2">
              {narrative.concerns.map((concern: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                  <span className="text-muted-foreground">{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendações Principais */}
        {narrative.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <h4 className="font-medium text-sm">Recomendações Principais</h4>
            </div>
            <ul className="space-y-2">
              {narrative.recommendations
                .slice(0, 3)
                .map((recommendation: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div>
                    <span className="text-muted-foreground">{recommendation}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Perspectivas Futuras */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium text-sm">Perspectivas Futuras</h4>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 leading-relaxed">{narrative.outlook}</p>
          </div>
        </div>

        {/* Próximos Passos */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">{narrative.concerns.length}</div>
              <div className="text-xs text-red-600">Pontos de Atenção</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{narrative.strengths.length}</div>
              <div className="text-xs text-green-600">Pontos Fortes</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {narrative.recommendations.length}
              </div>
              <div className="text-xs text-purple-600">Recomendações</div>
            </div>
          </div>
        </div>

        {/* Sumário Final */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-blue-900">
              Portfólio {narrative.classification.toLowerCase()}
            </div>
            <p className="text-sm text-blue-700">
              {narrative.score >= 70
                ? "Continue monitorando e fazendo ajustes finos para manter a performance."
                : narrative.score >= 45
                  ? "Foque nas recomendações de alta prioridade para melhorar a eficiência."
                  : "Implemente as sugestões críticas urgentemente para reduzir riscos."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
