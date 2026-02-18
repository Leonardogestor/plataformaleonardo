"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
}

interface GoalsProgressProps {
  goals?: Goal[] | null
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  const defaultGoals = [
    { id: "1", name: "Reserva Emergência", targetAmount: 10000, currentAmount: 6500 },
    { id: "2", name: "Viagem", targetAmount: 5000, currentAmount: 2250 },
    { id: "3", name: "Investimentos", targetAmount: 20000, currentAmount: 16000 },
  ]

  const displayGoals: Goal[] = (goals?.length ?? 0) > 0 ? goals! : defaultGoals

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-primary"
    if (percentage >= 50) return "bg-warning"
    return "bg-success"
  }

  const getTextColor = (percentage: number) => {
    if (percentage >= 80) return "text-primary"
    if (percentage >= 50) return "text-warning"
    return "text-success"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Progresso de metas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayGoals.slice(0, 3).map((goal) => {
          const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100)
          const progressColor = getProgressColor(percentage)
          const textColor = getTextColor(percentage)

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{goal.name}</span>
                <span className={`text-sm font-bold ${textColor}`}>{percentage}%</span>
              </div>
              <Progress value={percentage} className={`h-2 ${progressColor}`} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
