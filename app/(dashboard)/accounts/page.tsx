"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Plus, Wallet, Edit, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import dynamic from "next/dynamic"

const ConnectBankDialog = dynamic(
  () =>
    import("@/components/accounts/connect-bank-dialog").then((mod) => ({
      default: mod.ConnectBankDialog,
    })),
  { ssr: false }
)

const accountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["CHECKING", "SAVINGS", "INVESTMENT", "CASH", "OTHER"]),
  institution: z.string().min(1, "Instituição é obrigatória"),
  balance: z.string().min(1, "Saldo é obrigatório"),
  color: z.string().optional(),
})

type AccountFormData = z.infer<typeof accountSchema>

interface Account {
  id: string
  name: string
  type: string
  institution: string
  balance: string
  color: string | null
  isActive: boolean
}

const accountTypes = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
  OTHER: "Outro",
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  })

  const selectedType = watch("type")

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas",
        variant: "destructive",
      })
    }
  }, [toast])
  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    const onConnected = () => fetchAccounts()
    window.addEventListener("open-finance:connected", onConnected)
    return () => window.removeEventListener("open-finance:connected", onConnected)
  }, [fetchAccounts])

  const onSubmit = async (data: AccountFormData) => {
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : "/api/accounts"
      const method = editingAccount ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          balance: parseFloat(data.balance),
        }),
      })

      if (response.ok) {
        toast({
          title: editingAccount ? "Conta atualizada!" : "Conta criada!",
          description: "Operação realizada com sucesso",
        })
        setIsOpen(false)
        reset()
        setEditingAccount(null)
        fetchAccounts()
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
        description: "Ocorreu um erro ao salvar a conta",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setValue("name", account.name)
    setValue("type", account.type as AccountFormData["type"])
    setValue("institution", account.institution)
    setValue("balance", account.balance)
    setValue("color", account.color || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return

    try {
      const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Conta excluída!", description: "Conta removida com sucesso" })
        fetchAccounts()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta",
        variant: "destructive",
      })
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contas</h2>
          <p className="text-muted-foreground">Gerencie suas contas bancárias e carteiras</p>
        </div>
        <div className="flex gap-2">
          <ConnectBankDialog />
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open)
              if (!open) {
                reset()
                setEditingAccount(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...register("name")} placeholder="Ex: Nubank" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(value) => setValue("type", value as AccountFormData["type"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountTypes).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Instituição</Label>
                  <Input id="institution" {...register("institution")} placeholder="Ex: Nubank" />
                  {errors.institution && (
                    <p className="text-sm text-destructive">{errors.institution.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance">Saldo Atual</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    {...register("balance")}
                    placeholder="0.00"
                  />
                  {errors.balance && (
                    <p className="text-sm text-destructive">{errors.balance.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  {editingAccount ? "Atualizar" : "Criar"} Conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo Total</CardTitle>
          <CardDescription>Soma de todas as contas ativas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(parseFloat(account.balance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {accountTypes[account.type as keyof typeof accountTypes]} • {account.institution}
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(account)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(account.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
