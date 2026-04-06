/**
 * Componente de Metas conectado com Anamnese
 * ETAPA 4: Fluxo conectado
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Target, 
  TrendingUp, 
  Calendar,
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Lightbulb,
  Star,
  Flag
} from "lucide-react"

interface GoalProgress {
  real: number
  projected: number
  monthlySavings: number
  monthsRemaining: number
  onTrack: boolean
}

interface GoalViability {
  viability: string
  factors: string[]
}

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: string
  priority: string
  status: string
  progress: GoalProgress
  viability: GoalViability
}

interface GoalsConfig {
  userProfile: {
    name: string
    profileType: string
    riskLevel: string
  }
  goals: Goal[]
  recommendations: string[]
  anamnesisGoals: string[]
  syncedAt: string
}

export function SmartGoals() {
  const [config, setConfig] = useState<GoalsConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGoalsConfig()
  }, [])

  const loadGoalsConfig = async () => {
    try {
      const response = await fetch("/api/goals/anamnesis-goals")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Erro ao carregar metas:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Carregando metas inteligentes...</div>
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Metas Não Disponíveis</h3>
            <p className="text-muted-foreground mb-4">
              Preencha sua anamnese primeiro para ativar as metas inteligentes.
            </p>
            <Button onClick={() => window.location.href = "/anamnesis"}>
              Preencher Anamnese
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getViabilityColor = (viability: string) => {
    switch (viability) {
      case "FÁCIL": return "text-green-600"
      case "POSSÍVEL": return "text-blue-600"
      case "DESAFIADOR": return "text-yellow-600"
      case "DIFÍCIL": return "text-orange-600"
      case "MUITO DIFÍCIL": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  const getViabilityIcon = (viability: string) => {
    switch (viability) {
      case "FÁCIL": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "POSSÍVEL": return <CheckCircle className="h-4 w-4 text-blue-600" />
      case "DESAFIADOR": return <Clock className="h-4 w-4 text-yellow-600" />
      case "DIFÍCIL": return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "MUITO DIFÍCIL": return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-800"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800"
      case "LOW": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const onTrackGoals = config.goals.filter(g => g.progress.onTrack).length
  const totalGoals = config.goals.length

  return (
    <div className="space-y-6">
      {/* Cabeçalho Personalizado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Minhas Metas</h2>
          <p className="text-muted-foreground">
            {onTrackGoals} de {totalGoals} metas no caminho certo
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Star className="h-3 w-3" />
          {config.userProfile.profileType}
        </Badge>
      </div>

      {/* Resumo das Metas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Resumo das Metas
          </CardTitle>
          <CardDescription>
            Progresso geral baseado nas metas da sua anamnese
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total de Metas</div>
              <div className="text-2xl font-bold">{totalGoals}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">No Caminho</div>
              <div className="text-2xl font-bold text-green-600">{onTrackGoals}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Precisam Atenção</div>
              <div className="text-2xl font-bold text-orange-600">{totalGoals - onTrackGoals}</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm font-bold">
                {totalGoals > 0 ? Math.round((onTrackGoals / totalGoals) * 100) : 0}%
              </span>
            </div>
            <Progress value={totalGoals > 0 ? (onTrackGoals / totalGoals) * 100 : 0} />
          </div>
        </CardContent>
      </Card>

      {/* Metas da Anamnese */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Metas da sua Anamnese
          </CardTitle>
          <CardDescription>
            Metas que você definiu na anamnese e foram sincronizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {config.anamnesisGoals.map((goal, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{goal}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Metas Detalhadas */}
      <div className="space-y-4">
        {config.goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{goal.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(goal.priority)}>
                    {goal.priority}
                  </Badge>
                  <Badge variant="outline">{goal.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progresso Real vs Projetado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progresso Real</span>
                      <span className="text-sm font-bold">{goal.progress.real.toFixed(1)}%</span>
                    </div>
                    <Progress value={goal.progress.real} />
                    <div className="text-xs text-muted-foreground mt-1">
                      R$ {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progresso Projetado</span>
                      <span className="text-sm font-bold">{goal.progress.projected.toFixed(1)}%</span>
                    </div>
                    <Progress value={goal.progress.projected} />
                    <div className="text-xs text-muted-foreground mt-1">
                      Baseado na sua taxa de poupança atual
                    </div>
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Prazo: {goal.progress.monthsRemaining} meses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Economia mensal: R$ {goal.progress.monthlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.progress.onTrack ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span>{goal.progress.onTrack ? "No caminho" : "Precisa atenção"}</span>
                  </div>
                </div>

                {/* Viabilidade */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getViabilityIcon(goal.viability.viability)}
                    <span className="text-sm font-medium">Viabilidade:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getViabilityColor(goal.viability.viability)}`}>
                      {goal.viability.viability}
                    </span>
                  </div>
                </div>

                {/* Fatores de Viabilidade */}
                {goal.viability.factors.length > 0 && (
                  <div className="space-y-1">
                    {goal.viability.factors.map((factor, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {factor}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recomendações Personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recomendações para suas Metas
          </CardTitle>
          <CardDescription>
            Baseadas no seu perfil, progresso atual e viabilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
