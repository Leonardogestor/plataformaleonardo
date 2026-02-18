"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, Award, AlertTriangle, Target, FileText, Lightbulb, CheckCircle2, BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"

interface AnnualReportViewProps {
  data: {
    period: { year: number }
    summary: {
      totalIncome: number
      totalExpense: number
      averageMonthlyIncome: number
      averageMonthlyExpense: number
      totalCashFlow: number
      annualSavingsRate: number
      netWorthGrowth: number
      netWorthGrowthPercentage: number
    }
    monthlyComparison: Array<{
      month: string
      income: number
      expense: number
      cashFlow: number
      savingsRate: number
    }>
    topCategories: Array<{ category: string; amount: number; percentage: number }>
    bestMonth: { month: string; cashFlow: number }
    worstMonth: { month: string; cashFlow: number }
    goalsProgress: Array<{
      name: string
      targetAmount: number
      currentAmount: number
      progress: number
      status: string
    }>
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

export function AnnualReportView({ data }: AnnualReportViewProps) {
  const {
    period,
    summary,
    monthlyComparison,
    topCategories,
    bestMonth,
    worstMonth,
    goalsProgress,
    diagnostico,
    principal_risco,
    principal_oportunidade,
    decisao_recomendada,
    benchmarking_comparativo,
  } = data

  const monthlyChartData = monthlyComparison.map((m) => ({
    month: m.month,
    Receitas: m.income,
    Despesas: m.expense,
  }))

  const cashFlowChartData = monthlyComparison.map((m) => ({
    month: m.month,
    "Fluxo de Caixa": m.cashFlow,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Relatório Anual {period.year}</CardTitle>
          <CardDescription>Visão completa do ano financeiro</CardDescription>
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
            <CardDescription>Diagnóstico e recomendações com base no ano</CardDescription>
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

      {/* Métricas Anuais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média: {formatCurrency(summary.averageMonthlyIncome)}/mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média: {formatCurrency(summary.averageMonthlyExpense)}/mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo Anual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.totalCashFlow >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatCurrency(summary.totalCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de poupança: {summary.annualSavingsRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.netWorthGrowth >= 0 ? "text-success" : "text-destructive"}`}
            >
              {summary.netWorthGrowthPercentage >= 0 ? "+" : ""}
              {summary.netWorthGrowthPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.netWorthGrowth)} no ano
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Receitas vs Despesas ao longo do ano</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" stroke="currentColor" />
              <YAxis
                className="text-xs"
                stroke="currentColor"
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Fluxo de Caixa Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Mensal</CardTitle>
          <CardDescription>Tendência de superávit/déficit ao longo do ano</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cashFlowChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" stroke="currentColor" />
              <YAxis
                className="text-xs"
                stroke="currentColor"
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Line
                type="monotone"
                dataKey="Fluxo de Caixa"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Melhor e Pior Mês */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Mês</CardTitle>
            <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {bestMonth.month}
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Fluxo de caixa: {formatCurrency(bestMonth.cashFlow)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pior Mês</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {worstMonth.month}
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Fluxo de caixa: {formatCurrency(worstMonth.cashFlow)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categorias do Ano */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Categorias do Ano</CardTitle>
            <CardDescription>Maiores despesas acumuladas em {period.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.percentage.toFixed(1)}% do total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(cat.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progresso de Metas */}
      {goalsProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso de Metas em {period.year}</CardTitle>
            <CardDescription>Avanço das suas metas financeiras no ano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goalsProgress.map((goal) => (
                <div key={goal.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${goal.progress >= 100 ? "bg-green-500" : goal.progress >= 50 ? "bg-blue-500" : "bg-yellow-500"}`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.progress.toFixed(1)}% concluído</span>
                    <span className="capitalize">{goal.status.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
