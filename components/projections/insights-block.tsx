interface InsightsBlockProps {
  insights: string[]
}

export function InsightsBlock({ insights }: InsightsBlockProps) {
  if (!insights || insights.length === 0) return null
  return (
    <div className="bg-card rounded-lg border border-border shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2 text-foreground">Insights do Futuro Financeiro</h3>
      <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
        {insights.map((insight, i) => (
          <li key={i} className="text-foreground">
            {insight}
          </li>
        ))}
      </ul>
    </div>
  )
}
