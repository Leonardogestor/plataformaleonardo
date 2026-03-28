import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"

export default function CardForm({
  onClose,
  cardId,
}: {
  onClose: () => void
  cardId?: string | null
}) {
  // TODO: Integrar com backend/edição
  const [form, setForm] = useState({
    name: "",
    institution: "",
    limit: 0,
    closeDay: "",
    dueDay: "",
    points: "",
    notes: "",
  })
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{cardId ? "Editar Cartão" : "Novo Cartão"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <label className="block font-medium">Nome do cartão*</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block font-medium">Instituição*</label>
            <input
              className="input"
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block font-medium">Limite total*</label>
            <CurrencyInput
              value={form.limit}
              onChange={(value) => setForm((f) => ({ ...f, limit: value }))}
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-2">
            <div>
              <label className="block font-medium">Fechamento*</label>
              <input
                className="input"
                type="number"
                value={form.closeDay}
                onChange={(e) => setForm((f) => ({ ...f, closeDay: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block font-medium">Vencimento*</label>
              <input
                className="input"
                type="number"
                value={form.dueDay}
                onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-medium">Programa de pontos</label>
            <input
              className="input"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
            />
          </div>
          <div>
            <label className="block font-medium">Observações</label>
            <textarea
              className="input"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
