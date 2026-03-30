"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface BulkEditCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTransactions: string[]
  onSuccess: () => void
}

const CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Serviços",
  "Investimentos",
  "Outras Receitas",
  "Outras Despesas",
  "Salário",
  "Transferência",
]

export function BulkEditCategoryDialog({
  open,
  onOpenChange,
  selectedTransactions,
  onSuccess,
}: BulkEditCategoryDialogProps) {
  const [category, setCategory] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!category) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/transactions/bulk-edit-category", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionIds: selectedTransactions,
          category,
          subcategory: subcategory || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sucesso!",
          description: `${data.updatedCount} transação(ões) atualizada(s) com sucesso`,
        })
        onSuccess()
        onOpenChange(false)
        setCategory("")
        setSubcategory("")
      } else {
        throw new Error("Failed to update transactions")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as transações",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria em Massa</DialogTitle>
          <DialogDescription>
            Altere a categoria para {selectedTransactions.length} transação(ões) selecionada(s).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subcategory">Subcategoria (opcional)</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  <SelectItem value="Mercado">Mercado</SelectItem>
                  <SelectItem value="Restaurante">Restaurante</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Combustível">Combustível</SelectItem>
                  <SelectItem value="Uber/99">Uber/99</SelectItem>
                  <SelectItem value="Streaming">Streaming</SelectItem>
                  <SelectItem value="Academia">Academia</SelectItem>
                  <SelectItem value="Plano de Saúde">Plano de Saúde</SelectItem>
                  <SelectItem value="Farmácia">Farmácia</SelectItem>
                  <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                  <SelectItem value="Cursos">Cursos</SelectItem>
                  <SelectItem value="Livros">Livros</SelectItem>
                  <SelectItem value="Cinema">Cinema</SelectItem>
                  <SelectItem value="Viagens">Viagens</SelectItem>
                  <SelectItem value="Roupas">Roupas</SelectItem>
                  <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                  <SelectItem value="Móveis">Móveis</SelectItem>
                  <SelectItem value="Celular/Internet">Celular/Internet</SelectItem>
                  <SelectItem value="Luz">Luz</SelectItem>
                  <SelectItem value="Água">Água</SelectItem>
                  <SelectItem value="Gás">Gás</SelectItem>
                  <SelectItem value="Condomínio">Condomínio</SelectItem>
                  <SelectItem value="IPTU">IPTU</SelectItem>
                  <SelectItem value="IPVA">IPVA</SelectItem>
                  <SelectItem value="Seguro">Seguro</SelectItem>
                  <SelectItem value="Impostos">Impostos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Atualizar Categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
