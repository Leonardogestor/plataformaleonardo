"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Target, TrendingUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalCard } from "@/components/goals/goal-card"
import { GoalDialog } from "@/components/goals/goal-dialog"
import { ContributionDialog } from "@/components/goals/contribution-dialog"
import { SimuladorAceleracao } from "@/components/goals/simulador-aceleracao"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalsSkeleton } from "@/components/ui/loading-skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface Goal {
  id: string
  name: string
  description?: string | null
  targetAmount: string
  currentAmount: string
  deadline: string
  category: string
  status: string
  progress: number
  daysRemaining: number
  monthlyTarget: number
  remaining: number
  contributions?: Array<{ id: string; amount: number; date: string }>
  evolution?: { month: string; cumulative: number }[]
}

interface GoalsAnalytics {
  classificacao_estrategica: { goalId: string; classificacao: string }[]
  impacto_no_patrimonio: { totalComprometido: number; percentualPatrimonio: number; patrimonioLiquido: number }
  conflito_entre_metas: {
    conflito: boolean
    totalNecessarioMensal: number
    disponivelMensal: number
    deficit: number
    metasEmConflito: { goalId: string; name: string; monthlyTarget: number }[]
  }
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [analytics, setAnalytics] = useState<GoalsAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null)
  const { toast } = useToast()

  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    try {
      const [goalsRes, analyticsRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/goals/analytics"),
      ])
      if (goalsRes.ok) {
        const data = await goalsRes.json()
        setGoals(data)
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as metas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return

    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Meta excluída!", description: "A meta foi removida com sucesso" })
        fetchGoals()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a meta",
        variant: "destructive",
      })
    }
  }

  const handleContribute = (goal: Goal) => {
    setContributionGoal(goal)
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setEditingGoal(null)
    setContributionGoal(null)
    fetchGoals()
  }

  const activeGoals = goals.filter((g) => g.status === "ACTIVE")
  const completedGoals = goals.filter((g) => g.status === "COMPLETED")
  const pausedGoals = goals.filter((g) => g.status === "PAUSED")
  const classificacaoMap = analytics?.classificacao_estrategica
    ? new Map(analytics.classificacao_estrategica.map((c) => [c.goalId, c.classificacao]))
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Metas Financeiras</h2>
          <p className="text-muted-foreground">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impacto no patrimônio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(analytics.impacto_no_patrimonio.totalComprometido)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Comprometido com metas · {analytics.impacto_no_patrimonio.percentualPatrimonio.toFixed(1)}% do patrimônio líquido
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflito entre metas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analytics.conflito_entre_metas.conflito ? (
                <>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">Conflito detectado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Necessário {formatCurrency(analytics.conflito_entre_metas.totalNecessarioMensal)}/mês · 
                    Disponível {formatCurrency(analytics.conflito_entre_metas.disponivelMensal)}/mês · 
                    Déficit {formatCurrency(analytics.conflito_entre_metas.deficit)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Sem conflito</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aporte necessário {formatCurrency(analytics.conflito_entre_metas.totalNecessarioMensal)}/mês · 
                    Disponível {formatCurrency(analytics.conflito_entre_metas.disponivelMensal)}/mês
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <SimuladorAceleracao
        goals={activeGoals.map((g) => ({
          id: g.id,
          name: g.name,
          monthlyTarget: g.monthlyTarget,
          remaining: g.remaining,
        }))}
      />

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Ativas ({activeGoals.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({completedGoals.length})</TabsTrigger>
          <TabsTrigger value="paused">Pausadas ({pausedGoals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <GoalsSkeleton />
          ) : activeGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta ativa"
              description="Defina suas primeiras metas financeiras e acompanhe seu progresso rumo aos seus objetivos."
              action={{
                label: "Criar primeira meta",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  classificacaoEstrategica={classificacaoMap?.get(goal.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onContribute={handleContribute}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta concluída"
              description="Continue trabalhando nas suas metas ativas. Suas conquistas aparecerão aqui quando você atingir 100% do objetivo."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  classificacaoEstrategica={classificacaoMap?.get(goal.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onContribute={handleContribute}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paused" className="space-y-4">
          {pausedGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta pausada"
              description="Todas as suas metas estão ativas ou concluídas."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pausedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  classificacaoEstrategica={classificacaoMap?.get(goal.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onContribute={handleContribute}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GoalDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingGoal(null)
        }}
        goal={editingGoal}
        onSuccess={handleSuccess}
      />

      <ContributionDialog
        open={!!contributionGoal}
        onOpenChange={(open) => {
          if (!open) setContributionGoal(null)
        }}
        goal={contributionGoal}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
