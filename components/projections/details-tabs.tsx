import { useState } from "react"

interface DetailsTabsProps {
  series: Array<{
    month: number
    netWorth: number
    income: number
    expense: number
    saving: number
    investment: number
  }>
}

const tabList = [
  { key: "income", label: "Receita" },
  { key: "expense", label: "Despesas" },
  { key: "investment", label: "Investimentos" },
  { key: "saving", label: "Aportes/Retiradas" },
]

export function DetailsTabs({ series }: DetailsTabsProps) {
  const [tab, setTab] = useState("income")

  return (
    <div className="bg-card rounded-lg border border-border shadow p-4 mb-6">
      <div className="flex gap-2 mb-4">
        {tabList.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === "income" && (
          <DetailSection
            title="Receita Projetada"
            data={series.map((s) => ({ month: s.month, value: s.income }))}
            color="text-green-400"
          />
        )}
        {tab === "expense" && (
          <DetailSection
            title="Despesas Projetadas"
            data={series.map((s) => ({ month: s.month, value: s.expense }))}
            color="text-red-400"
          />
        )}
        {tab === "investment" && (
          <DetailSection
            title="Investimentos Projetados"
            data={series.map((s) => ({ month: s.month, value: s.investment }))}
            color="text-blue-400"
          />
        )}
        {tab === "saving" && (
          <DetailSection
            title="Aportes/Retiradas"
            data={series.map((s) => ({ month: s.month, value: s.saving }))}
            color="text-amber-400"
          />
        )}
      </div>
    </div>
  )
}

function DetailSection({
  title,
  data,
  color,
}: {
  title: string
  data: Array<{ month: number; value: number }>
  color: string
}) {
  return (
    <div>
      <h4 className={`font-semibold mb-2 ${color}`}>{title}</h4>
      <div className="flex flex-wrap gap-2 text-xs">
        {data.map((d) => (
          <div key={d.month} className="bg-muted rounded px-2 py-1">
            {d.month}º mês:{" "}
            <span className="font-bold">
              R$ {d.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
