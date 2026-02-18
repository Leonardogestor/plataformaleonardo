"use client"

import { useEffect, useState } from "react"
import { InvestmentDrilldown } from "@/components/investments/investment-drilldown"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface InvestmentDrilldownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string | null
}

export function InvestmentDrilldownDialog({
  open,
  onOpenChange,
  investmentId,
}: InvestmentDrilldownDialogProps) {
  const [investment, setInvestment] = useState<any | null>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !investmentId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/investments/${investmentId}`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/investments/${investmentId}/movements`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([inv, movs]) => {
        setInvestment(inv)
        setMovements(movs || [])
      })
      .finally(() => setLoading(false))
  }, [open, investmentId])

  if (!open || !investmentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {loading || !investment ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <InvestmentDrilldown
            investment={{
              ...investment,
              amount: parseFloat(investment.amount),
              currentValue: parseFloat(investment.currentValue),
              profitability: investment.profitability ? parseFloat(investment.profitability) : 0,
              profit: parseFloat(investment.currentValue) - parseFloat(investment.amount),
              history: (movements || []).map((m: any) => ({
                date: m.date?.split("T")[0] ?? "",
                value: m.amount,
                aportes: m.type === "APORTE" ? m.amount : undefined,
                retiradas: m.type === "RETIRADA" ? Math.abs(m.amount) : undefined,
              })),
              dividends: [],
            }}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
