"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  Edit,
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  User,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AnamnesisData {
  id: string
  responses: any
  analysis: any
  profileType: string
  riskLevel: string
  createdAt: string
  updatedAt: string
}

export default function AnamnesisPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchAnamnesis = async () => {
    try {
      const response = await fetch("/api/user/anamnesis")
      const data = await response.json()

      if (data.exists) {
        setAnamnesis(data.anamnesis)
      }
    } catch (error) {
      console.error("Erro ao buscar anámnese:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar sua anámnese",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnamnesis()
  }, [])

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const response = await fetch("/api/user/anamnesis/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ anamnesis }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `anamnese-financeira-${new Date().toISOString().split("T")[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Sucesso",
          description: "Anámnese exportada com sucesso!",
        })
      } else {
        throw new Error("Erro ao exportar PDF")
      }
    } catch (error) {
      console.error("Erro ao exportar:", error)
      toast({
        title: "Erro",
        description: "Não foi possível exportar a anámnese",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const getProfileColor = (type: string) => {
    switch (type) {
      case "RECUPERACAO":
        return "bg-red-500"
      case "CONTROLE":
        return "bg-yellow-500"
      case "CRESCIMENTO":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CONSERVADOR":
        return "bg-blue-500"
      case "MODERADO":
        return "bg-orange-500"
      case "AGRESSIVO":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatResponseKey = (key: string) => {
    return key
      .split(/(?=[A-Z])/)
      .join(" ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!anamnesis) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Anámnese Não Encontrada</h1>
          <p className="text-muted-foreground mb-6">
            Você ainda não completou o formulário estratégico.
          </p>
          <Button
            onClick={() => router.push("/dashboard/profile/setup")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Completar Anámnese
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Minha Anámnese Financeira</h1>
            <p className="text-muted-foreground">
              Análise completa do seu perfil financeiro e estratégias personalizadas
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={exporting}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exportando..." : "Exportar PDF"}
            </Button>

            <Button
              onClick={() => router.push("/dashboard/profile/setup")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Perfil Principal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${getProfileColor(anamnesis.profileType)} text-white mb-2`}>
                {anamnesis.profileType}
              </Badge>
              <p className="text-sm text-gray-400">
                {anamnesis.profileType === "RECUPERACAO" &&
                  "Foco em recuperação financeira e controle de dívidas"}
                {anamnesis.profileType === "CONTROLE" &&
                  "Busca por organização e otimização financeira"}
                {anamnesis.profileType === "CRESCIMENTO" &&
                  "Foco em maximização de patrimônio e investimentos"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                Tolerância a Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${getRiskColor(anamnesis.riskLevel)} text-white mb-2`}>
                {anamnesis.riskLevel}
              </Badge>
              <p className="text-sm text-gray-400">
                {anamnesis.riskLevel === "CONSERVADOR" &&
                  "Prefere segurança com retornos moderados"}
                {anamnesis.riskLevel === "MODERADO" &&
                  "Aceita riscos calculados para melhores retornos"}
                {anamnesis.riskLevel === "AGRESSIVO" &&
                  "Busca altos retornos mesmo com risco elevado"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5" />
                Análise IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">Concluída</span>
              </div>
              <p className="text-sm text-gray-400">
                Análise inteligente com {anamnesis.analysis?.strategies?.length || 0} estratégias
                personalizadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com conteúdo detalhado */}
        <Tabs defaultValue="respostas" className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="respostas" className="data-[state=active]:bg-gray-800">
              Respostas
            </TabsTrigger>
            <TabsTrigger value="estrategias" className="data-[state=active]:bg-gray-800">
              Estratégias
            </TabsTrigger>
            <TabsTrigger value="recomendacoes" className="data-[state=active]:bg-gray-800">
              Recomendações
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-gray-800">
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Tab Respostas */}
          <TabsContent value="respostas">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Suas Respostas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(anamnesis.responses).map(([section, data]) => (
                  <div key={section}>
                    <h3 className="text-lg font-semibold mb-3 text-blue-400">
                      {formatResponseKey(section)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(data as any).map(([key, value]) => (
                        <div key={key} className="bg-gray-800 p-3 rounded">
                          <p className="text-sm text-gray-400 mb-1">{formatResponseKey(key)}</p>
                          <p className="text-white">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Estratégias */}
          <TabsContent value="estrategias">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Estratégias Personalizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anamnesis.analysis?.strategies?.map((strategy: any, index: number) => (
                    <div key={index} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{strategy.area}</h3>
                          <p className="text-gray-400 text-sm">{strategy.description}</p>
                        </div>
                        <Badge
                          className={
                            strategy.priority === "ALTA"
                              ? "bg-red-500"
                              : strategy.priority === "MÉDIA"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }
                        >
                          {strategy.priority}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-blue-400 mb-2">Ações:</p>
                          <ul className="space-y-1">
                            {strategy.actions?.map((action: string, i: number) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-green-400 mb-2">
                            Resultados Esperados:
                          </p>
                          <ul className="space-y-1">
                            {strategy.expectedResults?.map((result: string, i: number) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start">
                                <span className="text-green-500 mr-2">✓</span>
                                {result}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>⏱️ {strategy.timeframe}</span>
                          <span>📊 Complexidade: {strategy.complexity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Recomendações */}
          <TabsContent value="recomendacoes">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Recomendações Personalizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anamnesis.analysis?.recommendations?.map((rec: any, index: number) => (
                    <div key={index} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{rec.title}</h3>
                          <p className="text-gray-400 text-sm">{rec.description}</p>
                        </div>
                        <Badge
                          className={
                            rec.priority === "ALTA"
                              ? "bg-red-500"
                              : rec.priority === "MÉDIA"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-blue-400 mb-2">Benefícios:</p>
                          <ul className="space-y-1">
                            {rec.benefits?.map((benefit: string, i: number) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start">
                                <span className="text-blue-500 mr-2">+</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-green-400 mb-2">Implementação:</p>
                          <ul className="space-y-1">
                            {rec.implementation?.map((step: string, i: number) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start">
                                <span className="text-green-500 mr-2">{i + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Insights */}
          <TabsContent value="insights">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Insights Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anamnesis.analysis?.insights?.map((insight: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.impact === "POSITIVO"
                          ? "bg-green-900/20 border-green-800"
                          : insight.impact === "NEGATIVO"
                            ? "bg-red-900/20 border-red-800"
                            : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {insight.impact === "POSITIVO" && (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                        )}
                        {insight.impact === "NEGATIVO" && (
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
                        )}
                        {insight.impact === "NEUTRO" && (
                          <Brain className="w-5 h-5 text-gray-500 mt-1" />
                        )}

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{insight.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(insight.confidence * 100)}% confiança
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{insight.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>Categoria: {insight.category}</span>
                            <span>•</span>
                            <span>Impacto: {insight.impact}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Próximos Passos */}
        {anamnesis.analysis?.nextSteps && (
          <Card className="bg-gray-900 border-gray-800 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Plano de Ação - Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anamnesis.analysis.nextSteps.map((step: any, index: number) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {step.order}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.estimatedTime}
                        </span>
                        {step.dependencies.length > 0 && (
                          <span>Depende: {step.dependencies.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
