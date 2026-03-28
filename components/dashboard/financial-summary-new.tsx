"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useFinancialDataSafe } from "@/hooks/use-financial-data-safe"
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Calculator,
  Briefcase,
  Upload,
  FileText,
} from "lucide-react"
import { DocumentUpload } from "@/components/documents/document-upload"
import { useState } from "react"

export function FinancialSummaryNew() {
  const { calculations, previousCalculations, finalBalance, previousBalance, isLoading } =
    useFinancialDataSafe()
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false)

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
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

  // Calculate growth percentage
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / Math.abs(previous)) * 100
  }

  const receitasGrowth = previousCalculations
    ? calculateGrowth(calculations.receitas, previousCalculations.receitas)
    : 0

  const despesasGrowth = previousCalculations
    ? calculateGrowth(Math.abs(calculations.despesas), Math.abs(previousCalculations.despesas))
    : 0

  // Handle investment document upload
  const handleInvestmentUpload = (document: any) => {
    console.log("Investment document uploaded:", document)
    // TODO: Process investment document - extract asset type, value, date, institution, profitability
    setInvestmentDialogOpen(false)
  }

  // Separate investments and withdrawals
  const investments = calculations.investimentos < 0 ? Math.abs(calculations.investimentos) : 0
  const withdrawals = calculations.investimentos > 0 ? calculations.investimentos : 0

  return (
    <div className="space-y-6">
      {/* 5 Main Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* 1. RECEITAS DO MÊS */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">RECEITAS</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(calculations.receitas)}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    receitasGrowth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }
                >
                  {receitasGrowth >= 0 ? "↗" : "↘"} {formatPercent(receitasGrowth / 100)}
                </Badge>
                <span className="text-xs text-muted-foreground">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. DESPESAS DO MÊS */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">DESPESAS</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(Math.abs(calculations.despesas))}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    despesasGrowth <= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }
                >
                  {despesasGrowth <= 0 ? "↗" : "↘"} {formatPercent(Math.abs(despesasGrowth) / 100)}
                </Badge>
                <span className="text-xs text-muted-foreground">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. APLICAÇÕES/RESGATES */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">APLICAÇÕES/RESGATES</p>
              <ArrowUpDown className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div
                className={`text-2xl font-bold ${
                  calculations.investimentos >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(calculations.investimentos))}
              </div>
              <div className="text-xs text-muted-foreground">
                {investments > 0 && `Aplicado: ${formatCurrency(investments)}`}
                {withdrawals > 0 && ` Resgatado: ${formatCurrency(withdrawals)}`}
                {investments === 0 && withdrawals === 0 && "Sem movimentação"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. RESULTADO DO MÊS */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">RESULTADO DO MÊS</p>
              <Calculator className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <div
                className={`text-2xl font-bold ${
                  calculations.resultado >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(calculations.resultado)}
              </div>
              <div className="text-xs text-muted-foreground">
                Saldo acumulado: {formatCurrency(finalBalance || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. INVESTIMENTOS */}
        <div className="space-y-2">
          <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">INVESTIMENTOS</p>
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Extrato de Investimentos</DialogTitle>
                <DialogDescription>
                  Envie seu extrato de investimentos em PDF ou Excel para análise automática. O
                  sistema irá classificar: Tipo de ativo, Valor investido, Data, Instituição e
                  Rentabilidade.
                </DialogDescription>
              </DialogHeader>
              <DocumentUpload onUpload={handleInvestmentUpload} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Detailed Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumo Financeiro Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Receitas do Mês</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Receita bruta:</span>
                  <span className="font-medium">{formatCurrency(calculations.receitas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Outras entradas:</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span>Total Receitas:</span>
                  <span className="text-green-600">{formatCurrency(calculations.receitas)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Despesas do Mês</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Saídas operacionais:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.abs(calculations.despesas))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Aplicações financeiras:</span>
                  <span className="font-medium">{formatCurrency(investments)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span>Total Despesas:</span>
                  <span className="text-red-600">
                    {formatCurrency(Math.abs(calculations.despesas) + investments)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Resultado do Mês</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Saldo mês anterior:</span>
                  <span className="font-medium">{formatCurrency(previousBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Resultado do mês:</span>
                  <span
                    className={`font-medium ${calculations.resultado >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(calculations.resultado)}
                  </span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold text-lg">
                  <span>Saldo acumulado:</span>
                  <span
                    className={
                      finalBalance && finalBalance >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatCurrency(finalBalance || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
