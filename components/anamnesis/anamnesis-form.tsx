"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, ArrowRight, ArrowLeft } from "lucide-react"

const anamnesisSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  }),
  financialContext: z.object({
    incomeType: z.enum(["FIXA", "VARIAVEL", "MISTA"]),
    financialSituation: z.enum(["ORGANIZADA", "DESORGANIZADA", "CRITICA"]),
    hasDebts: z.enum(["NAO", "SIM_CONTROLE", "SIM_PREOCUPANTE"]),
  }),
  lifeMoment: z.object({
    careerStage: z.enum(["INICIO_CARREIRA", "CRESCIMENTO_PROFISSIONAL", "ESTAVEL", "TRANSICAO"]),
    hasDependents: z.boolean(),
  }),
  financialBehavior: z.object({
    moneyHandling: z.enum(["PLANEJA_ANTES", "TENTA_CONTROLAR", "GASTA_SEM_PLANEJAR"]),
    trackingFrequency: z.enum(["TODA_SEMANA", "MENSAL", "RARAMENTE"]),
    moneyPriority: z.enum(["GUARDA_INVESTE", "PAGA_CONTAS", "GASTA"]),
  }),
  riskProfile: z.object({
    investmentProfile: z.enum(["CONSERVADOR", "MODERADO", "AGRESSIVO"]),
    lossReaction: z.enum(["EVITA_RISCO", "ACEITA_MODERADAS", "BUSCA_RETORNO_RISCO"]),
  }),
  objectives: z.object({
    goals: z.array(z.string()),
    hasGoals: z.boolean(),
  }),
  dataImport: z.object({
    statementReceipt: z.enum(["PDF_EMAIL", "EXCEL_BANCO", "APP_ACESSO", "PAPEL_IMPRESSO"]),
    preferredFormat: z.enum(["PDF", "EXCEL_CSV", "IMAGENS", "PAPEL"]),
  }),
  budgetControl: z.object({
    spendingPattern: z.enum(["MUITO_PREVISIVEL", "MODERADAMENTE_PREVISIVEL", "IMPREVISIVEL"]),
    budgetHandling: z.enum([
      "SEGUE_RIGOROSAMENTE",
      "GUIA_FLEXIVEL",
      "CRIA_NAO_SEGUE",
      "NAO_FAZ_ORCAMENTO",
    ]),
  }),
  cardsInstallments: z.object({
    cardCount: z.enum(["0-1", "2-3", "4-5", "+5"]),
    installmentFrequency: z.enum(["NUNCA", "RARAMENTE", "REGULARMENTE", "FREQUENTEMENTE"]),
  }),
  executionCapacity: z.object({
    willingnessToAdjust: z.enum(["AJUSTA_ALGUNS", "REDUZ_SIGNIFICATIVO", "MANTEM_TUDO"]),
    growthPreference: z.enum(["SEGURANCA", "CRESCIMENTO_MODERADO", "CRESCIMENTO_AGRESSIVO"]),
  }),
})

type AnamnesisFormData = z.infer<typeof anamnesisSchema>

interface AnamnesisFormProps {
  onSubmit: (data: AnamnesisFormData) => void
}

const goalOptions = [
  "Comprar imóvel",
  "Aposentadoria",
  "Viagem internacional",
  "Educação própria/filhos",
  "Emergência/reserva",
  "Investir em negócio",
  "Carro novo",
  "Reforma",
  "Independência financeira",
  "Outro",
]

const DEFAULT_FORM_VALUES: AnamnesisFormData = {
  personalInfo: { name: "Usuário Teste", birthDate: "1990-01-01" },
  financialContext: { incomeType: "FIXA", financialSituation: "ORGANIZADA", hasDebts: "NAO" },
  lifeMoment: { careerStage: "INICIO_CARREIRA", hasDependents: false },
  financialBehavior: { moneyHandling: "PLANEJA_ANTES", trackingFrequency: "MENSAL", moneyPriority: "GUARDA_INVESTE" },
  riskProfile: { investmentProfile: "MODERADO", lossReaction: "ACEITA_MODERADAS" },
  objectives: { goals: [], hasGoals: false },
  dataImport: { statementReceipt: "PDF_EMAIL", preferredFormat: "PDF" },
  budgetControl: { spendingPattern: "MODERADAMENTE_PREVISIVEL", budgetHandling: "CRIA_NAO_SEGUE" },
  cardsInstallments: { cardCount: "0-1", installmentFrequency: "RARAMENTE" },
  executionCapacity: { willingnessToAdjust: "AJUSTA_ALGUNS", growthPreference: "CRESCIMENTO_MODERADO" },
}

export function AnamnesisForm({ onSubmit }: AnamnesisFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AnamnesisFormData>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const steps = [
    { title: "Informações Pessoais", description: "Seus dados básicos" },
    { title: "Contexto Financeiro", description: "Sua situação financeira atual" },
    { title: "Momento de Vida", description: "Sua fase profissional e pessoal" },
    { title: "Comportamento Financeiro", description: "Seus hábitos com dinheiro" },
    { title: "Perfil de Risco", description: "Sua tolerância a riscos" },
    { title: "Objetivos", description: "Suas metas financeiras" },
    { title: "Importação de Dados", description: "Como você recebe seus extratos" },
    { title: "Controle Orçamentário", description: "Seus padrões de gastos" },
    { title: "Cartões e Parcelas", description: "Uso de crédito" },
    { title: "Capacidade de Execução", description: "Sua disposição para mudanças" },
  ]

  const handleSubmit = async (data: AnamnesisFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    // Validar campos do passo atual antes de prosseguir
    if (currentStep === 0) {
      const name = form.getValues("personalInfo.name")
      const birthDate = form.getValues("personalInfo.birthDate")

      if (!name || name.trim() === "") {
        form.setError("personalInfo.name", { message: "Nome é obrigatório" })
        return
      }

      if (!birthDate) {
        form.setError("personalInfo.birthDate", { message: "Data de nascimento é obrigatória" })
        return
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Informações Pessoais</h3>

            <FormField
              control={form.control}
              name="personalInfo.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personalInfo.birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Contexto Financeiro</h3>

            <FormField
              control={form.control}
              name="financialContext.incomeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Renda</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="FIXA" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Fixa - Salário mensal consistente
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="VARIAVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Variável - Comissões, freelancers
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MISTA" />
                          </FormControl>
                          <FormLabel className="font-normal">Mista - Fixa + variável</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financialContext.financialSituation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação Financeira</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="ORGANIZADA" />
                          </FormControl>
                          <FormLabel className="font-normal">Organizada - Tenho controle</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="DESORGANIZADA" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Desorganizada - Um pouco caótica
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CRITICA" />
                          </FormControl>
                          <FormLabel className="font-normal">Crítica - Muita dificuldade</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financialContext.hasDebts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação de Dívidas</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="NAO" />
                          </FormControl>
                          <FormLabel className="font-normal">Não tenho dívidas</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="SIM_CONTROLE" />
                          </FormControl>
                          <FormLabel className="font-normal">Tenho, mas sob controle</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="SIM_PREOCUPANTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Tenho e está preocupante</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Momento de Vida</h3>

            <FormField
              control={form.control}
              name="lifeMoment.careerStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fase Profissional</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="INICIO_CARREIRA" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Início de carreira (0-3 anos)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CRESCIMENTO_PROFISSIONAL" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Crescimento profissional (3-10 anos)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="ESTAVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Estável (10+ anos)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="TRANSICAO" />
                          </FormControl>
                          <FormLabel className="font-normal">Transição de carreira</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lifeMoment.hasDependents"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Tenho dependentes (filhos, pais, etc.)</FormLabel>
                </FormItem>
              )}
            />
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Comportamento Financeiro</h3>

            <FormField
              control={form.control}
              name="financialBehavior.moneyHandling"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como você lida com dinheiro?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PLANEJA_ANTES" />
                          </FormControl>
                          <FormLabel className="font-normal">Planejo antes de gastar</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="TENTA_CONTROLAR" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Tento controlar, mas nem sempre consigo
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="GASTA_SEM_PLANEJAR" />
                          </FormControl>
                          <FormLabel className="font-normal">Gasto sem planejar muito</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financialBehavior.trackingFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Com que frequência você acompanha suas finanças?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="TODA_SEMANA" />
                          </FormControl>
                          <FormLabel className="font-normal">Toda semana</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MENSAL" />
                          </FormControl>
                          <FormLabel className="font-normal">Mensalmente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="RARAMENTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Raramente</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financialBehavior.moneyPriority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que você prioriza com seu dinheiro?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="GUARDA_INVESTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Guardo e invisto primeiro</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PAGA_CONTAS" />
                          </FormControl>
                          <FormLabel className="font-normal">Pago contas em dia</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="GASTA" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Gasto com o que preciso/quero
                          </FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Perfil de Risco</h3>

            <FormField
              control={form.control}
              name="riskProfile.investmentProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu perfil de investidor</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CONSERVADOR" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Conservador - Prefiro segurança
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MODERADO" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Moderado - Equilíbrio entre risco e retorno
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="AGRESSIVO" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Agressivo - Busco maiores retornos
                          </FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskProfile.lossReaction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como reage a perdas?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="EVITA_RISCO" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Evito risco a qualquer custo
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="ACEITA_MODERADAS" />
                          </FormControl>
                          <FormLabel className="font-normal">Aceito perdas moderadas</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="BUSCA_RETORNO_RISCO" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Busco retorno mesmo com risco
                          </FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Objetivos Financeiros</h3>

            <FormField
              control={form.control}
              name="objectives.hasGoals"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Tenho metas financeiras definidas</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objectives.goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quais são seus principais objetivos?</FormLabel>
                  <FormDescription>Selecione todos que aplicam</FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {goalOptions.map((goal) => (
                      <FormItem key={goal} className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(goal)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, goal])
                              } else {
                                field.onChange(field.value.filter((item) => item !== goal))
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{goal}</FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Importação de Dados</h3>

            <FormField
              control={form.control}
              name="dataImport.statementReceipt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como você recebe seus extratos bancários?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PDF_EMAIL" />
                          </FormControl>
                          <FormLabel className="font-normal">PDF por e-mail</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="EXCEL_BANCO" />
                          </FormControl>
                          <FormLabel className="font-normal">Excel do banco</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="APP_ACESSO" />
                          </FormControl>
                          <FormLabel className="font-normal">Acesso direto ao app</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PAPEL_IMPRESSO" />
                          </FormControl>
                          <FormLabel className="font-normal">Papel impresso</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataImport.preferredFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato preferido para importação</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PDF" />
                          </FormControl>
                          <FormLabel className="font-normal">PDF</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="EXCEL_CSV" />
                          </FormControl>
                          <FormLabel className="font-normal">Excel/CSV</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="IMAGENS" />
                          </FormControl>
                          <FormLabel className="font-normal">Imagens</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="PAPEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Papel</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Controle Orçamentário</h3>

            <FormField
              control={form.control}
              name="budgetControl.spendingPattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu padrão de gastos é:</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MUITO_PREVISIVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Muito previsível</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MODERADAMENTE_PREVISIVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Moderadamente previsível</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="IMPREVISIVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Imprevisível</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetControl.budgetHandling"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como você lida com orçamento?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="SEGUE_RIGOROSAMENTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Sigo rigorosamente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="GUIA_FLEXIVEL" />
                          </FormControl>
                          <FormLabel className="font-normal">Uso como guia flexível</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CRIA_NAO_SEGUE" />
                          </FormControl>
                          <FormLabel className="font-normal">Crio mas não sigo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="NAO_FAZ_ORCAMENTO" />
                          </FormControl>
                          <FormLabel className="font-normal">Não faço orçamento</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 8:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Cartões e Parcelas</h3>

            <FormField
              control={form.control}
              name="cardsInstallments.cardCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantos cartões de crédito você possui?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="0-1" />
                          </FormControl>
                          <FormLabel className="font-normal">0-1 cartão</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="2-3" />
                          </FormControl>
                          <FormLabel className="font-normal">2-3 cartões</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="4-5" />
                          </FormControl>
                          <FormLabel className="font-normal">4-5 cartões</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="+5" />
                          </FormControl>
                          <FormLabel className="font-normal">Mais de 5 cartões</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardsInstallments.installmentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Com que frequência você parcela compras?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="NUNCA" />
                          </FormControl>
                          <FormLabel className="font-normal">Nunca</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="RARAMENTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Raramente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="REGULARMENTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Regularmente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="FREQUENTEMENTE" />
                          </FormControl>
                          <FormLabel className="font-normal">Frequentemente</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 9:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Capacidade de Execução</h3>

            <FormField
              control={form.control}
              name="executionCapacity.willingnessToAdjust"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disposição para ajustar gastos</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="AJUSTA_ALGUNS" />
                          </FormControl>
                          <FormLabel className="font-normal">Ajusto alguns gastos</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="REDUZ_SIGNIFICATIVO" />
                          </FormControl>
                          <FormLabel className="font-normal">Reduzo significativamente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="MANTEM_TUDO" />
                          </FormControl>
                          <FormLabel className="font-normal">Mantenho tudo como está</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="executionCapacity.growthPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferência de crescimento</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="space-y-2">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="SEGURANCA" />
                          </FormControl>
                          <FormLabel className="font-normal">Segurança primeiro</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CRESCIMENTO_MODERADO" />
                          </FormControl>
                          <FormLabel className="font-normal">Crescimento moderado</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="CRESCIMENTO_AGRESSIVO" />
                          </FormControl>
                          <FormLabel className="font-normal">Crescimento agressivo</FormLabel>
                        </FormItem>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{steps[currentStep]?.title}</CardTitle>
            <CardDescription>{steps[currentStep]?.description}</CardDescription>
          </div>
          <Badge variant="outline">
            Passo {currentStep + 1} de {steps.length}
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {renderStep()}

            <Separator />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (isSubmitting) return
                    setIsSubmitting(true)
                    try {
                      const v = form.getValues()
                      const data: AnamnesisFormData = {
                        personalInfo: v.personalInfo ?? DEFAULT_FORM_VALUES.personalInfo,
                        financialContext: v.financialContext ?? DEFAULT_FORM_VALUES.financialContext,
                        lifeMoment: v.lifeMoment ?? DEFAULT_FORM_VALUES.lifeMoment,
                        financialBehavior: v.financialBehavior ?? DEFAULT_FORM_VALUES.financialBehavior,
                        riskProfile: v.riskProfile ?? DEFAULT_FORM_VALUES.riskProfile,
                        objectives: v.objectives ?? DEFAULT_FORM_VALUES.objectives,
                        dataImport: v.dataImport ?? DEFAULT_FORM_VALUES.dataImport,
                        budgetControl: v.budgetControl ?? DEFAULT_FORM_VALUES.budgetControl,
                        cardsInstallments: v.cardsInstallments ?? DEFAULT_FORM_VALUES.cardsInstallments,
                        executionCapacity: v.executionCapacity ?? DEFAULT_FORM_VALUES.executionCapacity,
                      }
                      await onSubmit(data)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Finalizar Anámnese
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={nextStep}>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
