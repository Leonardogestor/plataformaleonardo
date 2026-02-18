"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  date: z.string().min(1, "Data é obrigatória"),
  accountId: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface Transaction {
  id: string
  type: string
  category: string
  amount: string
  description: string
  date: string
  account: { name: string } | null
}

interface Account {
  id: string
  name: string
  institution: string
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onSuccess: () => void
}

const COMMON_CATEGORIES = [
  "Salário",
  "Freelance",
  "Investimento",
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Serviços",
  "Outros",
]

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  })

  const selectedType = watch("type")
  const selectedCategory = watch("category")
  const selectedAccountId = watch("accountId")
  const description = watch("description")

  useEffect(() => {
    if (open) {
      fetchAccounts()
      if (transaction) {
        const date = new Date(transaction.date)
        const formattedDate = date.toISOString().split("T")[0]
        
        setValue("type", transaction.type as TransactionFormData["type"])
        setValue("category", transaction.category)
        setValue("amount", transaction.amount)
        setValue("description", transaction.description)
        setValue("date", formattedDate ?? "")
        setValue("accountId", transaction.account?.name ?? "")
      } else {
        reset({
          type: "EXPENSE",
          date: new Date().toISOString().split("T")[0],
        })
      }
    }
  }, [open, transaction, setValue, reset])

  useEffect(() => {
    if (description && description.length > 3 && !transaction && !selectedCategory) {
      const timer = setTimeout(async () => {
        try {
          const type = watch("type")
          const amountStr = watch("amount")
          const amount = parseFloat(amountStr?.replace(",", ".") || "0") || 0
          const response = await fetch("/api/categorization/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description,
              type: type === "INCOME" ? "INCOME" : "EXPENSE",
              amount,
            }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.category) {
              setSuggestedCategory(data.category)
              setValue("category", data.category)
            }
          }
        } catch (error) {
          console.error("Error suggesting category:", error)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [description, transaction, selectedCategory, setValue])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true)
    try {
      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions"
      const method = transaction ? "PATCH" : "POST"

      const payload = {
        type: data.type,
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        date: new Date(data.date).toISOString(),
        accountId: data.accountId || null,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        if (suggestedCategory && suggestedCategory !== data.category && data.description) {
          await fetch("/api/categorization/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pattern: data.description.toLowerCase().split(" ")[0],
              category: data.category,
            }),
          })
        }

        toast({
          title: transaction ? "Transação atualizada!" : "Transação criada!",
          description: "Operação realizada com sucesso",
        })
        
        // Disparar evento para atualizar o dashboard
        window.dispatchEvent(new CustomEvent('transaction-updated'))
        
        onSuccess()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Ocorreu um erro",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a transação",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => setValue("type", value as TransactionFormData["type"])}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Conta (opcional)</Label>
            <Select
              value={selectedAccountId}
              onValueChange={(value) => setValue("accountId", value)}
            >
              <SelectTrigger id="accountId">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.institution})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
