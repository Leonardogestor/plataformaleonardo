"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Download, Edit } from "lucide-react"
import { useFinancialData } from "@/hooks/use-financial-data-react-query"
import { useDashboard } from "@/contexts/dashboard-context"
import { TransactionEditDialog } from "@/components/transactions/transaction-edit-dialog"

export function FinancialTabs() {
  const { month, year } = useDashboard()
  const { transactions, calculations, previousCalculations, isLoading, refetch } =
    useFinancialData()
  const [statusFilter, setStatusFilter] = useState<"all" | "green" | "yellow" | "red">("all")
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = () => {
    return `${String(month).padStart(2, "0")}/${year}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "red":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "green":
        return <Badge className="bg-green-100 text-green-800">🟢 Saudável</Badge>
      case "yellow":
        return <Badge className="bg-yellow-100 text-yellow-800">🟡 Atenção</Badge>
      case "red":
        return <Badge className="bg-red-100 text-red-800">🔴 Prejudicial</Badge>
      default:
        return <Badge variant="secondary">Sem classificação</Badge>
    }
  }

  const getConsumptionColor = (spent: number, budget: number) => {
    if (budget <= 0) return "border-gray-200 bg-gray-50"
    const percentage = (spent / budget) * 100
    if (percentage <= 70) return "border-green-200 bg-green-50"
    if (percentage <= 90) return "border-yellow-200 bg-yellow-50"
    return "border-red-200 bg-red-50"
  }

  const getConsumptionBadge = (spent: number, budget: number) => {
    if (budget <= 0) return null
    const percentage = (spent / budget) * 100
    if (percentage <= 70)
      return <Badge className="bg-green-100 text-green-800">🟢 {percentage.toFixed(0)}%</Badge>
    if (percentage <= 90)
      return <Badge className="bg-yellow-100 text-yellow-800">🟡 {percentage.toFixed(0)}%</Badge>
    return <Badge className="bg-red-100 text-red-800">🔴 {percentage.toFixed(0)}%</Badge>
  }

  const getGrowthBadge = (current: number, previous: number) => {
    if (previous === 0) return null
    const growth = ((current - previous) / Math.abs(previous)) * 100
    const color = growth >= 0 ? "text-green-600" : "text-red-600"
    const icon = growth >= 0 ? "↗️" : "↘️"
    return (
      <Badge className={`bg-gray-100 ${color} text-xs`}>
        {icon} {growth.toFixed(1)}%
      </Badge>
    )
  }

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction)
    setIsEditDialogOpen(true)
  }

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `financial-report-${month}-${year}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting PDF:", error)
    }
  }

  const handleSaveTransaction = async (updatedTransaction: any) => {
    setIsEditDialogOpen(false)
    setEditingTransaction(null)
    refetch()
  }

  const filteredTransactions =
    transactions?.filter((t: any) => statusFilter === "all" || t.status === statusFilter) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!transactions) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Dados não disponíveis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com período */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dados referentes a: {formatDate()}</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="green">🟢 Saudáveis</SelectItem>
              <SelectItem value="yellow">🟡 Atenção</SelectItem>
              <SelectItem value="red">🔴 Prejudiciais</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="receitas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="receitas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Receitas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="investimentos" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Aplicação/Resgate
          </TabsTrigger>
          <TabsTrigger value="resultado" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Resultado
          </TabsTrigger>
        </TabsList>

        {/* RECEITAS */}
        <TabsContent value="receitas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🟢 Receitas do Mês</span>
                <div className="flex items-center gap-2">
                  {getGrowthBadge(calculations?.receitas || 0, previousCalculations?.receitas || 0)}
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculations?.receitas || 0)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions
                  .filter((t: any) => t.amount > 0 && t.type !== "investment_withdraw")
                  .map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(transaction.status)}
                        <span className="font-semibold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESPESAS */}
        <TabsContent value="despesas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🔴 Despesas do Mês</span>
                <div className="flex items-center gap-2">
                  {getGrowthBadge(calculations?.despesas || 0, previousCalculations?.despesas || 0)}
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(calculations?.despesas || 0)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions
                  .filter((t: any) => t.amount < 0 && t.type !== "investment")
                  .map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-3 border rounded ${getConsumptionColor(Math.abs(transaction.amount), transaction.budget || 0)}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(transaction.status)}
                        {getConsumptionBadge(Math.abs(transaction.amount), transaction.budget || 0)}
                        <span className="font-semibold text-red-600">
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVESTIMENTOS */}
        <TabsContent value="investimentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🔵 Aplicação/Resgate</span>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleExportPDF}
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <span
                    className={`text-2xl font-bold ${(calculations?.investimentos ?? 0) >= 0 ? "text-blue-600" : "text-red-600"}`}
                  >
                    {formatCurrency(calculations?.investimentos || 0)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions
                  .filter((t: any) => t.type === "investment" || t.type === "investment_withdraw")
                  .map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={transaction.type === "investment" ? "destructive" : "default"}
                        >
                          {transaction.type === "investment" ? "Aplicação" : "Resgate"}
                        </Badge>
                        <span
                          className={`font-semibold ${transaction.type === "investment" ? "text-red-600" : "text-blue-600"}`}
                        >
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESULTADO */}
        <TabsContent value="resultado" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resultado do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Receitas:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(calculations?.receitas || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despesas:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(calculations?.despesas || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Investimentos:</span>
                    <span
                      className={`font-semibold ${(calculations?.investimentos ?? 0) >= 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {formatCurrency(calculations?.investimentos || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Resultado:</span>
                      <span
                        className={
                          (calculations?.resultado || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatCurrency(calculations?.resultado || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saldo Acumulado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Saldo mês anterior:</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resultado do mês:</span>
                    <span
                      className={
                        (calculations?.resultado || 0) >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatCurrency(calculations?.resultado || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Saldo final:</span>
                      <span
                        className={
                          (calculations?.resultado || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatCurrency(calculations?.resultado || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transaction Edit Dialog */}
        <TransactionEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />
      </Tabs>
    </div>
  )
}
