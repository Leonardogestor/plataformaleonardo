import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { TooltipProgressiva } from "@/components/tooltip-progressiva"

type Installment = {
  id: string
  description: string
  totalValue: number
  totalInstallments: number
  currentInstallment: number
  installmentValue: number
  totalPaid: number
  totalToPay: number
  nextDue: string
  startDate: string
  endDate: string
}

export default function CardDrilldown({
  cardId,
  onClose,
}: {
  cardId: string
  onClose: () => void
}) {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/cards/${cardId}/installments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setInstallments(data)
      })
      .catch(() => setError("Erro ao buscar parcelados"))
      .finally(() => setLoading(false))
  }, [cardId])

  // Calcular impacto mensal futuro (somatório das parcelas mensais ativas)
  const futureMonthlyImpact = installments.reduce((sum, p) => sum + p.installmentValue, 0)
  // Critério de pressão: se o impacto mensal for maior que 30% do limite real do cartão
  const cardLimit = card?.limit || 8000
  const pressure = futureMonthlyImpact > cardLimit * 0.3

  // Ordenação: mais longos e mais caros no topo
  const sortedInstallments = [...installments].sort((a, b) => {
    const aLeft = a.totalInstallments - a.currentInstallment
    const bLeft = b.totalInstallments - b.currentInstallment
    if (bLeft !== aLeft) return bLeft - aLeft
    return b.totalValue - a.totalValue
  })

  // Helper para barra de timeline
  function timelineBar(current: number, total: number) {
    const filled = Math.max(0, total - current)
    const empty = current
    return (
      <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>
        {Array(filled).fill("▮").join("")}
        {Array(empty).fill("▯").join("")}
      </span>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <TooltipProgressiva
          id="card_drilldown"
          text="Veja o impacto dos parcelados no seu orçamento. Planeje pagamentos para evitar surpresas."
          cta="Entendi"
        >
          <CardTitle>Resumo do Cartão</CardTitle>
        </TooltipProgressiva>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="font-semibold mb-2">Impacto Mensal Futuro</div>
          <div className="text-lg font-bold">R$ {futureMonthlyImpact.toLocaleString()} / mês</div>
          {pressure && (
            <div className="text-yellow-700 bg-yellow-100 rounded px-2 py-1 mt-2">
              Aviso: Este cartão compromete <b>R$ {futureMonthlyImpact.toLocaleString()}</b> por mês
              até{" "}
              {installments.length > 0
                ? new Date(
                    Math.max(...installments.map((p) => new Date(p.endDate).getTime()))
                  ).toLocaleDateString()
                : "-"}
              . Pressão no orçamento!
            </div>
          )}
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-2">Compras Parceladas</div>
          {loading ? (
            <div>Carregando...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : installments.length === 0 ? (
            <div className="text-muted-foreground">Nenhuma compra parcelada encontrada.</div>
          ) : (
            <ul className="space-y-2">
              {sortedInstallments.map((p) => {
                const monthsLeft = p.totalInstallments - p.currentInstallment
                const isPressure = p.installmentValue > cardLimit * 0.3
                return (
                  <li key={p.id} className="border rounded p-2 relative">
                    <div className="flex items-center gap-2">
                      <b>{p.description}</b>
                      {isPressure && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-200 text-yellow-900 font-bold">
                          Pressiona orçamento
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {timelineBar(p.currentInstallment, p.totalInstallments)}
                      <span className="ml-2">{monthsLeft} meses restantes</span>
                    </div>
                    <div>
                      {p.totalInstallments}x de R$ {p.installmentValue.toLocaleString()} (atual:{" "}
                      {p.currentInstallment}/{p.totalInstallments})
                    </div>
                    <div>
                      Total da compra: <b>R$ {p.totalValue.toLocaleString()}</b>
                    </div>
                    <div>
                      Parcela atual: <b>{p.currentInstallment}</b> / {p.totalInstallments}
                    </div>
                    <div>
                      Valor mensal: <b>R$ {p.installmentValue.toLocaleString()}</b>
                    </div>
                    <div>
                      Pago: <b>R$ {p.totalPaid.toLocaleString()}</b> | Restante:{" "}
                      <b>R$ {p.totalToPay.toLocaleString()}</b>
                    </div>
                    <div>
                      Até quando: <b>{new Date(p.endDate).toLocaleDateString()}</b>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Próximo vencimento: {new Date(p.nextDue).toLocaleDateString()}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </CardContent>
    </Card>
  )
}
