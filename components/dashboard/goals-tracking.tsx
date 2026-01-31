// Card de acompanhamento de metas do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export type GoalTracking = {
  title: string
  progress: number // 0-100
  color: string
}

export type GoalsTrackingProps = {
  goals: GoalTracking[]
}

export function GoalsTracking({ goals }: GoalsTrackingProps) {
  return (
    <Card className="bg-zinc-900 border-2 border-teal-500 text-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Acompanhamento de Metas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.title}>
              <div className="flex justify-between mb-1">
                <span>{goal.title}</span>
                <span className="font-bold">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className={goal.color} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
