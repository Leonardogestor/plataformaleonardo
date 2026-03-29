"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Brain, Target, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StrategicForm {
  financialContext: {
    incomeType: string
    financialSituation: string
    hasDebts: string
  }
  lifeMoment: {
    careerStage: string
    hasDependents: boolean
  }
  financialBehavior: {
    moneyHandling: string
    trackingFrequency: string
    moneyPriority: string
  }
  riskProfile: {
    investmentProfile: string
    lossReaction: string
  }
  objectives: {
    goals: string[]
    hasGoals: boolean
  }
  dataImport: {
    statementReceipt: string
    preferredFormat: string
  }
  budgetControl: {
    spendingPattern: string
    budgetHandling: string
  }
  cardsInstallments: {
    cardCount: string
    installmentFrequency: string
  }
  executionCapacity: {
    willingnessToAdjust: string
    growthPreference: string
    commitmentLevel: number[]
  }
  futureExpectation: {
    incomeTrend: string
  }
  knowledgeExperience: {
    investmentKnowledge: string
    investmentTime: string
  }
}

export default function StrategicSetup() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<StrategicForm>>({})

  const totalSteps = 7

  const updateFormData = (section: keyof StrategicForm, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Validação final
      if (!formData.objectives?.goals?.length) {
        toast({
          title: "Atenção",
          description: "Selecione pelo menos um objetivo financeiro",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch("/api/user/anamnesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar anámnese")
      }

      const result = await response.json()

      toast({
        title: "Sucesso!",
        description: "Sua anámnese foi analisada e estratégias personalizadas foram geradas."
      })

      // Redirecionar para página de resultados
      setTimeout(() => {
        router.push("/dashboard/profile/anamnesis")
      }, 2000)

    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua anámnese",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-6 w-6 text-blue-500" />
                Contexto Financeiro Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Sua renda mensal é:</Label>
                <RadioGroup
                  value={formData.financialContext?.incomeType || ""}
                  onValueChange={(value) => updateFormData("financialContext", "incomeType", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FIXA" id="fixa" className="text-blue-500" />
                    <Label htmlFor="fixa" className="text-gray-300">Fixa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="VARIÁVEL" id="variavel" className="text-blue-500" />
                    <Label htmlFor="variavel" className="text-gray-300">Variável</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MISTA" id="mista" className="text-blue-500" />
                    <Label htmlFor="mista" className="text-gray-300">Mista</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Hoje, você diria que sua situação financeira está:</Label>
                <RadioGroup
                  value={formData.financialContext?.financialSituation || ""}
                  onValueChange={(value) => updateFormData("financialContext", "financialSituation", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ORGANIZADA" id="organizada" className="text-green-500" />
                    <Label htmlFor="organizada" className="text-gray-300">Organizada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DESORGANIZADA" id="desorganizada" className="text-yellow-500" />
                    <Label htmlFor="desorganizada" className="text-gray-300">Desorganizada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CRÍTICA" id="critica" className="text-red-500" />
                    <Label htmlFor="critica" className="text-gray-300">Crítica</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Você possui dívidas atualmente?</Label>
                <RadioGroup
                  value={formData.financialContext?.hasDebts || ""}
                  onValueChange={(value) => updateFormData("financialContext", "hasDebts", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NÃO" id="nao" className="text-green-500" />
                    <Label htmlFor="nao" className="text-gray-300">Não</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SIM_CONTROLE" id="sim_controle" className="text-yellow-500" />
                    <Label htmlFor="sim_controle" className="text-gray-300">Sim, sob controle</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SIM_PREOCUPANTE" id="sim_preocupante" className="text-red-500" />
                    <Label htmlFor="sim_preocupante" className="text-gray-300">Sim, preocupante</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="h-6 w-6 text-purple-500" />
                Momento de Vida e Comportamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Qual melhor descreve seu momento atual?</Label>
                <RadioGroup
                  value={formData.lifeMoment?.careerStage || ""}
                  onValueChange={(value) => updateFormData("lifeMoment", "careerStage", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INÍCIO_CARREIRA" id="inicio" className="text-blue-500" />
                    <Label htmlFor="inicio" className="text-gray-300">Início de carreira</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CRESCIMENTO_PROFISSIONAL" id="crescimento" className="text-green-500" />
                    <Label htmlFor="crescimento" className="text-gray-300">Crescimento profissional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ESTÁVEL" id="estavel" className="text-yellow-500" />
                    <Label htmlFor="estavel" className="text-gray-300">Estável</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TRANSIÇÃO" id="transicao" className="text-orange-500" />
                    <Label htmlFor="transicao" className="text-gray-300">Transição / incerteza</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dependents"
                  checked={formData.lifeMoment?.hasDependents || false}
                  onCheckedChange={(checked) => updateFormData("lifeMoment", "hasDependents", checked)}
                />
                <Label htmlFor="dependents" className="text-gray-300">
                  Você possui dependentes financeiros?
                </Label>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Como você lida com dinheiro hoje?</Label>
                <RadioGroup
                  value={formData.financialBehavior?.moneyHandling || ""}
                  onValueChange={(value) => updateFormData("financialBehavior", "moneyHandling", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PLANEJA_ANTES" id="planeja" className="text-green-500" />
                    <Label htmlFor="planeja" className="text-gray-300">Planejo antes de gastar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TENTA_CONTROLAR" id="tenta" className="text-yellow-500" />
                    <Label htmlFor="tenta" className="text-gray-300">Tento controlar, mas às vezes perco</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="GASTA_SEM_PLANEJAR" id="gasta" className="text-red-500" />
                    <Label htmlFor="gasta" className="text-gray-300">Gasto sem planejamento</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Com que frequência você acompanha suas finanças?</Label>
                <RadioGroup
                  value={formData.financialBehavior?.trackingFrequency || ""}
                  onValueChange={(value) => updateFormData("financialBehavior", "trackingFrequency", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TODA_SEMANA" id="semana" className="text-green-500" />
                    <Label htmlFor="semana" className="text-gray-300">Toda semana</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MENSAL" id="mes" className="text-yellow-500" />
                    <Label htmlFor="mes" className="text-gray-300">Uma vez por mês</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RARAMENTE" id="raramente" className="text-red-500" />
                    <Label htmlFor="raramente" className="text-gray-300">Raramente</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-orange-500" />
                Relação com Risco e Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Em investimentos, você se considera:</Label>
                <RadioGroup
                  value={formData.riskProfile?.investmentProfile || ""}
                  onValueChange={(value) => updateFormData("riskProfile", "investmentProfile", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CONSERVADOR" id="conservador" className="text-blue-500" />
                    <Label htmlFor="conservador" className="text-gray-300">Conservador</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MODERADO" id="moderado" className="text-yellow-500" />
                    <Label htmlFor="moderado" className="text-gray-300">Moderado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="AGRESSIVO" id="agressivo" className="text-red-500" />
                    <Label htmlFor="agressivo" className="text-gray-300">Agressivo</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Como você reage a perdas financeiras?</Label>
                <RadioGroup
                  value={formData.riskProfile?.lossReaction || ""}
                  onValueChange={(value) => updateFormData("riskProfile", "lossReaction", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EVITA_RISCO" id="evita" className="text-blue-500" />
                    <Label htmlFor="evita" className="text-gray-300">Evito riscos ao máximo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ACEITA_MODERADAS" id="aceita" className="text-yellow-500" />
                    <Label htmlFor="aceita" className="text-gray-300">Aceito perdas moderadas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BUSCA_RETORNO_RISCO" id="busca" className="text-red-500" />
                    <Label htmlFor="busca" className="text-gray-300">Busco retorno mesmo com risco alto</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Quais são seus principais objetivos hoje?</Label>
                <div className="space-y-2">
                  {[
                    "Sair das dívidas",
                    "Criar reserva de emergência",
                    "Comprar imóvel",
                    "Comprar carro",
                    "Viajar",
                    "Aposentadoria",
                    "Independência financeira",
                    "Aumentar patrimônio",
                    "Não tenho planos"
                  ].map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={formData.objectives?.goals?.includes(goal) || false}
                        onCheckedChange={(checked) => {
                          const goals = formData.objectives?.goals || []
                          if (checked) {
                            updateFormData("objectives", "goals", [...goals, goal])
                          } else {
                            updateFormData("objectives", "goals", goals.filter((g: string) => g !== goal))
                          }
                        }}
                      />
                      <Label htmlFor={goal} className="text-gray-300">
                        {goal}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="h-6 w-6 text-cyan-500" />
                Importação de Dados e Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Como você recebe seus extratos hoje?</Label>
                <RadioGroup
                  value={formData.dataImport?.statementReceipt || ""}
                  onValueChange={(value) => updateFormData("dataImport", "statementReceipt", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PDF_EMAIL" id="pdf_email" className="text-blue-500" />
                    <Label htmlFor="pdf_email" className="text-gray-300">PDF por email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXCEL_BANCO" id="excel_banco" className="text-green-500" />
                    <Label htmlFor="excel_banco" className="text-gray-300">Excel do banco</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="APP_ACESSO" id="app" className="text-yellow-500" />
                    <Label htmlFor="app" className="text-gray-300">Acesso ao app</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PAPEL_IMPRESSO" id="papel" className="text-red-500" />
                    <Label htmlFor="papel" className="text-gray-300">Papel impresso</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Qual formato você mais recebe?</Label>
                <RadioGroup
                  value={formData.dataImport?.preferredFormat || ""}
                  onValueChange={(value) => updateFormData("dataImport", "preferredFormat", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PDF" id="pdf" className="text-blue-500" />
                    <Label htmlFor="pdf" className="text-gray-300">PDF</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXCEL_CSV" id="excel" className="text-green-500" />
                    <Label htmlFor="excel" className="text-gray-300">Excel/CSV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="IMAGENS" id="imagens" className="text-yellow-500" />
                    <Label htmlFor="imagens" className="text-gray-300">Imagens</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PAPEL" id="papel_format" className="text-red-500" />
                    <Label htmlFor="papel_format" className="text-gray-300">Papel</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Seus gastos costumam ser:</Label>
                <RadioGroup
                  value={formData.budgetControl?.spendingPattern || ""}
                  onValueChange={(value) => updateFormData("budgetControl", "spendingPattern", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MUITO_PREVISÍVEL" id="previsivel" className="text-green-500" />
                    <Label htmlFor="previsivel" className="text-gray-300">Muito previsíveis (sempre parecidos)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MODERADAMENTE_PREVISÍVEL" id="moderado" className="text-yellow-500" />
                    <Label htmlFor="moderado" className="text-gray-300">Moderadamente previsíveis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="IMPREVISÍVEL" id="imprevisivel" className="text-red-500" />
                    <Label htmlFor="imprevisivel" className="text-gray-300">Imprevisíveis (variam muito)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Como você lida com orçamentos?</Label>
                <RadioGroup
                  value={formData.budgetControl?.budgetHandling || ""}
                  onValueChange={(value) => updateFormData("budgetControl", "budgetHandling", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SEGUE_RIGOROSAMENTE" id="segue" className="text-green-500" />
                    <Label htmlFor="segue" className="text-gray-300">Sigo rigorosamente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="GUIA_FLEXÍVEL" id="guia" className="text-yellow-500" />
                    <Label htmlFor="guia" className="text-gray-300">Uso como guia, mas flexível</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CRIA_NÃO_SEGUE" id="cria" className="text-orange-500" />
                    <Label htmlFor="cria" className="text-gray-300">Crio mas não sigo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NÃO_FAZ_ORÇAMENTO" id="nao_faz" className="text-red-500" />
                    <Label htmlFor="nao_faz" className="text-gray-300">Não faço orçamento</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                Cartões e Capacidade de Execução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Quantos cartões de crédito você usa?</Label>
                <RadioGroup
                  value={formData.cardsInstallments?.cardCount || ""}
                  onValueChange={(value) => updateFormData("cardsInstallments", "cardCount", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="0-1" id="zero_um" className="text-green-500" />
                    <Label htmlFor="zero_um" className="text-gray-300">0-1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2-3" id="dois_tres" className="text-yellow-500" />
                    <Label htmlFor="dois_tres" className="text-gray-300">2-3</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4-5" id="quatro_cinco" className="text-orange-500" />
                    <Label htmlFor="quatro_cinco" className="text-gray-300">4-5</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="+5" id="mais_cinco" className="text-red-500" />
                    <Label htmlFor="mais_cinco" className="text-gray-300">+5</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Você costuma parcelar compras?</Label>
                <RadioGroup
                  value={formData.cardsInstallments?.installmentFrequency || ""}
                  onValueChange={(value) => updateFormData("cardsInstallments", "installmentFrequency", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NUNCA" id="nunca" className="text-green-500" />
                    <Label htmlFor="nunca" className="text-gray-300">Nunca</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RARAMENTE" id="raramente_cartao" className="text-yellow-500" />
                    <Label htmlFor="raramente_cartao" className="text-gray-300">Raramente (apenas emergências)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="REGULARMENTE" id="regularmente" className="text-orange-500" />
                    <Label htmlFor="regularmente" className="text-gray-300">Regularmente (planejado)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FREQUENTEMENTE" id="frequentemente" className="text-red-500" />
                    <Label htmlFor="frequentemente" className="text-gray-300">Frequentemente (rotina)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Hoje, você está disposto a:</Label>
                <RadioGroup
                  value={formData.executionCapacity?.willingnessToAdjust || ""}
                  onValueChange={(value) => updateFormData("executionCapacity", "willingnessToAdjust", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="AJUSTA_ALGUNS" id="ajusta" className="text-yellow-500" />
                    <Label htmlFor="ajusta" className="text-gray-300">Ajustar alguns gastos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="REDUZ_SIGNIFICATIVO" id="reduz" className="text-orange-500" />
                    <Label htmlFor="reduz" className="text-gray-300">Reduzir significativamente seu padrão de vida</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MANTÉM_TUDO" id="mantem" className="text-blue-500" />
                    <Label htmlFor="mantem" className="text-gray-300">Manter tudo como está</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Você prefere:</Label>
                <RadioGroup
                  value={formData.executionCapacity?.growthPreference || ""}
                  onValueChange={(value) => updateFormData("executionCapacity", "growthPreference", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CRESCIMENTO_RÁPIDO" id="rapido" className="text-red-500" />
                    <Label htmlFor="rapido" className="text-gray-300">Crescimento rápido (com mais risco e esforço)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CRESCIMENTO_EQUILIBRADO" id="equilibrado" className="text-green-500" />
                    <Label htmlFor="equilibrado" className="text-gray-300">Crescimento equilibrado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SEGURANÇA_ESTABILIDADE" id="seguranca" className="text-blue-500" />
                    <Label htmlFor="seguranca" className="text-gray-300">Segurança e estabilidade</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">
                  Em uma escala de 1 a 5, qual seu nível de comprometimento com sua vida financeira?
                </Label>
                <div className="px-4">
                  <Slider
                    value={formData.executionCapacity?.commitmentLevel || [3]}
                    onValueChange={(value) => updateFormData("executionCapacity", "commitmentLevel", value)}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>1 - Muito baixo</span>
                    <span>{formData.executionCapacity?.commitmentLevel?.[0] || 3}</span>
                    <span>5 - Muito alto</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 6:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-green-500" />
                Expectativa de Futuro e Conhecimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Sua renda tende a:</Label>
                <RadioGroup
                  value={formData.futureExpectation?.incomeTrend || ""}
                  onValueChange={(value) => updateFormData("futureExpectation", "incomeTrend", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="AUMENTAR" id="aumentar" className="text-green-500" />
                    <Label htmlFor="aumentar" className="text-gray-300">Aumentar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PERMANECER_IGUAL" id="igual" className="text-yellow-500" />
                    <Label htmlFor="igual" className="text-gray-300">Permanecer igual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="VARIAR_INCERTA" id="variavel" className="text-red-500" />
                    <Label htmlFor="variavel" className="text-gray-300">Variar/incerta</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Como você avalia seu conhecimento sobre investimentos?</Label>
                <RadioGroup
                  value={formData.knowledgeExperience?.investmentKnowledge || ""}
                  onValueChange={(value) => updateFormData("knowledgeExperience", "investmentKnowledge", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INICIANTE" id="iniciante" className="text-blue-500" />
                    <Label htmlFor="iniciante" className="text-gray-300">Iniciante - Aprendendo agora</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INTERMEDIÁRIO" id="intermediario" className="text-yellow-500" />
                    <Label htmlFor="intermediario" className="text-gray-300">Intermediário - Tenho noções básicas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="AVANÇADO" id="avancado" className="text-green-500" />
                    <Label htmlFor="avancado" className="text-gray-300">Avançado - Entendo bem o mercado</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-gray-300 mb-3 block">Há quanto tempo você investe?</Label>
                <RadioGroup
                  value={formData.knowledgeExperience?.investmentTime || ""}
                  onValueChange={(value) => updateFormData("knowledgeExperience", "investmentTime", value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NÃO_INVESTE" id="nao_investe" className="text-red-500" />
                    <Label htmlFor="nao_investe" className="text-gray-300">Não investe ainda</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MENOS_1_ANO" id="menos_1" className="text-yellow-500" />
                    <Label htmlFor="menos_1" className="text-gray-300">Menos de 1 ano</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1-3_ANOS" id="1_3" className="text-orange-500" />
                    <Label htmlFor="1_3" className="text-gray-300">1-3 anos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3-5_ANOS" id="3_5" className="text-green-500" />
                    <Label htmlFor="3_5" className="text-gray-300">3-5 anos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MAIS_5_ANOS" id="mais_5" className="text-blue-500" />
                    <Label htmlFor="mais_5" className="text-gray-300">Mais de 5 anos</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )

      case 7:
        return (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="border-gray-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="h-6 w-6 text-purple-500" />
                Revisão e Confirmação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Resumo do seu Perfil</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Situação Financeira:</span> {formData.financialContext?.financialSituation}</p>
                  <p><span className="text-gray-400">Perfil de Risco:</span> {formData.riskProfile?.investmentProfile}</p>
                  <p><span className="text-gray-400">Objetivos:</span> {formData.objectives?.goals?.length || 0} selecionados</p>
                  <p><span className="text-gray-400">Comprometimento:</span> {formData.executionCapacity?.commitmentLevel?.[0] || 3}/5</p>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-400 mb-2">O que acontece depois?</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Nossa IA vai analisar suas respostas em detalhe
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Estratégias personalizadas serão geradas para você
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Você receberá um plano de ação prático com próximos passos
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Tudo ficará salvo para consulta e edição futuras
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Importante</h3>
                <p className="text-sm text-gray-300">
                  Suas respostas são confidenciais e serão usadas exclusivamente para personalizar sua experiência na plataforma. 
                  Você poderá editar suas informações a qualquer momento.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  {isSubmitting ? (
                    "Analisando..."
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Finalizar e Gerar Minhas Estratégias
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Formulário Estratégico</h1>
          <p className="text-gray-300">
            Vamos entender seu perfil financeiro para criar estratégias personalizadas
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Etapa {currentStep} de {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% completo</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>

        {renderStep()}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Anterior
          </Button>

          <Button
            onClick={nextStep}
            disabled={currentStep === 7 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {currentStep === 7 ? "Finalizar" : "Próximo"}
            {currentStep < 7 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
