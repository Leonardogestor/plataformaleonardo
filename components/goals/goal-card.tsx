"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Target, Calendar, TrendingUp, Pencil, Trash2, Plus } from "lucide-react"
import { GoalEvolutionChart } from "./goal-evolution-chart"

interface GoalCardProps {
  goal: {
    id: string
    name: string
    description?: string | null
    targetAmount: string
    currentAmount: string
    deadline: string
    category: string
    status: string
    progress: number
    daysRemaining: number
    monthlyTarget: number
    remaining: number
    evolution?: { month: string; cumulative: number }[]
  }
  onEdit: (goal: any) => void
  onDelete: (id: string) => void
  onContribute: (goal: any) => void
}

export function GoalCard({ goal, onEdit, onDelete, onContribute }: GoalCardProps) {
  const isOverdue = goal.daysRemaining < 0 && goal.status === "ACTIVE"
  const isCompleted = goal.status === "COMPLETED"
  const isPaused = goal.status === "PAUSED"

  const getStatusColor = () => {
    if (isCompleted) return "bg-green-500"
    if (isPaused) return "bg-gray-500"
    if (isOverdue) return "bg-red-500"
    if (goal.progress >= 75) return "bg-blue-500"
    if (goal.progress >= 50) return "bg-yellow-500"
    return "bg-orange-500"
  }

  const getStatusText = () => {
    if (isCompleted) return "Concluída"
    if (isPaused) return "Pausada"
    if (isOverdue) return `Atrasada ${Math.abs(goal.daysRemaining)}d`
    return `${goal.daysRemaining}d restantes`
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{goal.name}</CardTitle>
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
        {goal.description && (
          <CardDescription>{goal.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{goal.progress.toFixed(1)}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>{formatCurrency(Number(goal.currentAmount))}</span>
            <span className="font-semibold">{formatCurrency(Number(goal.targetAmount))}</span>
          </div>
        </div>

        {goal.evolution && goal.evolution.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Evolução mensal</p>
            <GoalEvolutionChart evolution={goal.evolution} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Prazo</span>
            </div>
            <p className="font-medium">
              {new Date(goal.deadline).toLocaleDateString("pt-BR")}
            </p>
          </div>

          {!isCompleted && goal.remaining > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Meta/mês</span>
              </div>
              <p className="font-medium">{formatCurrency(goal.monthlyTarget)}</p>
            </div>
          )}
        </div>

        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">Categoria</p>
          <p className="font-medium">{goal.category}</p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {!isCompleted && (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onContribute(goal)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Contribuir
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(goal)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(goal.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
