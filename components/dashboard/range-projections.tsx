"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  Calendar,
  DollarSign,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RangeProjectionsProps {
  financialIndependenceAge: number
  projectedWealth: number
  requiredWealth: number
  confidenceLevel: "high" | "medium" | "low"
  confidenceAdjusted: boolean
}

export function RangeProjections({ 
  financialIndependenceAge, 
  projectedWealth, 
  requiredWealth,
  confidenceLevel,
  confidenceAdjusted 
}: RangeProjectionsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Calculate range based on confidence
  const getAgeRange = (baseAge: number, confidence: string) => {
    if (confidence === "high") return { min: baseAge, max: baseAge + 2 }
    if (confidence === "medium") return { min: baseAge - 1, max: baseAge + 4 }
    return { min: baseAge - 2, max: baseAge + 6 }
  }

  const getWealthRange = (baseWealth: number, confidence: string) => {
    if (confidence === "high") return { min: baseWealth * 0.9, max: baseWealth * 1.1 }
    if (confidence === "medium") return { min: baseWealth * 0.8, max: baseWealth * 1.2 }
    return { min: baseWealth * 0.7, max: baseWealth * 1.3 }
  }

  const ageRange = getAgeRange(financialIndependenceAge, confidenceLevel)
  const wealthRange = getWealthRange(projectedWealth, confidenceLevel)

  const getRangeColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "text-green-600"
      case "medium": return "text-yellow-600"
      case "low": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Idade de Aposentadoria Estimada
            {confidenceAdjusted && (
              <Badge variant="outline" className="text-xs">
                Ajustado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Baseado no seu padrão atual de poupança e investimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold">
                Entre {ageRange.min} e {ageRange.max} anos
              </div>
              <p className="text-sm text-muted-foreground">
                Estimativa principal: {financialIndependenceAge} anos
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 bg-muted rounded-full w-32 relative">
                <div 
                  className={cn(
                    "h-2 rounded-full absolute",
                    getRangeColor(confidenceLevel)
                  )}
                  style={{
                    left: `${((ageRange.min - 45) / 25) * 100}%`,
                    width: `${((ageRange.max - ageRange.min) / 25) * 100}%`
                  }}
                />
                <div 
                  className="h-3 w-3 bg-primary rounded-full absolute -top-0.5"
                  style={{
                    left: `${((financialIndependenceAge - 45) / 25) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              {confidenceLevel === "high" && "Precisão alta: variação de 2 anos"}
              {confidenceLevel === "medium" && "Precisão média: variação de 5 anos"}
              {confidenceLevel === "low" && "Precisão baixa: variação de 8 anos"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Patrimônio Projetado
            {confidenceAdjusted && (
              <Badge variant="outline" className="text-xs">
                Ajustado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Valor estimado na idade de aposentadoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(wealthRange.min)} - {formatCurrency(wealthRange.max)}
              </div>
              <p className="text-sm text-muted-foreground">
                Estimativa principal: {formatCurrency(projectedWealth)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-muted-foreground">Mínimo</p>
                <p className="font-medium">{formatCurrency(wealthRange.min)}</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-muted-foreground">Máximo</p>
                <p className="font-medium">{formatCurrency(wealthRange.max)}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Meta para independência: {formatCurrency(requiredWealth)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
