"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Shield, PieChart } from "lucide-react"
import { PortfolioScore } from "@/services/portfolioAnalytics"
import { cn } from "@/lib/utils"

interface PortfolioScoreCardProps {
  score: PortfolioScore
  className?: string
}

export function PortfolioScoreCard({ score, className }: PortfolioScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 65) return "text-blue-600"
    if (score >= 45) return "text-yellow-600"
    if (score >= 25) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100"
    if (score >= 65) return "bg-blue-100"
    if (score >= 45) return "bg-yellow-100"
    if (score >= 25) return "bg-orange-100"
    return "bg-red-100"
  }

  const getClassificationBadge = (classification: string) => {
    const colors = {
      'Excelente': 'bg-green-100 text-green-800',
      'Bom': 'bg-blue-100 text-blue-800',
      'Regular': 'bg-yellow-100 text-yellow-800',
      'Ruim': 'bg-orange-100 text-orange-800',
      'Crítico': 'bg-red-100 text-red-800'
    }
    return colors[classification as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          Score do Portfólio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Principal */}
        <div className="text-center space-y-2">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold",
            getScoreBgColor(score.score),
            getScoreColor(score.score)
          )}>
            {score.score}
          </div>
          <Badge className={getClassificationBadge(score.classification)}>
            {score.classification}
          </Badge>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Análise Detalhada</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <PieChart className="h-3 w-3 text-blue-500" />
                <span>Diversificação</span>
              </div>
              <span className="font-medium">{score.breakdown.diversification}/100</span>
            </div>
            <Progress value={score.breakdown.diversification} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Risco</span>
              </div>
              <span className="font-medium">{score.breakdown.risk}/100</span>
            </div>
            <Progress value={score.breakdown.risk} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <span>Retorno</span>
              </div>
              <span className="font-medium">{score.breakdown.return}/100</span>
            </div>
            <Progress value={score.breakdown.return} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-orange-500" />
                <span>Concentração</span>
              </div>
              <span className="font-medium">{score.breakdown.concentration}/100</span>
            </div>
            <Progress value={score.breakdown.concentration} className="h-2" />
          </div>
        </div>

        {/* Recomendação Rápida */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {score.score >= 70 
              ? "Seu portfólio está bem estruturado. Continue monitorando."
              : score.score >= 45
              ? "Seu portfólio precisa de alguns ajustes para melhorar a eficiência."
              : "Atenção: seu portfólio requer ajustes urgentes para reduzir riscos."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
