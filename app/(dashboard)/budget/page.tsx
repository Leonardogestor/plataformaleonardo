"use client"

import { TooltipProgressiva } from "@/components/tooltip-progressiva"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Target, AlertTriangle, CheckCircle } from "lucide-react"

interface ImpactoMetas {
  receita_mes: number
  total_orcamento: number
  disponivel_para_metas: number
  total_necessario_metas: number
  metas: { id: string; name: string; monthlyTarget: number; remaining: number }[]
}

export default function BudgetPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [impactoMetas, setImpactoMetas] = useState<ImpactoMetas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parceladoSpent, setParceladoSpent] = useState(0)
  const month = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/budget?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || [])
        setImpactoMetas(data.impacto_em_metas ?? null)
        const p = data.categories?.find((c: any) => c.category === "Parcelado")
        setParceladoSpent(p?.spent || 0)
      })
      .catch(() => setError("Erro ao buscar orçamento"))
      .finally(() => setLoading(false))
  }, [month])

  const totalBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0)
  const pressure = parceladoSpent > totalBudget * 0.3 && parceladoSpent > 0
  const atingeMetas = impactoMetas && impactoMetas.disponivel_para_metas >= impactoMetas.total_necessario_metas

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <TooltipProgressiva
        id="budget_edit"
        text="Defina limites para cada categoria. Ajuste sempre que necessário para manter o controle."
        cta="Ajustar agora"
      >
        <h2 className="text-2xl font-bold mb-2">Orçamento Mensal</h2>
      </TooltipProgressiva>
      {loading ? (
        <div>Carregando orçamento...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          {impactoMetas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Impacto nas metas ao ajustar orçamento
                </CardTitle>
                <CardDescription>
                  Com o orçamento atual, quanto sobra para aportar nas metas?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Receita do mês</p>
                    <p className="font-semibold">{formatCurrency(impactoMetas.receita_mes)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total orçamento (despesas)</p>
                    <p className="font-semibold">{formatCurrency(impactoMetas.total_orcamento)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponível para metas</p>
                    <p className="font-semibold">{formatCurrency(impactoMetas.disponivel_para_metas)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Necessário (metas ativas)</p>
                    <p className="font-semibold">{formatCurrency(impactoMetas.total_necessario_metas)}</p>
                  </div>
                </div>
                {impactoMetas.total_necessario_metas > 0 && (
                  atingeMetas ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 p-3">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        O valor disponível cobre os aportes sugeridos nas metas.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 p-3">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        Reduza despesas no orçamento ou priorize metas para atingir os aportes recomendados.
                      </span>
                    </div>
                  )
                )}
                {impactoMetas.metas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Aporte mensal sugerido por meta</p>
                    <ul className="space-y-1 text-sm">
                      {impactoMetas.metas.map((m) => (
                        <li key={m.id} className="flex justify-between">
                          <span className="truncate mr-2">{m.name}</span>
                          <span className="tabular-nums shrink-0">{formatCurrency(m.monthlyTarget)}/mês</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="mb-4">
            <div className="font-semibold mb-2">Impacto dos Parcelados</div>
            <div className="text-lg font-bold">R$ {parceladoSpent.toLocaleString()} / mês</div>
            {pressure && (
              <div className="text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 rounded px-2 py-1 mt-2">
                Aviso: Parcelados comprometem mais de 30% do orçamento mensal!
              </div>
            )}
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-2">Categorias</div>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.category} className={cat.category === "Parcelado" ? "font-bold" : ""}>
                  {cat.category}: R$ {cat.spent.toLocaleString()} / R$ {cat.budget.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
