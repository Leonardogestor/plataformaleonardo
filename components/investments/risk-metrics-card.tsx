"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Shield, AlertTriangle, TrendingDown, Activity } from "lucide-react"
import { AdvancedMetrics } from "@/services/portfolioAnalytics"
import { cn } from "@/lib/utils"

interface RiskMetricsCardProps {
  metrics: AdvancedMetrics
  className?: string
}

export function RiskMetricsCard({ metrics, className }: RiskMetricsCardProps) {
  const getRiskLevel = (volatility: number | null) => {
    if (!volatility) return { level: 'Desconhecido', color: 'text-gray-600', bg: 'bg-gray-100' }
    if (volatility < 10) return { level: 'Muito Baixo', color: 'text-green-600', bg: 'bg-green-100' }
    if (volatility < 15) return { level: 'Baixo', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    if (volatility < 20) return { level: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (volatility < 25) return { level: 'Elevado', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: 'Muito Elevado', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getSharpeLevel = (sharpe: number | null) => {
    if (!sharpe) return { level: 'N/A', color: 'text-gray-600', bg: 'bg-gray-100' }
    if (sharpe > 2) return { level: 'Excelente', color: 'text-green-600', bg: 'bg-green-100' }
    if (sharpe > 1) return { level: 'Bom', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    if (sharpe > 0.5) return { level: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (sharpe > 0) return { level: 'Baixo', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: 'Ruim', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getDrawdownLevel = (drawdown: number | null) => {
    if (!drawdown) return { level: 'Desconhecido', color: 'text-gray-600', bg: 'bg-gray-100' }
    if (drawdown < 10) return { level: 'Baixo', color: 'text-green-600', bg: 'bg-green-100' }
    if (drawdown < 20) return { level: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (drawdown < 35) return { level: 'Elevado', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: 'Muito Elevado', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const riskLevel = getRiskLevel(metrics.volatility)
  const sharpeLevel = getSharpeLevel(metrics.sharpeRatio)
  const drawdownLevel = getDrawdownLevel(metrics.maxDrawdown)

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-red-500" />
          Métricas de Risco
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Volatilidade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Volatilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {metrics.volatility?.toFixed(1) || 'N/A'}%
              </span>
              <Badge className={cn("text-xs", riskLevel.bg, riskLevel.color)}>
                {riskLevel.level}
              </Badge>
            </div>
          </div>
          {metrics.volatility && (
            <Progress 
              value={Math.min(metrics.volatility, 40)} 
              className="h-2"
              max={40}
            />
          )}
        </div>

        {/* Sharpe Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Sharpe Ratio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {metrics.sharpeRatio?.toFixed(2) || 'N/A'}
              </span>
              <Badge className={cn("text-xs", sharpeLevel.bg, sharpeLevel.color)}>
                {sharpeLevel.level}
              </Badge>
            </div>
          </div>
          {metrics.sharpeRatio && (
            <Progress 
              value={Math.min(Math.max(metrics.sharpeRatio * 20, 0), 100)} 
              className="h-2"
            />
          )}
        </div>

        {/* Drawdown Máximo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Drawdown Máximo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {metrics.maxDrawdown?.toFixed(1) || 'N/A'}%
              </span>
              <Badge className={cn("text-xs", drawdownLevel.bg, drawdownLevel.color)}>
                {drawdownLevel.level}
              </Badge>
            </div>
          </div>
          {metrics.maxDrawdown && (
            <Progress 
              value={Math.min(metrics.maxDrawdown, 60)} 
              className="h-2"
              max={60}
            />
          )}
        </div>

        {/* IRR */}
        {metrics.irr !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">IRR (TIR)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-mono",
                  metrics.irr >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metrics.irr >= 0 ? '+' : ''}{metrics.irr.toFixed(2)}%
                </span>
                <Badge className={cn(
                  "text-xs",
                  metrics.irr >= 10 ? "bg-green-100 text-green-800" :
                  metrics.irr >= 0 ? "bg-blue-100 text-blue-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {metrics.irr >= 10 ? 'Excelente' : metrics.irr >= 0 ? 'Positivo' : 'Negativo'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Análise de Risco */}
        <div className="pt-3 border-t">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Análise de Risco</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  riskLevel.color
                )}></div>
                <span>Volatilidade: {riskLevel.level}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  sharpeLevel.color
                )}></div>
                <span>Eficiência: {sharpeLevel.level}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  drawdownLevel.color
                )}></div>
                <span>Drawdown: {drawdownLevel.level}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  metrics.sharpeRatio && metrics.sharpeRatio > 1 ? "bg-green-500" : "bg-orange-500"
                )}></div>
                <span>Risco-Retorno: {metrics.sharpeRatio && metrics.sharpeRatio > 1 ? 'Favorável' : 'Desfavorável'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recomendação Principal */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {metrics.volatility && metrics.volatility > 25
              ? "⚠️ Volatilidade elevada detectada. Considere diversificar com ativos de menor risco."
              : metrics.sharpeRatio && metrics.sharpeRatio < 0.5
              ? "⚠️ Baixa eficiência risco-retorno. Revise sua alocação para otimizar resultados."
              : metrics.maxDrawdown && metrics.maxDrawdown > 30
              ? "⚠️ Alto potencial de perdas. Considere reduzir exposição a ativos de alto risco."
              : "✅ Perfil de risco adequado. Continue monitorando as métricas regularmente."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
