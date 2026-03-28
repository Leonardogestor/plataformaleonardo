"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRightLeft, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Target
} from "lucide-react"
import { Investment } from "@/services/portfolioAnalytics"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface ManualRebalancingProps {
  investments: Investment[]
  className?: string
}

interface AllocationItem {
  id: string
  name: string
  type: string
  currentValue: number
  currentPercentage: number
  targetPercentage: number
  newValue: number
  newPercentage: number
  difference: number
}

export function ManualRebalancingSimple({ investments, className }: ManualRebalancingProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [isRebalancing, setIsRebalancing] = useState(false)
  const [showImpact, setShowImpact] = useState(false)

  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0)

  // Inicializar alocações
  useEffect(() => {
    if (investments.length === 0) return

    const targetAllocation = calculateTargetAllocation(investments)
    
    const newAllocations = investments.map(inv => {
      const currentPct = (inv.currentValue / totalValue) * 100
      const targetPct = targetAllocation[inv.type] || (100 / investments.length)
      
      return {
        id: inv.id,
        name: inv.name,
        type: inv.type,
        currentValue: inv.currentValue,
        currentPercentage: currentPct,
        targetPercentage: targetPct,
        newValue: inv.currentValue,
        newPercentage: currentPct,
        difference: 0
      }
    })

    setAllocations(newAllocations)
  }, [investments, totalValue])

  // Calcular alocação ideal por tipo
  function calculateTargetAllocation(investments: Investment[]) {
    const typeCount = new Set(investments.map(inv => inv.type)).size
    const equalDistribution = 100 / typeCount
    
    const allocation: Record<string, number> = {}
    
    // Regras simples de alocação ideal
    const idealAllocation: Record<string, number> = {
      'FIXED_INCOME': 35,
      'BONDS': 15,
      'REAL_ESTATE': 10,
      'FUNDS': 15,
      'STOCKS': 20,
      'CRYPTO': 5,
      'OTHER': 0
    }

    investments.forEach(inv => {
      allocation[inv.type] = idealAllocation[inv.type] || equalDistribution
    })

    return allocation
  }

  // Atualizar alocação via input
  const updateAllocation = (id: string, newPercentage: number) => {
    setAllocations(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const newValue = (newPercentage / 100) * totalValue
          return {
            ...item,
            newPercentage,
            newValue,
            difference: newValue - item.currentValue
          }
        }
        return item
      })

      // Normalizar para somar 100%
      const totalPercentage = updated.reduce((sum, item) => sum + item.newPercentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.1) {
        const factor = 100 / totalPercentage
        return updated.map(item => ({
          ...item,
          newPercentage: item.newPercentage * factor,
          newValue: (item.newPercentage * factor / 100) * totalValue,
          difference: (item.newPercentage * factor / 100) * totalValue - item.currentValue
        }))
      }

      return updated
    })
  }

  // Calcular impacto do rebalanceamento
  const calculateImpact = () => {
    const totalDifference = allocations.reduce((sum, item) => sum + Math.abs(item.difference), 0)
    const needsRebalancing = allocations.some(item => Math.abs(item.difference) > totalValue * 0.01) // 1%
    
    return {
      totalDifference,
      needsRebalancing,
      affectedAssets: allocations.filter(item => Math.abs(item.difference) > totalValue * 0.01).length,
      maxMovement: Math.max(...allocations.map(item => Math.abs(item.difference)))
    }
  }

  // Executar rebalanceamento
  const handleRebalance = async () => {
    setIsRebalancing(true)
    try {
      // Simulação - em um ambiente real, aqui faria a chamada API
      await new Promise(resolve => setTimeout(resolve, 2000))
      setShowImpact(true)
    } catch (error) {
      console.error('Erro no rebalanceamento:', error)
    } finally {
      setIsRebalancing(false)
    }
  }

  // Reset para valores atuais
  const handleReset = () => {
    setAllocations(prev => prev.map(item => ({
      ...item,
      newPercentage: item.currentPercentage,
      newValue: item.currentValue,
      difference: 0
    })))
    setShowImpact(false)
  }

  const impact = calculateImpact()
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'STOCKS': 'text-blue-600',
      'BONDS': 'text-green-600',
      'REAL_ESTATE': 'text-purple-600',
      'FIXED_INCOME': 'text-emerald-600',
      'CRYPTO': 'text-orange-600',
      'FUNDS': 'text-indigo-600',
      'OTHER': 'text-gray-600'
    }
    return colors[type] || 'text-gray-600'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'STOCKS': 'Ações',
      'BONDS': 'Títulos',
      'REAL_ESTATE': 'Imóveis',
      'FIXED_INCOME': 'Renda Fixa',
      'CRYPTO': 'Cripto',
      'FUNDS': 'Fundos',
      'OTHER': 'Outros'
    }
    return labels[type] || type
  }

  if (allocations.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Nenhum investimento para realocar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          Realocamento Manual
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ajuste manualmente a alocação do seu portfólio
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo do Impacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {impact.affectedAssets}
            </div>
            <div className="text-xs text-muted-foreground">Ativos Afetados</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(impact.totalDifference)}
            </div>
            <div className="text-xs text-muted-foreground">Total Movimentado</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {formatCurrency(impact.maxMovement)}
            </div>
            <div className="text-xs text-muted-foreground">Maior Movimento</div>
          </div>
          <div className="text-center">
            <Badge className={impact.needsRebalancing ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
              {impact.needsRebalancing ? "Pendente" : "Balanceado"}
            </Badge>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Resetar
          </Button>
          <Button 
            onClick={handleRebalance}
            disabled={!impact.needsRebalancing || isRebalancing}
            size="sm"
          >
            {isRebalancing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Realocando...
              </>
            ) : (
              <>
                <Target className="h-3 w-3 mr-1" />
                Realocar Agora
              </>
            )}
          </Button>
        </div>

        {/* Inputs de Alocação */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Ajustar Alocação (%)
          </h4>
          
          {allocations.map((allocation) => (
            <div key={allocation.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{allocation.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(allocation.type)}
                    </Badge>
                    <span className={cn("text-xs", getTypeColor(allocation.type))}>
                      {getTypeLabel(allocation.type)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-medium">
                    {allocation.newPercentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(allocation.newValue)}
                  </div>
                </div>
              </div>

              {/* Input numérico simples */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground w-20">
                    Nova %:
                  </label>
                  <input
                    type="number"
                    value={allocation.newPercentage}
                    onChange={(e) => updateAllocation(allocation.id, parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={0.1}
                    className="flex-1 px-3 py-2 text-sm border rounded"
                  />
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {formatCurrency(allocation.newValue)}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Atual: {allocation.currentPercentage.toFixed(1)}%</span>
                  <span>Alvo: {allocation.targetPercentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Diferença */}
              {Math.abs(allocation.difference) > totalValue * 0.01 && (
                <div className={cn(
                  "flex items-center justify-between p-2 rounded text-xs",
                  allocation.difference > 0 
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}>
                  <span>
                    {allocation.difference > 0 ? "Aumentar" : "Reduzir"}
                  </span>
                  <span className="font-medium">
                    {allocation.difference > 0 ? "+" : ""}
                    {formatCurrency(allocation.difference)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feedback de Sucesso */}
        {showImpact && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Realocação Concluída!</span>
            </div>
            <p className="text-sm text-green-700 mt-2">
              Seu portfólio foi realocado com sucesso. As novas alocações já estão em vigor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
