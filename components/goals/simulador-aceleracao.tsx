"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Rocket, Zap } from "lucide-react"
import { simularAceleracao } from "@/lib/goals-analytics"

interface GoalOption {
  id: string
  name: string
  monthlyTarget: number
  remaining: number
}

interface SimuladorAceleracaoProps {
  goals: GoalOption[]
}

export function SimuladorAceleracao({ goals }: SimuladorAceleracaoProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [aporteExtra, setAporteExtra] = useState<string>("")
  const [resultado, setResultado] = useState<{
    mesesParaConcluir: number
    mesesAntes: number
    novoAporteMensal: number
  } | null>(null)

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)
  const ativosComRestante = goals.filter((g) => g.remaining > 0)

  const handleSimular = () => {
    if (!selectedGoal) return
    const extra = parseFloat(aporteExtra.replace(",", ".")) || 0
    const sim = simularAceleracao(
      selectedGoal.monthlyTarget,
      selectedGoal.remaining,
      extra
    )
    setResultado(sim)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Simulador de aceleração
        </CardTitle>
        <CardDescription>
          Simule um aporte extra mensal e veja em quantos meses você conclui a meta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Meta</Label>
          <Select value={selectedGoalId} onValueChange={(v) => { setSelectedGoalId(v); setResultado(null) }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma meta" />
            </SelectTrigger>
            <SelectContent>
              {ativosComRestante.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} — {formatCurrency(g.monthlyTarget)}/mês
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedGoal && (
          <>
            <div className="space-y-2">
              <Label>Aporte extra por mês (R$)</Label>
              <Input
                type="number"
                min="0"
                step="50"
                placeholder="0"
                value={aporteExtra}
                onChange={(e) => { setAporteExtra(e.target.value); setResultado(null) }}
              />
            </div>
            <Button onClick={handleSimular} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Simular
            </Button>
            {resultado != null && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">
                  Novo aporte mensal: {formatCurrency(resultado.novoAporteMensal)}
                </p>
                <p className="text-sm">
                  Você conclui em <strong>{resultado.mesesParaConcluir} meses</strong>
                  {resultado.mesesAntes > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {" "}({resultado.mesesAntes} meses antes)
                    </span>
                  )}
                  .
                </p>
              </div>
            )}
          </>
        )}
        {ativosComRestante.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma meta ativa com saldo restante para simular.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
