"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Brain,
  Calendar,
  DollarSign,
  PiggyBank,
  User,
  Shield,
  Zap
} from "lucide-react"
import { useProfileAdaptive } from "@/hooks/use-profile-adaptive"
import { cn } from "@/lib/utils"

export function AdaptiveStrategy() {
  const profileData = useProfileAdaptive()

  if (!profileData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { profile, incomeVariation, effectiveIncome, incomeAvg3m, incomeAvg6m, emergencyReserveMonths, profileCharacteristics } = profileData

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)
  }

  const getProfileIcon = () => {
    switch (profile) {
      case "stable": return <CheckCircle className="h-5 w-5 text-green-600" />
      case "variable": return <TrendingUp className="h-5 w-5 text-blue-600" />
      case "investor": return <TrendingUp className="h-5 w-5 text-purple-600" />
      default: return <User className="h-5 w-5 text-gray-600" />
    }
  }

  const getProfileColor = () => {
    switch (profile) {
      case "stable": return "bg-green-100 text-green-800"
      case "variable": return "bg-blue-100 text-blue-800"
      case "investor": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getProfileLabel = () => {
    switch (profile) {
      case "stable": return "Renda Estável"
      case "variable": return "Renda Variável"
      case "investor": return "Focado em Investimentos"
      default: return "Perfil não identificado"
    }
  }

  const getProfileDescription = () => {
    switch (profile) {
      case "stable": return "Sua renda é consistente e previsível. Ideal para planejamento de longo prazo."
      case "variable": return "Sua renda flutua ao longo do tempo. Requer reserva maior e planejamento adaptativo."
      case "investor": return "Você foca em crescimento de patrimônio. Requer gestão de risco e alocação estratégica."
      default: return "Analisando seu perfil financeiro..."
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Seu Perfil Financeiro
          </CardTitle>
          <CardDescription>
            Sistema adaptativo baseado na sua renda e comportamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getProfileIcon()}
              <div>
                <h3 className="font-semibold">{getProfileLabel()}</h3>
                <p className="text-sm text-muted-foreground">{getProfileDescription()}</p>
              </div>
            </div>
            <Badge className={getProfileColor()}>
              {incomeVariation > 0.3 ? "Alta Variação" : incomeVariation > 0.1 ? "Média Variação" : "Baixa Variação"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Renda Efetiva</p>
              <p className="text-lg font-semibold">{formatCurrency(effectiveIncome)}</p>
              <p className="text-xs text-muted-foreground">
                {profile === "variable" ? "Média 6 meses" : "Mês atual"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variação de Renda</p>
              <p className="text-lg font-semibold">{formatPercent(incomeVariation)}</p>
              <p className="text-xs text-muted-foreground">
                {incomeVariation > 0.3 ? "Volatilidade alta" : "Estável"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reserva Emergência</p>
              <p className="text-lg font-semibold">{emergencyReserveMonths} meses</p>
              <p className="text-xs text-muted-foreground">
                {profile === "variable" ? "Recomendado para renda variável" : "Padrão"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Characteristics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Foco Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profileCharacteristics.focus.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm capitalize">{item.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Riscos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profileCharacteristics.risks.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm capitalize">{item.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profileCharacteristics.recommendations.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm capitalize">{item.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adaptive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estratégia Adaptativa
          </CardTitle>
          <CardDescription>
            Recomendações personalizadas baseadas no seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile === "stable" && (
              <div className="p-4 border-l-4 border-l-green-500 bg-green-50/50">
                <h4 className="font-medium text-green-800 mb-2">Estratégia para Renda Estável</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Otimizar despesas para aumentar taxa de poupança</li>
                  <li>• Investir 25% da renda em carteira diversificada</li>
                  <li>• Planejar aposentadoria com renda previsível</li>
                  <li>• Criar fluxos de renda adicionais</li>
                </ul>
              </div>
            )}

            {profile === "variable" && (
              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50">
                <h4 className="font-medium text-blue-800 mb-2">Estratégia para Renda Variável</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Manter reserva de 12 meses de despesas</li>
                  <li>• Suavizar renda com múltiplas fontes</li>
                  <li>• Investir apenas excedente mensal</li>
                  <li>• Planejar em base trimestral, não mensal</li>
                </ul>
              </div>
            )}

            {profile === "investor" && (
              <div className="p-4 border-l-4 border-l-purple-500 bg-purple-50/50">
                <h4 className="font-medium text-purple-800 mb-2">Estratégia para Investidor</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Rebalancear carteira trimestralmente</li>
                  <li>• Manter alocação de ativos definida</li>
                  <li>• Diversificar entre classes de ativos</li>
                  <li>• Monitorar performance e risco</li>
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Sistema adaptativo aprende com seu comportamento financeiro
              </p>
              <Button variant="outline" size="sm">
                Ajustar Parâmetros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
