"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, Tag, FileText } from "lucide-react"

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  type: "income" | "expense" | "investment" | "investment_withdraw"
  amount: number
  status: "green" | "yellow" | "red"
  budget?: number
}

interface TransactionEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onSave: (transaction: Transaction) => void
}

const categories = {
  income: ["Salário", "Freelancer", "Investimentos", "Outras Receitas"],
  expense: ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Compras", "Outras Despesas"],
  investment: ["Tesouro Direto", "Ações", "Fundos", "Cripto", "Renda Fixa"],
  investment_withdraw: ["Tesouro Direto", "Ações", "Fundos", "Cripto", "Renda Fixa"]
}

export function TransactionEditDialog({
  open,
  onOpenChange,
  transaction,
  onSave,
}: TransactionEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    description: "",
    category: "",
    type: "expense",
    amount: 0,
    date: "",
    status: "green",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (transaction) {
      setFormData(transaction)
    } else {
      setFormData({
        description: "",
        category: "",
        type: "expense",
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        status: "green",
      })
    }
  }, [transaction, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return

    setIsLoading(true)
    try {
      const updatedTransaction = {
        ...transaction,
        ...formData,
        amount: Number(formData.amount),
      } as Transaction

      // API call to update transaction
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTransaction),
      })

      if (response.ok) {
        onSave(updatedTransaction)
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-green-100 text-green-800"
      case "yellow": return "bg-yellow-100 text-yellow-800"
      case "red": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Editar Transação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => {
                  setFormData({ 
                    ...formData, 
                    type: value,
                    category: "" // Reset category when type changes
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">🟢 Receita</SelectItem>
                  <SelectItem value="expense">🔴 Despesa</SelectItem>
                  <SelectItem value="investment">🔵 Aplicação</SelectItem>
                  <SelectItem value="investment_withdraw">🟡 Resgate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Supermercado, Salário, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categoria
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {formData.type && categories[formData.type as keyof typeof categories]?.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">🟢 Saudável</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">🟡 Atenção</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="red">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800">🔴 Prejudicial</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
