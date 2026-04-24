import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Schema para validação das respostas do formulário
const anamnesisSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    birthDate: z.string().min(1, "Data de nascimento e obrigatoria"),
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

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/user/anamnesis - Iniciando")

    const session = await getServerSession(authOptions)
    console.log("Session:", session?.user?.id ? "OK" : "NOT_FOUND")

    if (!session?.user?.id) {
      console.log("Erro: Usuário não autenticado")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Dados recebidos:", JSON.stringify(body, null, 2))

    let validatedData
    try {
      validatedData = anamnesisSchema.parse(body)
      console.log("Dados validados com sucesso")
    } catch (validationError: any) {
      console.error("Erro de validação:", validationError.errors)
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationError.errors,
        },
        { status: 400 }
      )
    }

    // Análise das respostas para determinar perfil e estratégias
    const analysis = analyzeResponses(validatedData)

    // Salvar ou atualizar anámnese do usuário
    const anamnesis = await prisma.userAnamnesis.upsert({
      where: { userId: session.user.id },
      update: {
        name: validatedData.personalInfo.name,
        birthDate: new Date(validatedData.personalInfo.birthDate),
        responses: validatedData,
        analysis: analysis,
        profileType: analysis.profileType,
        riskLevel: analysis.riskLevel,
      },
      create: {
        userId: session.user.id,
        name: validatedData.personalInfo.name,
        birthDate: new Date(validatedData.personalInfo.birthDate),
        responses: validatedData,
        analysis: analysis,
        profileType: analysis.profileType,
        riskLevel: analysis.riskLevel,
      },
    })

    // Invalidar snapshots consolidados — anamnese afeta idade e projeções em todos os meses
    await prisma.financialSummary.deleteMany({ where: { userId: session.user.id } })

    return NextResponse.json({
      success: true,
      anamnesis,
      analysis,
    })
  } catch (error) {
    console.error("Erro ao salvar anámnese:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const anamnesis = await prisma.userAnamnesis.findUnique({
      where: { userId: session.user.id },
    })

    if (!anamnesis) {
      return NextResponse.json(
        {
          exists: false,
          message: "Anámnese não encontrada",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exists: true,
      anamnesis,
    })
  } catch (error) {
    console.error("Erro ao buscar anámnese:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = anamnesisSchema.parse(body)

    // Reanalisar com novas respostas
    const analysis = analyzeResponses(validatedData)

    const anamnesis = await prisma.userAnamnesis.update({
      where: { userId: session.user.id },
      data: {
        responses: validatedData,
        analysis: analysis,
        profileType: analysis.profileType,
        riskLevel: analysis.riskLevel,
      },
    })

    // Invalidar snapshots consolidados para forçar recálculo com novos dados de perfil
    await prisma.financialSummary.deleteMany({ where: { userId: session.user.id } })

    return NextResponse.json({
      success: true,
      anamnesis,
      analysis,
    })
  } catch (error) {
    console.error("Erro ao atualizar anámnese:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
      },
      { status: 500 }
    )
  }
}

// Função de análise multidimensional das respostas (usa TODOS os 20+ campos)
function analyzeResponses(responses: any) {
  // ── DIMENSÃO 1: Saúde Financeira (0–10) ──────────────────────────────────
  let healthScore = 5.0

  // Situação financeira geral
  if (responses.financialContext.financialSituation === "ORGANIZADA") healthScore += 2.0
  else if (responses.financialContext.financialSituation === "DESORGANIZADA") healthScore -= 1.0
  else if (responses.financialContext.financialSituation === "CRITICA") healthScore -= 3.0

  // Dívidas
  if (responses.financialContext.hasDebts === "NAO") healthScore += 1.5
  else if (responses.financialContext.hasDebts === "SIM_PREOCUPANTE") healthScore -= 2.0
  // SIM_CONTROLE: neutro

  // Padrão de gastos
  if (responses.budgetControl.spendingPattern === "MUITO_PREVISIVEL") healthScore += 1.0
  else if (responses.budgetControl.spendingPattern === "IMPREVISIVEL") healthScore -= 1.0

  // Disciplina orçamentária
  if (responses.budgetControl.budgetHandling === "SEGUE_RIGOROSAMENTE") healthScore += 1.5
  else if (responses.budgetControl.budgetHandling === "GUIA_FLEXIVEL") healthScore += 0.5
  else if (responses.budgetControl.budgetHandling === "CRIA_NAO_SEGUE") healthScore -= 0.5
  else if (responses.budgetControl.budgetHandling === "NAO_FAZ_ORCAMENTO") healthScore -= 1.5

  // Uso de crédito/cartões
  if (responses.cardsInstallments.cardCount === "0-1") healthScore += 0.5
  else if (responses.cardsInstallments.cardCount === "4-5") healthScore -= 0.5
  else if (responses.cardsInstallments.cardCount === "+5") healthScore -= 1.0

  if (responses.cardsInstallments.installmentFrequency === "NUNCA") healthScore += 0.5
  else if (responses.cardsInstallments.installmentFrequency === "REGULARMENTE") healthScore -= 0.5
  else if (responses.cardsInstallments.installmentFrequency === "FREQUENTEMENTE") healthScore -= 1.0

  healthScore = Math.max(0, Math.min(10, healthScore))

  // ── DIMENSÃO 2: Maturidade Comportamental (0–10) ──────────────────────────
  let behaviorScore = 5.0

  // Como lida com dinheiro
  if (responses.financialBehavior.moneyHandling === "PLANEJA_ANTES") behaviorScore += 2.5
  else if (responses.financialBehavior.moneyHandling === "TENTA_CONTROLAR") behaviorScore += 0.0
  else if (responses.financialBehavior.moneyHandling === "GASTA_SEM_PLANEJAR") behaviorScore -= 2.5

  // Frequência de acompanhamento
  if (responses.financialBehavior.trackingFrequency === "TODA_SEMANA") behaviorScore += 2.0
  else if (responses.financialBehavior.trackingFrequency === "MENSAL") behaviorScore += 0.5
  else if (responses.financialBehavior.trackingFrequency === "RARAMENTE") behaviorScore -= 2.0

  // Prioridade com o dinheiro
  if (responses.financialBehavior.moneyPriority === "GUARDA_INVESTE") behaviorScore += 2.0
  else if (responses.financialBehavior.moneyPriority === "PAGA_CONTAS") behaviorScore += 0.5
  else if (responses.financialBehavior.moneyPriority === "GASTA") behaviorScore -= 1.5

  // Disposição para ajustar gastos
  if (responses.executionCapacity.willingnessToAdjust === "REDUZ_SIGNIFICATIVO") behaviorScore += 1.0
  else if (responses.executionCapacity.willingnessToAdjust === "AJUSTA_ALGUNS") behaviorScore += 0.0
  else if (responses.executionCapacity.willingnessToAdjust === "MANTEM_TUDO") behaviorScore -= 1.5

  behaviorScore = Math.max(0, Math.min(10, behaviorScore))

  // ── DIMENSÃO 3: Tolerância Real ao Risco (0–10) ───────────────────────────
  // Não é espelho da auto-declaração — é inferida de múltiplas fontes
  let riskScore = 5.0

  // Auto-declaração pesa 35% (não 100%)
  if (responses.riskProfile.investmentProfile === "AGRESSIVO") riskScore += 1.75
  else if (responses.riskProfile.investmentProfile === "CONSERVADOR") riskScore -= 1.75
  // MODERADO: neutro

  // Reação real a perdas — sinal comportamental forte (peso 30%)
  if (responses.riskProfile.lossReaction === "BUSCA_RETORNO_RISCO") riskScore += 1.5
  else if (responses.riskProfile.lossReaction === "EVITA_RISCO") riskScore -= 1.5
  // ACEITA_MODERADAS: neutro

  // Preferência de crescimento declarada (peso 20%)
  if (responses.executionCapacity.growthPreference === "CRESCIMENTO_AGRESSIVO") riskScore += 1.0
  else if (responses.executionCapacity.growthPreference === "SEGURANCA") riskScore -= 1.0

  // Fase de carreira — jovens têm horizonte mais longo (peso 10%)
  if (responses.lifeMoment.careerStage === "INICIO_CARREIRA") riskScore += 0.75
  else if (responses.lifeMoment.careerStage === "CRESCIMENTO_PROFISSIONAL") riskScore += 0.25
  else if (responses.lifeMoment.careerStage === "TRANSICAO") riskScore -= 0.5

  // Dependentes reduzem tolerância a risco
  if (responses.lifeMoment.hasDependents) riskScore -= 0.75

  // Renda variável indica maior tolerância à incerteza
  if (responses.financialContext.incomeType === "VARIAVEL") riskScore += 0.5
  else if (responses.financialContext.incomeType === "FIXA") riskScore -= 0.25

  // Saúde financeira ruim não suporta risco alto — ancoragem de segurança
  if (healthScore < 4) riskScore = Math.min(riskScore, 5.5)

  riskScore = Math.max(0, Math.min(10, riskScore))

  // ── DIMENSÃO 4: Clareza de Objetivos (0–10) ───────────────────────────────
  let goalsScore = 5.0

  if (responses.objectives.hasGoals) goalsScore += 2.0
  else goalsScore -= 1.5

  const goalCount: number = responses.objectives.goals?.length ?? 0
  if (goalCount >= 4) goalsScore += 2.0
  else if (goalCount >= 2) goalsScore += 1.0
  else if (goalCount === 1) goalsScore += 0.5
  else goalsScore -= 1.0

  // Objetivos de longo prazo indicam maturidade financeira
  const longTermGoals = ["Aposentadoria", "Independência financeira", "Comprar imóvel"]
  const hasLongTermGoal = longTermGoals.some((g) => responses.objectives.goals?.includes(g))
  if (hasLongTermGoal) goalsScore += 1.0

  goalsScore = Math.max(0, Math.min(10, goalsScore))

  // ── PERFIL PRINCIPAL (healthScore 50% + behaviorScore 35% + goalsScore 15%) ──
  const overallScore = healthScore * 0.5 + behaviorScore * 0.35 + goalsScore * 0.15

  let profileType: string
  if (overallScore >= 6.5) profileType = "CRESCIMENTO"
  else if (overallScore <= 4.0) profileType = "RECUPERACAO"
  else profileType = "CONTROLE"

  // ── NÍVEL DE RISCO (inferido, não apenas auto-declarado) ──────────────────
  let riskLevel: string
  if (riskScore >= 6.5) riskLevel = "AGRESSIVO"
  else if (riskScore <= 4.0) riskLevel = "CONSERVADOR"
  else riskLevel = "MODERADO"

  const strategies = generateStrategies(profileType, riskLevel, responses)

  return {
    profileType,
    riskLevel,
    score: Math.round(overallScore * 10) / 10,
    riskScore: Math.round(riskScore * 10) / 10,
    healthScore: Math.round(healthScore * 10) / 10,
    behaviorScore: Math.round(behaviorScore * 10) / 10,
    goalsScore: Math.round(goalsScore * 10) / 10,
    strategies,
    recommendations: generateRecommendations(profileType, riskLevel, responses),
    automationLevel: determineAutomationLevel(responses),
    interventionIntensity: determineInterventionLevel(responses),
  }
}

function generateStrategies(profileType: string, riskLevel: string, _responses: any) {
  const strategies = []

  // Estratégias baseadas no perfil
  if (profileType === "RECUPERACAO") {
    strategies.push({
      area: "DÍVIDAS",
      priority: "ALTA",
      description: "Focar em quitação de dívidas caras primeiro",
      actions: ["Negociar dívidas", "Criar plano de pagamento", "Reduzir gastos não essenciais"],
    })
    strategies.push({
      area: "EMERGÊNCIA",
      priority: "ALTA",
      description: "Construir reserva mínima de emergência",
      actions: ["Guardar 10% da renda", "Vender itens não utilizados", "Renda extra"],
    })
  } else if (profileType === "CONTROLE") {
    strategies.push({
      area: "ORGANIZAÇÃO",
      priority: "MÉDIA",
      description: "Sistema de controle financeiro",
      actions: ["Upload mensal de extratos", "Categorização automática", "Relatórios semanais"],
    })
    strategies.push({
      area: "METAS",
      priority: "MÉDIA",
      description: "Definir e acompanhar metas financeiras",
      actions: ["Metas de curto prazo", "Acompanhamento mensal", "Ajustes periódicos"],
    })
  } else {
    strategies.push({
      area: "INVESTIMENTOS",
      priority: "ALTA",
      description: "Otimizar portfolio para crescimento",
      actions: ["Diversificação", "Rebalanceamento", "Análise de performance"],
    })
    strategies.push({
      area: "MAXIMIZAÇÃO",
      priority: "MÉDIA",
      description: "Maximizar retorno sobre patrimônio",
      actions: ["Oportunidades de mercado", "Otimização fiscal", "Planejamento sucessório"],
    })
  }

  // Estratégias baseadas no risco
  if (riskLevel === "CONSERVADOR") {
    strategies.push({
      area: "SEGURANÇA",
      priority: "ALTA",
      description: "Preservação de capital",
      actions: ["Renda fixa", "Tesouro Direto", "Fundos conservadores"],
    })
  } else if (riskLevel === "MODERADO") {
    strategies.push({
      area: "EQUILÍBRIO",
      priority: "MÉDIA",
      description: "Balanceamento risco/retorno",
      actions: ["Mix renda fixa/variável", "Fundos multimercado", "Ações blue chips"],
    })
  } else {
    strategies.push({
      area: "CRESCIMENTO",
      priority: "ALTA",
      description: "Busca de alto retorno",
      actions: ["Ações growth", "Criptoativos", "Startups/Equity"],
    })
  }

  return strategies
}

function generateRecommendations(_profileType: string, _riskLevel: string, responses: any) {
  const recommendations = []

  // Recomendações baseadas no comportamento
  if (responses.financialBehavior.trackingFrequency === "RARAMENTE") {
    recommendations.push({
      type: "HÁBITO",
      priority: "ALTA",
      title: "Acompanhamento Frequente",
      description: "Estabeleça rotina semanal para revisar finanças",
    })
  }

  if (responses.budgetControl.budgetHandling === "NAO_FAZ_ORCAMENTO") {
    recommendations.push({
      type: "PLANEJAMENTO",
      priority: "ALTA",
      title: "Criar Orçamento",
      description: "Defina limites por categoria para controlar gastos",
    })
  }

  // Recomendações baseadas nos objetivos
  if (responses.objectives.goals.includes("Não tenho planos")) {
    recommendations.push({
      type: "OBJETIVOS",
      priority: "MÉDIA",
      title: "Definir Metas",
      description: "Estabeleça objetivos financeiros claros para motivar o planejamento",
    })
  }

  return recommendations
}

function determineAutomationLevel(responses: any) {
  let level = "BAIXO"

  if (
    responses.dataImport.preferredFormat === "PDF" ||
    responses.dataImport.preferredFormat === "EXCEL_CSV"
  ) {
    level = "MÉDIO"
  }

  if (responses.financialBehavior.trackingFrequency === "TODA_SEMANA") {
    level = "ALTO"
  }

  return level
}

function determineInterventionLevel(responses: any) {
  let urgency = 0

  if (responses.financialContext.financialSituation === "CRITICA") urgency += 3
  else if (responses.financialContext.financialSituation === "DESORGANIZADA") urgency += 1

  if (responses.financialContext.hasDebts === "SIM_PREOCUPANTE") urgency += 2
  if (responses.financialBehavior.moneyHandling === "GASTA_SEM_PLANEJAR") urgency += 1
  if (responses.budgetControl.budgetHandling === "NAO_FAZ_ORCAMENTO") urgency += 1
  if (responses.cardsInstallments.installmentFrequency === "FREQUENTEMENTE") urgency += 1

  if (urgency >= 4) return "INTENSO"
  if (urgency >= 2) return "MODERADO"
  return "SUAVE"
}
