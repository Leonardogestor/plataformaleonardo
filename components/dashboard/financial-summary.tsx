"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFinancialData } from "@/hooks/use-financial-data-react-query"
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react"

export function FinancialSummary() {
  const { calculations, finalBalance, previousBalance, isLoading } = useFinancialData()

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

  if (isLoading || !calculations) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const getFarolBadge = (savingsRate: number) => {
    if (savingsRate >= 0.2) return <Badge className="bg-green-100 text-green-800">🟢 Saudável</Badge>
    if (savingsRate >= 0.05) return <Badge className="bg-yellow-100 text-yellow-800">🟡 Atenção</Badge>
    return <Badge className="bg-red-100 text-red-800">🔴 Crítico</Badge>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Receitas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">🟢 Receitas</p>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(calculations.receitas)}
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">🔴 Despesas</p>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(Math.abs(calculations.despesas))}
          </div>
        </CardContent>
      </Card>

      {/* Investimentos */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">🔵 Investimentos</p>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(calculations.investimentos)}
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">🟡 Resultado</p>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${
              calculations.resultado >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {formatCurrency(calculations.resultado)}
            </div>
            <div className="flex items-center gap-2">
              {getFarolBadge(calculations.savingsRate)}
              <span className="text-xs text-muted-foreground">
                {formatPercent(calculations.savingsRate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function BalanceSummary() {
  const { finalBalance, previousBalance, isLoading } = useFinancialData()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (isLoading || finalBalance === null) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-8 bg-muted rounded w-40"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo Acumulado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Saldo mês anterior:</span>
            <span className="font-semibold">{formatCurrency(previousBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span>Resultado do mês:</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(finalBalance - previousBalance)}
            </span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Saldo final:</span>
              <span className={finalBalance >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(finalBalance)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
