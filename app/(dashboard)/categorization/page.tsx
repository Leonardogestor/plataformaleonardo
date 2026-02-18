"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Brain, Plus, Trash2, ToggleLeft, ToggleRight, TrendingUp, Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CategoryRule {
  id: string
  pattern: string
  category: string
  matchCount: number
  isActive: boolean
  conditionJson: string | null
}

interface CategorizationMetrics {
  totalTransacoes: number
  cobertasPorRegra: number
  taxaErroCategorizacao: number
  indiceInteligenciaSistema: number
  outrosCount: number
  regrasAtivas: number
}

interface Suggestion {
  pattern: string
  suggestedCategory: string
  count: number
  confidence: number
}

export default function CategorizationPage() {
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [metrics, setMetrics] = useState<CategorizationMetrics | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [newPattern, setNewPattern] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showConditions, setShowConditions] = useState(false)
  const [condType, setCondType] = useState<string>("")
  const [condAmountMin, setCondAmountMin] = useState("")
  const [condAmountMax, setCondAmountMax] = useState("")
  const [condRegex, setCondRegex] = useState("")
  const { toast } = useToast()

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch("/api/categorization/rules")
      if (response.ok) {
        const data = await response.json()
        setRules(data)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as regras",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/categorization/analytics")
      if (res.ok) setMetrics(await res.json())
    } catch {}
  }, [])

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const res = await fetch("/api/categorization/suggestions")
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      }
    } catch {
      toast({ title: "Erro ao carregar sugestões", variant: "destructive" })
    } finally {
      setSuggestionsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchRules()
    fetchMetrics()
  }, [fetchRules, fetchMetrics])

  const buildCondition = () => {
    const c: { type?: string; amountMin?: number; amountMax?: number; descriptionRegex?: string } = {}
    if (condType) c.type = condType
    const min = parseFloat(condAmountMin)
    const max = parseFloat(condAmountMax)
    if (!Number.isNaN(min)) c.amountMin = min
    if (!Number.isNaN(max)) c.amountMax = max
    if (condRegex.trim()) c.descriptionRegex = condRegex.trim()
    return Object.keys(c).length > 0 ? c : undefined
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPattern || !newCategory) return

    try {
      const body: { pattern: string; category: string; condition?: object } = {
        pattern: newPattern,
        category: newCategory,
      }
      const condition = buildCondition()
      if (condition) body.condition = condition

      const response = await fetch("/api/categorization/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({ title: "Regra criada!", description: "A regra foi adicionada com sucesso" })
        setNewPattern("")
        setNewCategory("")
        setCondType("")
        setCondAmountMin("")
        setCondAmountMax("")
        setCondRegex("")
        fetchRules()
        fetchMetrics()
        setSuggestions((prev) => prev.filter((s) => s.pattern !== newPattern.toLowerCase()))
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Falha ao criar")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível criar a regra",
        variant: "destructive",
      })
    }
  }

  const handleAddSuggestion = async (s: Suggestion) => {
    try {
      const res = await fetch("/api/categorization/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: s.pattern,
          category: s.suggestedCategory,
        }),
      })
      if (res.ok) {
        toast({ title: "Regra adicionada a partir da sugestão" })
        fetchRules()
        fetchMetrics()
        setSuggestions((prev) => prev.filter((x) => x.pattern !== s.pattern))
      } else throw new Error()
    } catch {
      toast({ title: "Erro ao adicionar regra", variant: "destructive" })
    }
  }

  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/categorization/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (response.ok) {
        fetchRules()
        fetchMetrics()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a regra",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return
    try {
      const response = await fetch(`/api/categorization/rules/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Regra excluída!" })
        fetchRules()
        fetchMetrics()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a regra",
        variant: "destructive",
      })
    }
  }

  const formatCondition = (json: string | null) => {
    if (!json?.trim()) return "—"
    try {
      const c = JSON.parse(json) as { type?: string; amountMin?: number; amountMax?: number; descriptionRegex?: string }
      const parts: string[] = []
      if (c.type) parts.push(`Tipo: ${c.type}`)
      if (c.amountMin != null) parts.push(`Valor ≥ ${c.amountMin}`)
      if (c.amountMax != null) parts.push(`Valor ≤ ${c.amountMax}`)
      if (c.descriptionRegex) parts.push(`Regex`)
      return parts.length ? parts.join(" · ") : "—"
    } catch {
      return "—"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categorização Inteligente</h1>
        <p className="text-muted-foreground">Gerencie as regras de categorização automática</p>
      </div>

      {/* Métricas: taxa de erro e índice de inteligência */}
      {metrics != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Métricas de categorização
            </CardTitle>
            <CardDescription>
              Taxa de erro e índice de inteligência do sistema com base nas suas transações e regras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Taxa de erro</p>
                <p className="text-2xl font-semibold">{metrics.taxaErroCategorizacao}%</p>
                <p className="text-xs text-muted-foreground">
                  Transações não cobertas por nenhuma regra
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Índice inteligência</p>
                <p className="text-2xl font-semibold">{metrics.indiceInteligenciaSistema}</p>
                <p className="text-xs text-muted-foreground">0–100 (cobertura + regras + uso)</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Cobertura</p>
                <p className="text-2xl font-semibold">
                  {metrics.totalTransacoes > 0
                    ? Math.round((metrics.cobertasPorRegra / metrics.totalTransacoes) * 100)
                    : 0}
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics.cobertasPorRegra} / {metrics.totalTransacoes} transações
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Regras ativas</p>
                <p className="text-2xl font-semibold">{metrics.regrasAtivas}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.outrosCount} em &quot;Outros&quot;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Como Funciona
          </CardTitle>
          <CardDescription>
            O sistema aprende automaticamente quando você categoriza transações. Você pode usar
            regras condicionais (tipo, valor mínimo/máximo, regex na descrição) para refinar o match.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Exemplo condicional:</strong> Padrão &quot;uber&quot; + tipo
              &quot;EXPENSE&quot; + valor entre 10 e 100 → Transporte.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sugestões automáticas baseadas em histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Sugestões automáticas
          </CardTitle>
          <CardDescription>
            Baseadas no padrão histórico: descrições que costumam ter a mesma categoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestions}
            disabled={suggestionsLoading}
            className="mb-3"
          >
            {suggestionsLoading ? "Carregando…" : "Atualizar sugestões"}
          </Button>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sugestão no momento. Categorize mais transações e clique em &quot;Atualizar
              sugestões&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li
                  key={s.pattern}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                >
                  <span className="font-mono">{s.pattern}</span>
                  <span className="text-muted-foreground">→ {s.suggestedCategory}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.count} transações · {(s.confidence * 100).toFixed(0)}% confiança
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => handleAddSuggestion(s)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar regra
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova Regra</CardTitle>
          <CardDescription>
            Padrão (contém na descrição) + categoria. Opcional: condições (tipo, valor, regex).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[140px] space-y-2">
                <Label htmlFor="pattern">Padrão (palavra-chave)</Label>
                <Input
                  id="pattern"
                  placeholder="Ex: uber, ifood, netflix"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[140px] space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  placeholder="Ex: Transporte, Alimentação"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConditions(!showConditions)}
              >
                {showConditions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Regras condicionais (opcional)
              </Button>
              {showConditions && (
                <div className="mt-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select value={condType || "all"} onValueChange={(v) => setCondType(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer</SelectItem>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                        <SelectItem value="INCOME">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Valor mínimo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 0"
                      value={condAmountMin}
                      onChange={(e) => setCondAmountMin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Valor máximo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1000"
                      value={condAmountMax}
                      onChange={(e) => setCondAmountMax(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Regex na descrição (opcional)</Label>
                    <Input
                      placeholder="Ex: ^UBER"
                      value={condRegex}
                      onChange={(e) => setCondRegex(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas</CardTitle>
          <CardDescription>{rules.filter((r) => r.isActive).length} regras ativas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma regra cadastrada. Use as sugestões automáticas ou adicione manualmente.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Padrão</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono">{rule.pattern}</TableCell>
                      <TableCell className="font-medium">{rule.category}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={formatCondition(rule.conditionJson)}>
                        {formatCondition(rule.conditionJson)}
                      </TableCell>
                      <TableCell>{rule.matchCount}x</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            rule.isActive
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(rule.id, rule.isActive)}
                          >
                            {rule.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
