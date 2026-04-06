/**
 * Dashboard Inteligente - ETAPA 3
 * Baseado em dados reais + perfil da anamnese
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  Heart,
  Brain,
  Shield
} from "lucide-react"

interface DashboardConfig {
  userProfile: {
    name: string
    profileType: string
    riskLevel: string
    completedAt: string
  }
  realData: {
    totalIncome: number
    totalExpenses: number
    savingsRate: number
    transactionCount: number
    period: string
  }
  insights: {
    spendingPattern: any
    savingsAnalysis: any
    riskAlignment: any
    recommendations: string[]
    goalsProgress: any[]
  }
  healthScore: number
  configuredAt: string
}

export function SmartDashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardConfig()
  }, [])

  const loadDashboardConfig = async () => {
    try {
      const response = await fetch("/api/dashboard/profile-config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Carregando dashboard personalizado...</div>
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Dashboard Não Configurado</h3>
            <p className="text-muted-foreground mb-4">
              Preencha sua anamnese primeiro para ativar o dashboard personalizado.
            </p>
            <Button onClick={() => window.location.href = "/anamnesis"}>
              Preencher Anamnese
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return <Heart className="h-5 w-5 text-green-600" />
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Personalizado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Olá, {config.userProfile.name}!</h2>
          <p className="text-muted-foreground">
            Dashboard personalizado para seu perfil {config.userProfile.profileType}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          {config.userProfile.riskLevel}
        </Badge>
      </div>

      {/* Saúde Financeira */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHealthScoreIcon(config.healthScore)}
            Saúde Financeira
          </CardTitle>
          <CardDescription>
            Baseado no seu perfil e hábitos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pontuação</span>
            <span className={`text-sm font-bold ${getHealthScoreColor(config.healthScore)}`}>
              {config.healthScore}/100
            </span>
          </div>
          <Progress value={config.healthScore} className="mb-4" />
          <div className="text-sm text-muted-foreground">
            {config.healthScore >= 80 && "Excelente! Suas finanças estão muito saudáveis."}
            {config.healthScore >= 60 && config.healthScore < 80 && "Bom! Há espaço para melhorias."}
            {config.healthScore < 60 && "Atenção! Suas finanças precisam de cuidados."}
          </div>
        </CardContent>
      </Card>

      {/* Dados Reais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {config.realData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{config.realData.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {config.realData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{config.realData.period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Taxa de Poupança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {config.realData.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Ideal: {config.insights.savingsAnalysis.recommendedRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações Personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recomendações Personalizadas
          </CardTitle>
          <CardDescription>
            Baseadas no seu perfil e dados reais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progresso das Metas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progresso das Metas
          </CardTitle>
          <CardDescription>
            Baseado nos seus objetivos da anamnese
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config.insights.goalsProgress.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{goal.goal}</span>
                  <span className="text-sm text-muted-foreground">
                    {goal.estimatedProgress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={goal.estimatedProgress} />
                <div className="flex items-center gap-2">
                  {goal.onTrack ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {goal.onTrack ? "No caminho certo" : "Precisa de atenção"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Comportamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Padrão de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Maior categoria:</span>
                <span className="text-sm font-medium">{config.insights.spendingPattern.biggestCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor:</span>
                <span className="text-sm font-medium">
                  R$ {config.insights.spendingPattern.biggestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Seu padrão:</span>
                <Badge variant="outline">{config.insights.spendingPattern.pattern}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alinhamento de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Seu perfil:</span>
                <Badge variant="outline">{config.insights.riskAlignment.userProfile}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Exposição a risco:</span>
                <span className={`text-sm font-medium ${config.insights.riskAlignment.hasHighRiskExposure ? 'text-red-600' : 'text-green-600'}`}>
                  {config.insights.riskAlignment.hasHighRiskExposure ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Status:</span>
                <span className={`text-sm font-medium ${config.insights.riskAlignment.aligned ? 'text-green-600' : 'text-red-600'}`}>
                  {config.insights.riskAlignment.aligned ? 'Alinhado' : 'Desalinhado'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
