"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ChevronDown, 
  ChevronUp,
  Calculator,
  TrendingUp,
  PiggyBank,
  Calendar,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CalculationExplanationProps {
  incomeType: "monthly" | "avg6m"
  incomeValue: number
  savingsRate: number
  retirementAge: number
  expectedReturn: number
  inflationRate?: number
  currentAge?: number
}

export function CalculationExplanation({ 
  incomeType, 
  incomeValue, 
  savingsRate, 
  retirementAge, 
  expectedReturn,
  inflationRate = 0.04,
  currentAge = 30
}: CalculationExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  const monthlySavings = incomeValue * savingsRate
  const yearsToRetirement = retirementAge - currentAge
  const requiredWealth = (incomeValue * 12 * 0.8) / 0.04 // 4% rule
  const projectedWealth = calculateFutureValue(monthlySavings, expectedReturn, yearsToRetirement * 12)

  function calculateFutureValue(pmt: number, rate: number, periods: number): number {
    const monthlyRate = rate / 12
    if (monthlyRate === 0) return pmt * periods
    return pmt * ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Como foi calculado
            </CardTitle>
            <CardDescription>
              Entenda a matemática por trás das suas projeções financeiras
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver detalhes
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* INCOME USED */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Renda Utilizada
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Tipo de renda:</p>
                <p className="font-medium">
                  {incomeType === "monthly" ? "Renda mensal atual" : "Média dos últimos 6 meses"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Valor base:</p>
                <p className="font-medium">{formatCurrency(incomeValue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {incomeType === "avg6m" 
                ? "Usamos a média de 6 meses para suavizar variações e ter uma base mais estável."
                : "Usamos a renda mensal atual para projeções baseadas no seu fluxo atual."
              }
            </p>
          </div>

          {/* SAVINGS RATE */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Taxa de Poupança
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Taxa aplicada:</p>
                <p className="font-medium">{formatPercent(savingsRate)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Valor mensal:</p>
                <p className="font-medium">{formatCurrency(monthlySavings)}</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Fórmula:</p>
              <p className="text-xs text-blue-700 font-mono">
                Poupança Mensal = Renda × Taxa de Poupança
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {formatCurrency(monthlySavings)} = {formatCurrency(incomeValue)} × {formatPercent(savingsRate)}
              </p>
            </div>
          </div>

          {/* RETIREMENT CALCULATION */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cálculo de Aposentadoria
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Idade atual:</p>
                <p className="font-medium">{currentAge} anos</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Idade alvo:</p>
                <p className="font-medium">{retirementAge} anos</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Anos até aposentadoria:</p>
                <p className="font-medium">{yearsToRetirement} anos</p>
              </div>
            </div>
          </div>

          {/* WEALTH PROJECTION */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projeção de Patrimônio
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Retorno anual esperado:</p>
                <p className="font-medium">{formatPercent(expectedReturn)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Taxa de inflação:</p>
                <p className="font-medium">{formatPercent(inflationRate)}</p>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm font-medium text-green-800">Fórmula de Valor Futuro:</p>
              <p className="text-xs text-green-700 font-mono">
                VF = PMT × [((1 + r)^n - 1) / r]
              </p>
              <p className="text-xs text-green-700 mt-1">
                Onde:<br/>
                • PMT = Poupança mensal ({formatCurrency(monthlySavings)})<br/>
                • r = Taxa mensal ({formatPercent(expectedReturn / 12)})<br/>
                • n = Períodos ({yearsToRetirement * 12} meses)
              </p>
              <p className="text-xs text-green-700 mt-2 font-medium">
                Resultado: {formatCurrency(projectedWealth)}
              </p>
            </div>
          </div>

          {/* REQUIRED WEALTH */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Patrimônio Necessário
            </h4>
            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <p className="text-sm font-medium text-orange-800">Regra dos 4%:</p>
              <p className="text-xs text-orange-700">
                Para se aposentar, você precisa de um patrimônio que gere 4% ao ano,
                cobrindo 80% da sua renda atual.
              </p>
              <p className="text-xs text-orange-700 font-mono mt-2">
                Patrimônio Necessário = (Renda Anual × 0.8) / 0.04
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {formatCurrency(requiredWealth)} = ({formatCurrency(incomeValue * 12)} × 0.8) / 0.04
              </p>
            </div>
          </div>

          {/* ASSUMPTIONS */}
          <div className="p-4 bg-gray-50 rounded border">
            <h4 className="font-medium mb-3 text-sm">Premissas e Considerações:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Retornos são nominais (não ajustados pela inflação)</li>
              <li>• Taxa de poupança mantida constante ao longo do tempo</li>
              <li>• Não considera eventos extraordinários (heranças, perdas, etc.)</li>
              <li>• Projeções baseadas em padrão histórico de mercado</li>
              <li>• Inflação pode reduzir o poder de compra futuro</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
