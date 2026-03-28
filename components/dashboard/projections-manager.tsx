"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Edit3,
  Check,
  X,
  RefreshCw,
} from "lucide-react"
import {
  useFinancialProjections,
  isFieldManual,
  getFieldValue,
} from "@/hooks/use-financial-projections"
import { formatCurrency, formatPercent } from "@/lib/utils"

export function ProjectionsManager() {
  const {
    projections,
    currentProjection,
    loading,
    updateField,
    recalculateAll,
    generateProjections,
  } = useFinancialProjections()

  const [editingField, setEditingField] = useState<{
    month: number
    year: number
    field: "receita" | "despesas" | "percentualInvestimento"
  } | null>(null)
  const [tempValue, setTempValue] = useState("")

  const handleEdit = (
    month: number,
    year: number,
    field: "receita" | "despesas" | "percentualInvestimento"
  ) => {
    setEditingField({ month, year, field })
    const projection = projections.find((p) => p.month === month && p.year === year)
    if (projection) {
      setTempValue(getFieldValue(projection, field).toString())
    }
  }

  const handleSave = () => {
    if (!editingField) return

    const value = parseFloat(tempValue)
    if (isNaN(value)) return

    const isPercentual = editingField.field === "percentualInvestimento"
    const finalValue = isPercentual ? value / 100 : value

    updateField(
      editingField.month,
      editingField.year,
      editingField.field,
      finalValue,
      true // marcar como manual
    )

    setEditingField(null)
    setTempValue("")
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValue("")
  }

  const handleAutoFill = (
    month: number,
    year: number,
    field: "receita" | "despesas" | "percentualInvestimento"
  ) => {
    updateField(month, year, field, 0, false) // marcar como automático
  }

  const getManualBadge = (isManual: boolean) => (
    <Badge className={isManual ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
      {isManual ? "📝 Manual" : "🤖 Auto"}
    </Badge>
  )

  const renderEditableField = (
    projection: any,
    field: "receita" | "despesas" | "percentualInvestimento",
    label: string,
    icon: React.ReactNode,
    color: string
  ) => {
    const isEditing =
      editingField?.month === projection.month &&
      editingField?.year === projection.year &&
      editingField?.field === field
    const isManual = isFieldManual(projection, field)
    const value = getFieldValue(projection, field)

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            {icon}
            {label}
          </Label>
          <div className="flex items-center gap-2">
            {getManualBadge(isManual)}
            {isManual && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAutoFill(projection.month, projection.year, field)}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              type={field === "percentualInvestimento" ? "number" : "number"}
              step={field === "percentualInvestimento" ? "0.1" : "0.01"}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className={`p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors ${color}`}
            onClick={() => handleEdit(projection.month, projection.year, field)}
          >
            <div className="font-semibold">
              {field === "percentualInvestimento" ? formatPercent(value) : formatCurrency(value)}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* CONTROLES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projeções Financeiras
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={recalculateAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalcular Tudo
              </Button>
              <Button size="sm" onClick={() => generateProjections(1, 2028, 12)}>
                Gerar 12 Meses
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* PROJEÇÕES */}
      <div className="grid gap-4">
        {projections.slice(0, 6).map((projection) => (
          <Card
            key={`${projection.month}-${projection.year}`}
            className="border-l-4 border-l-blue-500"
          >
            <CardHeader>
              <CardTitle className="text-base">
                {projection.month.toString().padStart(2, "0")}/{projection.year}
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    className={
                      projection.savingsRate >= 0.2
                        ? "bg-green-100 text-green-800"
                        : projection.savingsRate >= 0.05
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    Taxa: {formatPercent(projection.savingsRate)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Resultado: {formatCurrency(projection.resultado)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {renderEditableField(
                  projection,
                  "receita",
                  "Receita",
                  <TrendingUp className="h-4 w-4 text-green-600" />,
                  "border-green-200 bg-green-50"
                )}

                {renderEditableField(
                  projection,
                  "despesas",
                  "Despesas",
                  <TrendingDown className="h-4 w-4 text-red-600" />,
                  "border-red-200 bg-red-50"
                )}

                {renderEditableField(
                  projection,
                  "percentualInvestimento",
                  "% Investimento",
                  <PiggyBank className="h-4 w-4 text-blue-600" />,
                  "border-blue-200 bg-blue-50"
                )}
              </div>

              {/* BARRA DE PROGRESSO */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso Financeiro</span>
                  <span>{formatPercent(projection.savingsRate)}</span>
                </div>
                <Progress value={Math.max(0, projection.savingsRate * 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RESUMO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Receitas</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(projections.reduce((sum, p) => sum + p.receita.value, 0))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Despesas</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(
                  projections.reduce((sum, p) => sum + Math.abs(p.despesas.value), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Investido</p>
              <p className="font-semibold text-blue-600">
                {formatCurrency(projections.reduce((sum, p) => sum + p.investimento, 0))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Resultado Acumulado</p>
              <p
                className={`font-semibold ${projections.reduce((sum, p) => sum + p.resultado, 0) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(projections.reduce((sum, p) => sum + p.resultado, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
