"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { AdvancedMetrics } from "@/services/portfolioAnalytics"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface BenchmarkComparisonCardProps {
  metrics: AdvancedMetrics
  className?: string
}

export function BenchmarkComparisonCard({ metrics, className }: BenchmarkComparisonCardProps) {
  const benchmarks = [
    {
      name: 'CDI',
      fullName: 'Certificado de Depósito Interbancário',
      return: metrics.benchmarkComparison.cdi.return,
      alpha: metrics.benchmarkComparison.cdi.alpha,
      outperformance: metrics.benchmarkComparison.cdi.outperformance,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'IBOVESPA',
      fullName: 'Bolsa de Valores Brasileira',
      return: metrics.benchmarkComparison.ibovespa.return,
      alpha: metrics.benchmarkComparison.ibovespa.alpha,
      outperformance: metrics.benchmarkComparison.ibovespa.outperformance,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'S&P 500',
      fullName: 'Índice Americano',
      return: metrics.benchmarkComparison.sp500.return,
      alpha: metrics.benchmarkComparison.sp500.alpha,
      outperformance: metrics.benchmarkComparison.sp500.outperformance,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  const getAlphaColor = (alpha: number) => {
    if (alpha > 2) return 'text-green-600 bg-green-100'
    if (alpha > 0) return 'text-emerald-600 bg-emerald-100'
    if (alpha > -2) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getAlphaLabel = (alpha: number) => {
    if (alpha > 5) return 'Alfa Excelente'
    if (alpha > 2) return 'Alfa Bom'
    if (alpha > 0) return 'Alfa Positivo'
    if (alpha > -2) return 'Ligeiramente Abaixo'
    return 'Subperformance'
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Comparação com Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo do Portfólio */}
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {metrics.benchmarkComparison.cdi.return.toFixed(2)}%
          </div>
          <p className="text-sm text-muted-foreground">Retorno Anual do Portfólio</p>
        </div>

        {/* Comparações Detalhadas */}
        <div className="space-y-3">
          {benchmarks.map((benchmark) => (
            <div key={benchmark.name} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{benchmark.name}</div>
                  <div className="text-xs text-muted-foreground">{benchmark.fullName}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-medium">
                    {benchmark.return.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">vs Portfólio</div>
                </div>
              </div>

              {/* Alpha */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Alpha (diferença)</span>
                <Badge className={getAlphaColor(benchmark.alpha)}>
                  {benchmark.alpha >= 0 ? '+' : ''}{benchmark.alpha.toFixed(2)}%
                </Badge>
              </div>

              {/* Performance */}
              <div className="flex items-center gap-2">
                {benchmark.outperformance ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      Superando em {Math.abs(benchmark.alpha).toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      Abaixo em {Math.abs(benchmark.alpha).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Insight Principal */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="font-medium">Análise:</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.benchmarkComparison.cdi.outperformance 
              ? "Seu portfólio está superando os principais benchmarks, indicando boa gestão e seleção de ativos."
              : metrics.benchmarkComparison.cdi.alpha > -2
              ? "Seu portfólio está próximo dos benchmarks. Pequenos ajustes podem melhorar a performance."
              : "Seu portfólio está performando abaixo dos benchmarks. Considere revisar sua estratégia."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
