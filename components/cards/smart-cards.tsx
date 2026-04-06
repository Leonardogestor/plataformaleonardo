/**
 * Componente de Cartões conectado com Anamnese
 * ETAPA 4: Fluxo conectado
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Shield,
  Target,
  Lightbulb,
  PieChart
} from "lucide-react"

interface CardData {
  id: string
  name: string
  limit: number
  usedLimit: number
  closingDay: number
  dueDay: number
  brand: string
}

interface CardsConfig {
  userProfile: {
    name: string
    profileType: string
    riskLevel: string
  }
  cards: CardData[]
  analysis: {
    cardCount: number
    totalLimit: number
    totalUsed: number
    limitUsage: number
    avgTransaction: number
    profileAlignment: {
      hasExpectedCardCount: boolean
      installmentFrequencyMatches: boolean
      riskAlignment: boolean
      spendingPattern: any
    }
    riskLevel: string
  }
  recommendations: string[]
  transactionsCount: number
  configuredAt: string
}

export function SmartCards() {
  const [config, setConfig] = useState<CardsConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCardsConfig()
  }, [])

  const loadCardsConfig = async () => {
    try {
      const response = await fetch("/api/cards/anamnesis-config")
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de cartões:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Carregando análise de cartões...</div>
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Análise Não Disponível</h3>
            <p className="text-muted-foreground mb-4">
              Preencha sua anamnese primeiro para ativar a análise inteligente de cartões.
            </p>
            <Button onClick={() => window.location.href = "/anamnesis"}>
              Preencher Anamnese
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRÍTICO": return "text-red-600"
      case "ALTO": return "text-orange-600"
      case "MODERADO": return "text-yellow-600"
      case "BAIXO": return "text-green-600"
      default: return "text-blue-600"
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "CRÍTICO": return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "ALTO": return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "MODERADO": return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default: return <CheckCircle className="h-4 w-4 text-green-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Personalizado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise de Cartões</h2>
          <p className="text-muted-foreground">
            Baseado no seu perfil {config.userProfile.profileType}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          {config.userProfile.riskLevel}
        </Badge>
      </div>

      {/* Análise Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Análise Geral de Uso
          </CardTitle>
          <CardDescription>
            Baseado no seu perfil e comportamento financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Cartões</div>
              <div className="text-2xl font-bold">{config.analysis.cardCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Limite Total</div>
              <div className="text-2xl font-bold text-green-600">
                R$ {config.analysis.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Utilizado</div>
              <div className="text-2xl font-bold text-orange-600">
                R$ {config.analysis.totalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Uso do Limite</div>
              <div className={`text-2xl font-bold ${getRiskColor(config.analysis.riskLevel)}`}>
                {config.analysis.limitUsage.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uso do Limite</span>
              <span className={`text-sm font-bold ${getRiskColor(config.analysis.riskLevel)}`}>
                {config.analysis.limitUsage.toFixed(1)}%
              </span>
            </div>
            <Progress value={config.analysis.limitUsage} className="mb-2" />
            <div className="flex items-center gap-2">
              {getRiskIcon(config.analysis.riskLevel)}
              <span className="text-sm text-muted-foreground">
                Nível de risco: {config.analysis.riskLevel}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alinhamento com Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Alinhamento com seu Perfil
          </CardTitle>
          <CardDescription>
            Comparação entre suas respostas na anamnese e uso real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Número de cartões</span>
              </div>
              <div className="flex items-center gap-2">
                {config.analysis.profileAlignment.hasExpectedCardCount ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm">
                  {config.analysis.profileAlignment.hasExpectedCardCount ? "Alinhado" : "Desalinhado"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Uso de limite vs perfil</span>
              </div>
              <div className="flex items-center gap-2">
                {config.analysis.profileAlignment.riskAlignment ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {config.analysis.profileAlignment.riskAlignment ? "Adequado" : "Atenção"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Padrão de gastos</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {config.analysis.profileAlignment.spendingPattern.handling}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {config.analysis.profileAlignment.spendingPattern.isAligned ? "✓" : "!"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendações Personalizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recomendações Personalizadas
          </CardTitle>
          <CardDescription>
            Baseadas no seu perfil e uso real dos cartões
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

      {/* Lista de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.cards.map((card) => (
          <Card key={card.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {card.name}
              </CardTitle>
              <Badge variant="outline">{card.brand}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Limite:</span>
                  <span className="text-sm font-medium">
                    R$ {card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Utilizado:</span>
                  <span className="text-sm font-medium text-orange-600">
                    R$ {card.usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Uso:</span>
                  <span className="text-sm font-medium">
                    {((card.usedLimit / card.limit) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={(card.usedLimit / card.limit) * 100} className="mt-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fechamento: {card.closingDay}</span>
                  <span>Vencimento: {card.dueDay}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
