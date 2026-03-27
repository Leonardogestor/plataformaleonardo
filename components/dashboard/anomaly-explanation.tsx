"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AnomalyExplanationProps {
  originalValue: number
  overrideValue: number
  fieldName: string
  onKeepValue: () => void
  onRevertValue: () => void
}

export function AnomalyExplanation({ 
  originalValue, 
  overrideValue, 
  fieldName, 
  onKeepValue, 
  onRevertValue 
}: AnomalyExplanationProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getAnomalyReason = (original: number, override: number) => {
    const ratio = Math.abs(override / original)
    
    if (ratio > 10) return "muito diferente do seu padrão habitual"
    if (ratio > 5) return "significativamente diferente do normal"
    return "fora do seu padrão usual"
  }

  const anomalyReason = getAnomalyReason(originalValue, overrideValue)

  return (
    <Alert className="border-orange-200 bg-orange-50/50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        Este valor parece {anomalyReason}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Original:</span>
            <span className="font-medium ml-1">{formatCurrency(originalValue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Alterado para:</span>
            <span className="font-medium ml-1 text-orange-600">{formatCurrency(overrideValue)}</span>
          </div>
        </div>
        
        <p className="text-sm text-orange-700">
          Valores muito diferentes do seu padrão podem afetar a precisão das suas análises financeiras.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onKeepValue}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Manter este valor
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              onRevertValue()
              setDismissed(true)
            }}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reverter para anterior
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="text-orange-600 hover:bg-orange-100"
          >
            Ignorar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
