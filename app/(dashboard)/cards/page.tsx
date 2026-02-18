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
import { Plus, CreditCard, Edit, Trash2, Calendar, AlertTriangle, TrendingUp, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  lastFourDigits: z.string().length(4, "Últimos 4 dígitos são obrigatórios"),
  brand: z.string().min(1, "Bandeira é obrigatória"),
  limit: z.string().min(1, "Limite é obrigatório"),
  closingDay: z.string().min(1, "Dia de fechamento é obrigatório"),
  dueDay: z.string().min(1, "Dia de vencimento é obrigatório"),
  color: z.string().optional(),
})

type CardFormData = z.infer<typeof cardSchema>

interface CreditCard {
  id: string
  name: string
  lastFourDigits: string
  brand: string
  limit: string
  closingDay: number
  dueDay: number
  color: string | null
  isActive: boolean
}

const cardBrands = [
  "Visa",
  "Mastercard",
  "Elo",
  "American Express",
  "Hipercard",
  "Diners Club",
  "Outro",
]

interface CardsAnalytics {
  renda_futura_comprometida: number
  endividamento_12_meses: number
  indicador_alavancagem: number
  por_cartao: {
    cardId: string
    limite: number
    uso_percentual: number
    divida_restante: number
  }[]
}

const cardColors = [
  { name: "Verde", value: "hsl(var(--success))" },
  { name: "Roxo", value: "hsl(var(--secondary))" },
  { name: "Azul", value: "hsl(var(--info))" },
  { name: "Amarelo", value: "hsl(var(--warning))" },
  { name: "Vermelho", value: "hsl(var(--destructive))" },
  { name: "Cinza", value: "hsl(var(--muted))" },
  { name: "Branco", value: "hsl(var(--background))" },
  { name: "Preto", value: "#0A0E27" },
]

export default function CardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [analytics, setAnalytics] = useState<CardsAnalytics | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
  })

  const selectedBrand = watch("brand")
  const selectedColor = watch("color")

  const fetchCards = useCallback(async () => {
    try {
      const [cardsRes, analyticsRes] = await Promise.all([
        fetch("/api/cards"),
        fetch("/api/cards/analytics"),
      ])
      if (cardsRes.ok) {
        const data = await cardsRes.json()
        setCards(data)
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cartões",
        variant: "destructive",
      })
    }
  }, [toast])
  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const onSubmit = async (data: CardFormData) => {
    try {
      const url = editingCard ? `/api/cards/${editingCard.id}` : "/api/cards"
      const method = editingCard ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          limit: parseFloat(data.limit),
          closingDay: parseInt(data.closingDay),
          dueDay: parseInt(data.dueDay),
        }),
      })

      if (response.ok) {
        toast({
          title: editingCard ? "Cartão atualizado!" : "Cartão criado!",
          description: "Operação realizada com sucesso",
        })
        setIsOpen(false)
        reset()
        setEditingCard(null)
        fetchCards()
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
        description: "Ocorreu um erro ao salvar o cartão",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card)
    setValue("name", card.name)
    setValue("lastFourDigits", card.lastFourDigits)
    setValue("brand", card.brand)
    setValue("limit", card.limit)
    setValue("closingDay", card.closingDay.toString())
    setValue("dueDay", card.dueDay.toString())
    setValue("color", card.color || "")
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return

    try {
      const response = await fetch(`/api/cards/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Cartão excluído!", description: "Cartão removido com sucesso" })
        fetchCards()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cartão",
        variant: "destructive",
      })
    }
  }

  const totalLimit = cards.reduce((sum, card) => sum + parseFloat(card.limit), 0)
  const porCartaoMap = analytics?.por_cartao
    ? new Map(analytics.por_cartao.map((p) => [p.cardId, p]))
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cartões</h2>
          <p className="text-muted-foreground">Gerencie seus cartões de crédito</p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) {
              reset()
              setEditingCard(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCard ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cartão</Label>
                <Input id="name" {...register("name")} placeholder="Ex: Nubank Mastercard" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastFourDigits">Últimos 4 Dígitos</Label>
                  <Input
                    id="lastFourDigits"
                    {...register("lastFourDigits")}
                    placeholder="1234"
                    maxLength={4}
                  />
                  {errors.lastFourDigits && (
                    <p className="text-sm text-destructive">{errors.lastFourDigits.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Bandeira</Label>
                  <Select value={selectedBrand} onValueChange={(value) => setValue("brand", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.brand && (
                    <p className="text-sm text-destructive">{errors.brand.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Limite Total</Label>
                <Input
                  id="limit"
                  type="number"
                  step="0.01"
                  {...register("limit")}
                  placeholder="0.00"
                />
                {errors.limit && <p className="text-sm text-destructive">{errors.limit.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closingDay">Dia de Fechamento</Label>
                  <Input
                    id="closingDay"
                    type="number"
                    min="1"
                    max="31"
                    {...register("closingDay")}
                    placeholder="15"
                  />
                  {errors.closingDay && (
                    <p className="text-sm text-destructive">{errors.closingDay.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDay">Dia de Vencimento</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    {...register("dueDay")}
                    placeholder="25"
                  />
                  {errors.dueDay && (
                    <p className="text-sm text-destructive">{errors.dueDay.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor do Cartão</Label>
                <div className="grid grid-cols-4 gap-2">
                  {cardColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setValue("color", color.value)}
                      className={`h-10 rounded-md border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingCard ? "Atualizar" : "Criar"} Cartão
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limite Total</CardTitle>
          <CardDescription>Soma de todos os cartões ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(totalLimit)}</p>
        </CardContent>
      </Card>

      {analytics && cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renda futura comprometida</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(analytics.renda_futura_comprometida)}</p>
              <p className="text-xs text-muted-foreground mt-1">Valor mensal em parcelas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Endividamento (12 meses)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(analytics.endividamento_12_meses)}</p>
              <p className="text-xs text-muted-foreground mt-1">Parcelas nos próximos 12 meses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indicador alavancagem</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{(analytics.indicador_alavancagem * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Dívida parcelada / limite total</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const uso = porCartaoMap?.get(card.id)
          const usoPercent = uso?.uso_percentual ?? 0
          const alertaLimite = usoPercent > 60

          return (
          <Card
            key={card.id}
            className={`overflow-hidden ${alertaLimite ? "ring-2 ring-amber-500 ring-offset-2 border-amber-500/50" : ""}`}
            style={{ borderTop: `4px solid ${card.color || "#6b7280"}` }}
          >
            {alertaLimite && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-b border-amber-500/30">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Uso do limite acima de 60%</span>
              </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="text-lg font-mono">•••• {card.lastFourDigits}</p>
                </div>

                {uso != null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Uso do limite (parcelas)</span>
                      <span className={alertaLimite ? "font-semibold text-amber-600 dark:text-amber-400" : "font-medium"}>
                        {usoPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          alertaLimite ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, usoPercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-muted-foreground">Bandeira</p>
                    <p className="font-medium">{card.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Limite</p>
                    <p className="font-medium">{formatCurrency(parseFloat(card.limit))}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Fech:</span>
                    <span className="font-medium">{card.closingDay}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Venc:</span>
                    <span className="font-medium">{card.dueDay}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(card)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {cards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro cartão de crédito
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cartão
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
