"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save, RefreshCw, Download, Filter, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  subcategory?: string
  originalCategory?: string
  confidence?: number
  documentId: string
}

interface ImportTransactionsEditorProps {
  documentId: string
  documentName: string
  onClose?: () => void
}

const categories = [
  { value: "receita", label: "Receita", subcategories: ["Salário", "Freelas", "Investimentos", "Outros"] },
  { value: "despesa", label: "Despesa", subcategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Outros"] },
  { value: "investimento", label: "Investimento", subcategories: ["Renda Fixa", "Ações", "Fundos", "Cripto", "Outros"] },
]

export function ImportTransactionsEditor({ documentId, documentName, onClose }: ImportTransactionsEditorProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [bulkCategory, setBulkCategory] = useState("")
  const [bulkSubcategory, setBulkSubcategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true)
      try {
        // Simulação - na prática viria da API
        const mockTransactions: Transaction[] = [
          {
            id: "1",
            date: "2026-01-15",
            description: "Pagamento Salário",
            amount: 5000,
            category: "receita",
            subcategory: "Salário",
            originalCategory: "receita",
            confidence: 0.95,
            documentId,
          },
          {
            id: "2",
            date: "2026-01-16",
            description: "Supermercado ABC",
            amount: -350.75,
            category: "despesa",
            subcategory: "Alimentação",
            originalCategory: "despesa",
            confidence: 0.88,
            documentId,
          },
          {
            id: "3",
            date: "2026-01-17",
            description: "Aluguel Apartamento",
            amount: -1200,
            category: "despesa",
            subcategory: "Moradia",
            originalCategory: "despesa",
            confidence: 0.92,
            documentId,
          },
          {
            id: "4",
            date: "2026-01-18",
            description: "Uber Viagem",
            amount: -45.50,
            category: "despesa",
            subcategory: "Transporte",
            originalCategory: "despesa",
            confidence: 0.85,
            documentId,
          },
          {
            id: "5",
            date: "2026-01-19",
            description: "Investimento CDB",
            amount: 1000,
            category: "investimento",
            subcategory: "Renda Fixa",
            originalCategory: "investimento",
            confidence: 0.90,
            documentId,
          },
        ]
        setTransactions(mockTransactions)
      } catch (error) {
        toast({
          title: "Erro ao carregar transações",
          description: "Não foi possível carregar as transações deste documento.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [documentId, toast])

  const saveTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
    try {
      // Simulação de API
      await new Promise((resolve) => setTimeout(resolve, 500))

      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, ...updates } : t))
      )

      toast({
        title: "Transação atualizada",
        description: "As alterações foram salvas com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    }
  }

  const refreshTransactions = async () => {
    setLoading(true)
    try {
      // Simulação - na prática viria da API
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2026-01-15",
          description: "Pagamento Salário",
          amount: 5000,
          category: "receita",
          subcategory: "Salário",
          originalCategory: "receita",
          confidence: 0.95,
          documentId,
        },
        {
          id: "2",
          date: "2026-01-16",
          description: "Supermercado ABC",
          amount: -350.75,
          category: "despesa",
          subcategory: "Alimentação",
          originalCategory: "despesa",
          confidence: 0.88,
          documentId,
        },
        {
          id: "3",
          date: "2026-01-17",
          description: "Aluguel Apartamento",
          amount: -1200,
          category: "despesa",
          subcategory: "Moradia",
          originalCategory: "despesa",
          confidence: 0.92,
          documentId,
        },
        {
          id: "4",
          date: "2026-01-18",
          description: "Uber Viagem",
          amount: -45.50,
          category: "despesa",
          subcategory: "Transporte",
          originalCategory: "despesa",
          confidence: 0.85,
          documentId,
        },
        {
          id: "5",
          date: "2026-01-19",
          description: "Investimento CDB",
          amount: 1000,
          category: "investimento",
          subcategory: "Renda Fixa",
          originalCategory: "investimento",
          confidence: 0.90,
          documentId,
        },
      ]
      setTransactions(mockTransactions)
      toast({
        title: "Transações atualizadas",
        description: "Lista de transações foi atualizada.",
      })
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as transações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveBulkChanges = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "Nenhuma transação selecionada",
        description: "Selecione as transações que deseja atualizar.",
        variant: "destructive",
      })
      return
    }

    if (!bulkCategory) {
      toast({
        title: "Categoria não selecionada",
        description: "Selecione uma categoria para aplicar em massa.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Simulação de API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setTransactions((prev) =>
        prev.map((t) =>
          selectedTransactions.includes(t.id)
            ? { ...t, category: bulkCategory, subcategory: bulkSubcategory }
            : t
        )
      )

      setSelectedTransactions([])
      setBulkCategory("")
      setBulkSubcategory("")

      toast({
        title: "Alterações salvas",
        description: `${selectedTransactions.length} transações atualizadas com sucesso.`,
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações em massa.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    )
  }

  const toggleAllSelections = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(filteredTransactions.map((t) => t.id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "bg-gray-100 text-gray-800"
    if (confidence >= 0.9) return "bg-green-100 text-green-800"
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return "N/A"
    if (confidence >= 0.9) return "Alta"
    if (confidence >= 0.7) return "Média"
    return "Baixa"
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || transaction.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Transações de: {documentName}</h3>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} transações encontradas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshTransactions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <Label>Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edição em Massa */}
      {selectedTransactions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Edição em Massa</CardTitle>
            <CardDescription>
              {selectedTransactions.length} transações selecionadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[150px]">
                <Label>Categoria</Label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {bulkCategory && (
                <div className="min-w-[150px]">
                  <Label>Subcategoria</Label>
                  <Select value={bulkSubcategory} onValueChange={setBulkSubcategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .find(cat => cat.value === bulkCategory)
                        ?.subcategories.map(sub => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button 
                onClick={saveBulkChanges} 
                disabled={saving || !bulkCategory}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Aplicar a {selectedTransactions.length} transações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transações</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                onCheckedChange={toggleAllSelections}
              />
              <Label className="text-sm">Selecionar todas</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedTransactions.includes(transaction.id)}
                  onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm font-medium truncate">{transaction.description}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <p className={`text-sm font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Categoria</Label>
                      <Select
                        value={transaction.category}
                        onValueChange={(value) => saveTransaction(transaction.id, { category: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1">
                      <Select
                        value={transaction.subcategory || ""}
                        onValueChange={(value) => saveTransaction(transaction.id, { subcategory: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .find(cat => cat.value === transaction.category)
                            ?.subcategories.map(sub => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getConfidenceColor(transaction.confidence)}>
                    {getConfidenceText(transaction.confidence)}
                  </Badge>
                  {transaction.originalCategory !== transaction.category && (
                    <Badge variant="outline" className="text-xs">
                      Modificado
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
