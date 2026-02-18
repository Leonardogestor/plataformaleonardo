interface Goal {
  name: string
  status: string // "atinge" | "não atinge"
  monthsToGoal: number | null
}

interface GoalsStatusProps {
  goals: Goal[]
}

export function GoalsStatus({ goals }: GoalsStatusProps) {
  if (!goals || goals.length === 0) return null
  return (
    <div className="bg-card rounded-lg border border-border shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2 text-foreground">Metas e Projeção de Prazo</h3>
      <ul className="space-y-2">
        {goals.map((goal) => (
          <li key={goal.name} className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${goal.status === "atinge" ? "bg-green-500" : "bg-red-500"}`}
              title={goal.status === "atinge" ? "Atinge no prazo" : "Não atinge no prazo"}
            />
            <span className="font-medium">{goal.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {goal.status === "atinge"
                ? `Atinge em ${goal.monthsToGoal} meses`
                : "Não atinge no prazo"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
