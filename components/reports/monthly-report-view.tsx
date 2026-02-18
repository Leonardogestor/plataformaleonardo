"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, FileText, AlertTriangle, Lightbulb, CheckCircle2, BarChart3 } from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

interface MonthlyReportViewProps {
  data: {
    period: {
      month: string
      year: number
    }
    summary: {
      totalIncome: number
      totalExpense: number
      cashFlow: number
      savingsRate: number
      netWorth: number
    }
    topCategories: Array<{
      category: string
      amount: number
      percentage: number
      count: number
    }>
    insights: string[]
    diagnostico?: string
    principal_risco?: string
    principal_oportunidade?: string
    decisao_recomendada?: string
    benchmarking_comparativo?: Array<{
      metrica: string
      seuValor: string
      referencia: string
      status: string
      descricao: string
    }>
  }
}

const COLORS = [
  "hsl(var(--info))", // Azul institucional
  "hsl(var(--secondary))", // Roxo institucional
  "hsl(var(--destructive))", // Vermelho alerta
  "hsl(var(--warning))", // Amarelo aviso
  "hsl(var(--success))", // Verde sucesso
  "hsl(var(--muted))", // Cinza institucional
]

export function MonthlyReportView({ data }: MonthlyReportViewProps) {
  const { period, summary, topCategories, insights, diagnostico, principal_risco, principal_oportunidade, decisao_recomendada, benchmarking_comparativo } = data

  const chartData = topCategories.map((cat) => ({
    name: cat.category,
    value: cat.amount,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Relatório de {period.month} {period.year}
          </CardTitle>
          <CardDescription>Resumo completo das suas finanças no período</CardDescription>
        </CardHeader>
      </Card>

      {/* Relatório Estruturado */}
      {(diagnostico || principal_risco || principal_oportunidade || decisao_recomendada) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório Estruturado
            </CardTitle>
            <CardDescription>Diagnóstico e recomendações com base nos dados do período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostico && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Diagnóstico</p>
                <p className="text-sm leading-relaxed">{diagnostico}</p>
              </div>
            )}
            {principal_risco && (
              <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">Principal risco</p>
                  <p className="text-sm leading-relaxed">{principal_risco}</p>
                </div>
              </div>
            )}
            {principal_oportunidade && (
              <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <Lightbulb className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">Principal oportunidade</p>
                  <p className="text-sm leading-relaxed">{principal_oportunidade}</p>
                </div>
              </div>
            )}
            {decisao_recomendada && (
              <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Decisão recomendada</p>
                  <p className="text-sm leading-relaxed font-medium">{decisao_recomendada}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benchmarking comparativo */}
      {benchmarking_comparativo && benchmarking_comparativo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Benchmarking comparativo
            </CardTitle>
            <CardDescription>Seus indicadores frente a referências de mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Métrica</th>
                    <th className="text-right py-2 font-medium">Seu valor</th>
                    <th className="text-right py-2 font-medium">Referência</th>
                    <th className="text-center py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarking_comparativo.map((b, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{b.metrica}</td>
                      <td className="text-right tabular-nums font-medium">{b.seuValor}</td>
                      <td className="text-right text-muted-foreground">{b.referencia}</td>
                      <td className="text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.status === "acima" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                          b.status === "no_alvo" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" :
                          "bg-destructive/20 text-destructive"
                        }`}>
                          {b.status === "acima" ? "Acima" : b.status === "no_alvo" ? "No alvo" : "Abaixo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total recebido no mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total gasto no mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.cashFlow >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatCurrency(summary.cashFlow)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.cashFlow >= 0 ? "Superávit" : "Déficit"} no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Poupança</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.savingsRate >= 20 ? "text-success" : summary.savingsRate > 0 ? "text-warning" : "text-destructive"}`}
            >
              {summary.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.savingsRate >= 20
                ? "Excelente!"
                : summary.savingsRate > 0
                  ? "Razoável"
                  : "Atenção"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categorias */}
      {topCategories.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Categorias de Despesa</CardTitle>
              <CardDescription>Maiores gastos do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCategories.map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium">{cat.category}</p>
                        <p className="text-xs text-muted-foreground">{cat.count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(cat.amount)}</p>
                      <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Despesas</CardTitle>
              <CardDescription>Percentual por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--secondary))"
                    dataKey="value"
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análise Inteligente</CardTitle>
            <CardDescription>Insights sobre suas finanças no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patrimônio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Patrimônio Líquido</CardTitle>
            <CardDescription>Posição atual dos seus ativos</CardDescription>
          </div>
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(summary.netWorth)}</div>
          <p className="text-sm text-muted-foreground mt-2">
            Total de ativos em contas e investimentos
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
