"use client"

import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

export interface GoalsProgressProps {
  goals: Goal[]
}

function getStatus(percentage: number) {
  if (percentage >= 100) return { text: "Atingida", color: "bg-green-600" }
  if (percentage >= 80) return { text: "Atingível", color: "bg-teal-600" }
  if (percentage < 40) return { text: "Inviável", color: "bg-red-600" }
  return { text: "Exige ajuste", color: "bg-yellow-600" }
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  if (!goals.length) {
    return (
      <div className="bg-dark rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-white">Progresso das Metas</h3>
        <div className="text-muted-foreground">Nenhuma meta cadastrada.</div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {goals.map((goal) => {
        const percentage =
          goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
        const status = getStatus(percentage)
        return (
          <div
            key={goal.id}
            className={`bg-dark rounded-lg p-4 shadow-lg flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{goal.name}</span>
              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${status.color}`}>
                {status.text}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
              </span>
              <span className="text-muted-foreground">
                Limite: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-2">{percentage.toFixed(1)}%</div>
          </div>
        )
      })}
    </div>
  )
}
