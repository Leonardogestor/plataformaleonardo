import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
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
        <CurrencyInput value={amount} onChange={setAmount} placeholder="0,00" />
        <p className="text-xs text-muted-foreground">
          Digite o valor diretamente (ex: 1222000 para R$ 12.220,00) ou use formatação brasileira
          (ex: 5.000,00)
        </p>
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
