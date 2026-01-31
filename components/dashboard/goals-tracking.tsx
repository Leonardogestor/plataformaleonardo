// Card de acompanhamento de metas do dashboard LMG
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export interface GoalTracking {
  id: string
  title: string
  current: number
  target: number
  deadline: string
  color?: string
  repeat?: boolean
}

export interface GoalsTrackingProps {
  goals: GoalTracking[]
}

function getStatusColor(percent: number) {
  if (percent >= 100) return "bg-green-600"
  if (percent >= 80) return "bg-teal-600"
  if (percent < 40) return "bg-red-600"
  return "bg-yellow-600"
}

export function GoalsTracking({ goals }: GoalsTrackingProps) {
  return (
    <Card className="bg-dark border-2 border-teal-500 text-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Acompanhamento de Metas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0
            const color = goal.color || getStatusColor(percent)
            return (
              <div key={goal.id} className="bg-zinc-800 rounded-lg p-4 shadow flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">{goal.title}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${color}`}>
                    {percent >= 100
                      ? "Atingida"
                      : percent >= 80
                        ? "Atingível"
                        : percent < 40
                          ? "Inviável"
                          : "Exige ajuste"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {goal.current.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /{" "}
                    {goal.target.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span className="text-muted-foreground">
                    Limite: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
                  {goal.repeat && (
                    <Button size="sm" variant="outline">
                      Repetir próximo mês
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
