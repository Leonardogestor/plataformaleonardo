import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Schema para validação das respostas do formulário
const anamnesisSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  }),
  financialContext: z.object({
    incomeType: z.enum(["FIXA", "VARIÁVEL", "MISTA"]),
    financialSituation: z.enum(["ORGANIZADA", "DESORGANIZADA", "CRÍTICA"]),
    hasDebts: z.enum(["NÃO", "SIM_CONTROLE", "SIM_PREOCUPANTE"]),
  }),
  lifeMoment: z.object({
    careerStage: z.enum(["INÍCIO_CARREIRA", "CRESCIMENTO_PROFISSIONAL", "ESTÁVEL", "TRANSIÇÃO"]),
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
    spendingPattern: z.enum(["MUITO_PREVISÍVEL", "MODERADAMENTE_PREVISÍVEL", "IMPREVISÍVEL"]),
    budgetHandling: z.enum([
      "SEGUE_RIGOROSAMENTE",
      "GUIA_FLEXÍVEL",
      "CRIA_NÃO_SEGUE",
      "NÃO_FAZ_ORÇAMENTO",
    ]),
  }),
  cardsInstallments: z.object({
    cardCount: z.enum(["0-1", "2-3", "4-5", "+5"]),
    installmentFrequency: z.enum(["NUNCA", "RARAMENTE", "REGULARMENTE", "FREQUENTEMENTE"]),
  }),
  executionCapacity: z.object({
    willingnessToAdjust: z.enum(["AJUSTA_ALGUNS", "REDUZ_SIGNIFICATIVO", "MANTÉM_TUDO"]),
    growthPreference: z.enum(["SEGURANÇA", "CRESCIMENTO_MODERADO", "CRESCIMENTO_AGRESSIVO"]),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = anamnesisSchema.parse(body)

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

export async function GET(request: NextRequest) {
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

// Função de análise das respostas
function analyzeResponses(responses: any) {
  let score = 0
  let riskScore = 0

  // Análise do contexto financeiro
  if (responses.financialContext.financialSituation === "CRÍTICA") {
    score -= 2
  } else if (responses.financialContext.financialSituation === "ORGANIZADA") {
    score += 1
  }

  if (responses.financialContext.hasDebts === "SIM_PREOCUPANTE") {
    score -= 1
  }

  // Análise do comportamento
  if (responses.financialBehavior.moneyHandling === "PLANEJA_ANTES") {
    score += 2
  } else if (responses.financialBehavior.moneyHandling === "GASTA_SEM_PLANEJAR") {
    score -= 1
  }

  if (responses.financialBehavior.trackingFrequency === "TODA_SEMANA") {
    score += 1
  }

  // Análise de risco
  if (responses.riskProfile.investmentProfile === "CONSERVADOR") {
    riskScore = 1
  } else if (responses.riskProfile.investmentProfile === "MODERADO") {
    riskScore = 2
  } else {
    riskScore = 3
  }

  // Determinar perfil principal
  let profileType = "CONTROLE"
  if (score >= 2) {
    profileType = "CRESCIMENTO"
  } else if (score < 0) {
    profileType = "RECUPERACAO"
  }

  // Determinar nível de risco
  let riskLevel = "CONSERVADOR"
  if (riskScore === 2) {
    riskLevel = "MODERADO"
  } else if (riskScore === 3) {
    riskLevel = "AGRESSIVO"
  }

  // Gerar estratégias personalizadas
  const strategies = generateStrategies(profileType, riskLevel, responses)

  return {
    profileType,
    riskLevel,
    score,
    riskScore,
    strategies,
    recommendations: generateRecommendations(profileType, riskLevel, responses),
    automationLevel: determineAutomationLevel(responses),
    interventionIntensity: determineInterventionLevel(responses),
  }
}

function generateStrategies(profileType: string, riskLevel: string, responses: any) {
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

function generateRecommendations(profileType: string, riskLevel: string, responses: any) {
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

  if (responses.budgetControl.budgetHandling === "NÃO_FAZ_ORÇAMENTO") {
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
  let level = "SUAVE"

  if (responses.financialContext.financialSituation === "CRÍTICA") {
    level = "INTENSO"
  } else if (responses.executionCapacity.commitmentLevel >= 4) {
    level = "MODERADO"
  }

  return level
}
