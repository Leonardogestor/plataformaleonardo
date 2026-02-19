import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface AportRetiradaDialogProps {
  onSubmit: (amount: number, type: "APORTE" | "RETIRADA") => void
}

/** Form-only version for use inside another Dialog (e.g. table row "Aport/Ret."). */
export function AportRetiradaForm({
  onSubmit,
  onClose,
}: AportRetiradaDialogProps & { onClose?: () => void }) {
  const [amount, setAmount] = useState(0)
  const [type, setType] = useState<"APORTE" | "RETIRADA">("APORTE")
  const handleSubmit = () => {
    if (amount <= 0) return
    onSubmit(amount, type)
    setAmount(0)
    onClose?.()
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "APORTE" | "RETIRADA")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="APORTE">Aporte</option>
          <option value="RETIRADA">Retirada</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Valor (R$)</label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          placeholder="0,00"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={amount <= 0}>
          Registrar
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}

export function AportRetiradaDialog({ onSubmit }: AportRetiradaDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Registrar Aporte ou Retirada</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Aporte ou Retirada</DialogTitle>
        </DialogHeader>
        <AportRetiradaForm onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  )
}
