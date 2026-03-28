"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Play,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"
import {
  SimulationResult,
  SimulationInputs,
  simulatePortfolioFuture,
} from "@/services/portfolioSimulation"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface PortfolioSimulationProps {
  currentAmount: number
  onSimulate: (inputs: SimulationInputs) => Promise<SimulationResult>
  className?: string
}

export function PortfolioSimulation({
  currentAmount,
  onSimulate,
  className,
}: PortfolioSimulationProps) {
  const [inputs, setInputs] = useState<SimulationInputs>({
    monthlyContribution: 500,
    expectedReturn: 12,
    timeHorizon: 10,
    volatility: 15,
  })

  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const handleSimulate = async () => {
    setIsSimulating(true)
    try {
      const result = simulatePortfolioFuture(currentAmount, inputs)
      setSimulation(result)
    } catch (error) {
      console.error("Erro na simulação:", error)
    } finally {
      setIsSimulating(false)
    }
  }

  const getScenarioColor = (type: "base" | "optimistic" | "pessimistic") => {
    switch (type) {
      case "optimistic":
        return "text-green-600 bg-green-50 border-green-200"
      case "pessimistic":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-blue-600 bg-blue-50 border-blue-200"
    }
  }

  const getScenarioIcon = (type: "base" | "optimistic" | "pessimistic") => {
    switch (type) {
      case "optimistic":
        return <ArrowUpRight className="h-4 w-4" />
      case "pessimistic":
        return <ArrowDownRight className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-purple-500" />
          Simulação de Futuro
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Projete a evolução do seu patrimônio em diferentes cenários
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-contribution" className="text-sm">
              Aporte Mensal
            </Label>
            <Input
              id="monthly-contribution"
              type="number"
              value={inputs.monthlyContribution}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  monthlyContribution: parseFloat(e.target.value) || 0,
                }))
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-return" className="text-sm">
              Retorno Esperado (%)
            </Label>
            <Input
              id="expected-return"
              type="number"
              step="0.1"
              value={inputs.expectedReturn}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  expectedReturn: parseFloat(e.target.value) || 0,
                }))
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-horizon" className="text-sm">
              Prazo (anos)
            </Label>
            <Input
              id="time-horizon"
              type="number"
              value={inputs.timeHorizon}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  timeHorizon: parseInt(e.target.value) || 1,
                }))
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="volatility" className="text-sm">
              Volatilidade (%)
            </Label>
            <Input
              id="volatility"
              type="number"
              step="0.1"
              value={inputs.volatility}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  volatility: parseFloat(e.target.value) || 0,
                }))
              }
              className="text-sm"
            />
          </div>
        </div>

        <Button onClick={handleSimulate} disabled={isSimulating} className="w-full">
          {isSimulating ? (
            <>
              <Calculator className="h-4 w-4 mr-2 animate-spin" />
              Simulando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Simular Cenários
            </>
          )}
        </Button>

        {/* Resultados */}
        {simulation && (
          <div className="space-y-4">
            {/* Resumo dos Cenários */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(simulation).map(([key, scenario]) => {
                if (key === "inputs") return null
                const scenarioType = key as "base" | "optimistic" | "pessimistic"

                return (
                  <div
                    key={key}
                    className={cn(
                      "p-4 border rounded-lg space-y-3",
                      getScenarioColor(scenarioType)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getScenarioIcon(scenarioType)}
                      <h4 className="font-medium text-sm">{scenario.name}</h4>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Valor Final</div>
                        <div className="text-lg font-bold">
                          {formatCurrency(scenario.finalValue)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total Aportes</div>
                          <div className="font-medium">
                            {formatCurrency(scenario.totalContributions)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Ganhos</div>
                          <div
                            className={cn(
                              "font-medium",
                              scenario.totalGains >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {scenario.totalGains >= 0 ? "+" : ""}
                            {formatCurrency(scenario.totalGains)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-current/20">
                        <div className="flex items-center justify-between text-xs">
                          <span>Retorno Anual</span>
                          <Badge variant="outline" className="text-xs">
                            {scenario.returnRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Análise Comparativa */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Análise dos Cenários</h4>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Potencial de Ganhos:</span>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(simulation.optimistic.totalGains)}
                    </div>
                    <div className="text-xs text-muted-foreground">cenário otimista</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risco de Perdas:</span>
                  <div className="text-right">
                    <div
                      className={cn(
                        "font-medium",
                        simulation.pessimistic.totalGains < 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {simulation.pessimistic.totalGains < 0 ? "-" : "+"}
                      {formatCurrency(Math.abs(simulation.pessimistic.totalGains))}
                    </div>
                    <div className="text-xs text-muted-foreground">cenário pessimista</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Range Projetado:</span>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(simulation.pessimistic.finalValue)} -{" "}
                      {formatCurrency(simulation.optimistic.finalValue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      amplitude de{" "}
                      {formatNumber(
                        (simulation.optimistic.finalValue / simulation.pessimistic.finalValue - 1) *
                          100
                      )}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recomendações Baseadas na Simulação */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-blue-800">Insights da Simulação</h4>
              <div className="space-y-2 text-xs text-blue-700">
                {simulation.optimistic.totalGains > simulation.base.totalGains * 1.5 && (
                  <div>• Cenário otimista mostra potencial de ganhos 50% acima do cenário base</div>
                )}
                {simulation.pessimistic.totalGains < 0 && (
                  <div>
                    • Cenário pessimista indica possibilidade de perdas. Considere reduzir risco.
                  </div>
                )}
                {inputs.expectedReturn > 15 && (
                  <div>
                    • Retorno esperado acima de 15% ao ano é ambicioso. Considere cenários mais
                    conservadores.
                  </div>
                )}
                {inputs.monthlyContribution > 1000 && (
                  <div>
                    • Aportes mensais elevados aceleram significativamente o crescimento do
                    patrimônio.
                  </div>
                )}
                <div>
                  • Com aportes de {formatCurrency(inputs.monthlyContribution)}/mês por{" "}
                  {inputs.timeHorizon} anos, seu patrimônio pode variar entre{" "}
                  {formatCurrency(simulation.pessimistic.finalValue)}e{" "}
                  {formatCurrency(simulation.optimistic.finalValue)}.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
