"use client"
import { InvestmentDrilldownDialog } from "@/components/investments/investment-drilldown-dialog"
import { AportRetiradaDialog } from "@/components/investments/aport-retirada-dialog"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Plus,
  TrendingUp,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"

const investmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["STOCKS", "BONDS", "REAL_ESTATE", "FIXED_INCOME", "CRYPTO", "FUNDS", "OTHER"]),
  amount: z.string().min(1, "Valor investido é obrigatório"),
  currentValue: z.string().min(1, "Valor atual é obrigatório"),
  quantity: z.string().optional(),
  institution: z.string().min(1, "Instituição é obrigatória"),
  ticker: z.string().optional(),
  acquiredAt: z.string().min(1, "Data de aquisição é obrigatória"),
  maturityDate: z.string().optional(),
  profitability: z.string().optional(),
})

type InvestmentFormData = z.infer<typeof investmentSchema>

interface Investment {
  id: string
  name: string
  type: string
  amount: string
  currentValue: string
  quantity: string | null
  institution: string
  ticker: string | null
  acquiredAt: string
  maturityDate: string | null
  profitability: string | null
}

const investmentTypes = {
  STOCKS: { label: "Ações", icon: "📈" },
  BONDS: { label: "Títulos", icon: "📃" },
  REAL_ESTATE: { label: "Imóveis", icon: "🏠" },
  FIXED_INCOME: { label: "Renda Fixa", icon: "💰" },
  CRYPTO: { label: "Cripto", icon: "₿" },
  FUNDS: { label: "Fundos", icon: "💼" },
  OTHER: { label: "Outro", icon: "📊" },
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownInvestment, setDrilldownInvestment] = useState<Investment | null>(null)

  const handleOpenDrilldown = (investment: Investment) => {
    setDrilldownInvestment(investment)
    setDrilldownOpen(true)
  }
  const [isOpen, setIsOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
  })

  const selectedType = watch("type")

  const fetchInvestments = useCallback(async () => {
    try {
      const response = await fetch("/api/investments")
      if (response.ok) {
        const data = await response.json()
        setInvestments(data)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os investimentos",
        variant: "destructive",
      })
    }
  }, [toast])
  useEffect(() => {
    fetchInvestments()
  }, [fetchInvestments])

  const onSubmit = async (data: InvestmentFormData) => {
    try {
      const url = editingInvestment
        ? `/api/investments/${editingInvestment.id}`
        : "/api/investments"
      const method = editingInvestment ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          currentValue: parseFloat(data.currentValue),
          quantity: data.quantity ? parseFloat(data.quantity) : undefined,
          profitability: data.profitability ? parseFloat(data.profitability) : undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: editingInvestment ? "Investimento atualizado!" : "Investimento criado!",
          description: "Operação realizada com sucesso",
        })
        setIsOpen(false)
        reset()
        setEditingInvestment(null)
        fetchInvestments()
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
        description: "Ocorreu um erro ao salvar o investimento",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment)
    setValue("name", investment.name)
    setValue("type", investment.type as InvestmentFormData["type"])
    setValue("amount", investment.amount)
    setValue("currentValue", investment.currentValue)
    setValue("quantity", investment.quantity || "")
    setValue("institution", investment.institution)
    setValue("ticker", investment.ticker || "")
    setValue(
      "acquiredAt",
      (investment.acquiredAt ? investment.acquiredAt.split("T")[0] : "") as string
    )
    setValue("maturityDate", investment.maturityDate ? investment.maturityDate.split("T")[0] : "")
    setValue("profitability", investment.profitability || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este investimento?")) return

    try {
      const response = await fetch(`/api/investments/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Investimento excluído!", description: "Investimento removido com sucesso" })
        fetchInvestments()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o investimento",
        variant: "destructive",
      })
    }
  }

  const calculateReturn = (amount: string, currentValue: string) => {
    const invested = parseFloat(amount)
    const current = parseFloat(currentValue)
    const returnValue = current - invested
    const returnPercent = ((returnValue / invested) * 100).toFixed(2)
    return {
      returnValue,
      returnPercent: parseFloat(returnPercent),
      isPositive: returnValue >= 0,
    }
  }

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount), 0)
  const totalCurrent = investments.reduce((s, i) => s + parseFloat(i.currentValue), 0)
  const totalReturn = totalCurrent - totalInvested
  const totalReturnPercent = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Investimentos</h2>
          <p className="text-muted-foreground">Cadastre e acompanhe seus investimentos</p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) {
              reset()
              setEditingInvestment(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Investimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingInvestment ? "Editar Investimento" : "Novo Investimento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...register("name")} placeholder="Ex: Tesouro Direto" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => setValue("type", v as InvestmentFormData["type"])}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(investmentTypes).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor investido</Label>
                  <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0.00" />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Valor atual</Label>
                  <Input id="currentValue" type="number" step="0.01" {...register("currentValue")} placeholder="0.00" />
                  {errors.currentValue && <p className="text-sm text-destructive">{errors.currentValue.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Instituição</Label>
                <Input id="institution" {...register("institution")} placeholder="Ex: XP, Nu Invest" />
                {errors.institution && <p className="text-sm text-destructive">{errors.institution.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acquiredAt">Data aquisição</Label>
                  <Input id="acquiredAt" type="date" {...register("acquiredAt")} />
                  {errors.acquiredAt && <p className="text-sm text-destructive">{errors.acquiredAt.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker (opcional)</Label>
                  <Input id="ticker" {...register("ticker")} placeholder="Ex: BOVA11" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingInvestment ? "Atualizar" : "Criar"} Investimento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retorno Total</CardTitle>
            {totalReturn >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(totalReturn)}
            </div>
            <p className={`text-xs ${totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalReturn >= 0 ? "+" : ""}
              {totalReturnPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {investments.map((investment) => {
          const { returnValue, returnPercent, isPositive } = calculateReturn(
            investment.amount,
            investment.currentValue
          )
          const typeInfo = investmentTypes[investment.type as keyof typeof investmentTypes]

          // Função para registrar aporte/retirada
          const handleAportRetirada = async (amount: number, type: "APORTE" | "RETIRADA") => {
            try {
              const response = await fetch("/api/investments/api/aport-retirada", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  investmentId: investment.id,
                  amount,
                  type,
                }),
              })
              if (response.ok) {
                fetchInvestments()
              }
            } catch (e) {}
          }

          return (
            <Card
              key={investment.id}
              onClick={() => handleOpenDrilldown(investment)}
              style={{ cursor: "pointer" }}
            >
              <InvestmentDrilldownDialog
                open={drilldownOpen}
                onOpenChange={setDrilldownOpen}
                investmentId={drilldownInvestment?.id ?? null}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{investment.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {typeInfo?.icon} {typeInfo?.label}
                      </Badge>
                      {investment.ticker && (
                        <Badge variant="secondary" className="text-xs">
                          {investment.ticker}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Investido</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(investment.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(investment.currentValue))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retorno</span>
                    <span
                      className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(returnValue)} ({isPositive ? "+" : ""}
                      {returnPercent}%)
                    </span>
                  </div>
                </div>

                {investment.quantity && (
                  <div className="text-xs text-muted-foreground">
                    Quantidade: {parseFloat(investment.quantity).toFixed(6)}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">{investment.institution}</div>

                {investment.profitability && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Rentabilidade: </span>
                    <span className="font-medium">
                      {parseFloat(investment.profitability).toFixed(2)}% a.a.
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(investment)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(investment.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                  <AportRetiradaDialog onSubmit={handleAportRetirada} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {investments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum investimento cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro investimento e acompanhe seus rendimentos
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Investimento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
