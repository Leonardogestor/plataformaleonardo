/**
 * Analytics avançado para anámnese financeira
 * Sistema inteligente de análise e geração de estratégias personalizadas
 */

export interface AnamnesisResponse {
  personalInfo: {
    name: string
    birthDate: string
  }
  financialContext: {
    incomeType: 'FIXA' | 'VARIAVEL' | 'MISTA'
    financialSituation: 'ORGANIZADA' | 'DESORGANIZADA' | 'CRITICA'
    hasDebts: 'NAO' | 'SIM_CONTROLE' | 'SIM_PREOCUPANTE'
  }
  lifeMoment: {
    careerStage: 'INICIO_CARREIRA' | 'CRESCIMENTO_PROFISSIONAL' | 'ESTAVEL' | 'TRANSICAO'
    hasDependents: boolean
  }
  financialBehavior: {
    moneyHandling: 'PLANEJA_ANTES' | 'TENTA_CONTROLAR' | 'GASTA_SEM_PLANEJAR'
    trackingFrequency: 'TODA_SEMANA' | 'MENSAL' | 'RARAMENTE'
    moneyPriority: 'GUARDA_INVESTE' | 'PAGA_CONTAS' | 'GASTA'
  }
  riskProfile: {
    investmentProfile: 'CONSERVADOR' | 'MODERADO' | 'AGRESSIVO'
    lossReaction: 'EVITA_RISCO' | 'ACEITA_MODERADAS' | 'BUSCA_RETORNO_RISCO'
  }
  objectives: {
    goals: string[]
    hasGoals: boolean
  }
  dataImport: {
    statementReceipt: 'PDF_EMAIL' | 'EXCEL_BANCO' | 'APP_ACESSO' | 'PAPEL_IMPRESSO'
    preferredFormat: 'PDF' | 'EXCEL_CSV' | 'IMAGENS' | 'PAPEL'
  }
  budgetControl: {
    spendingPattern: 'MUITO_PREVISIVEL' | 'MODERADAMENTE_PREVISIVEL' | 'IMPREVISIVEL'
    budgetHandling: 'SEGUE_RIGOROSAMENTE' | 'GUIA_FLEXIVEL' | 'CRIA_NAO_SEGUE' | 'NAO_FAZ_ORCAMENTO'
  }
  cardsInstallments: {
    cardCount: '0-1' | '2-3' | '4-5' | '+5'
    installmentFrequency: 'NUNCA' | 'RARAMENTE' | 'REGULARMENTE' | 'FREQUENTEMENTE'
  }
  executionCapacity: {
    willingnessToAdjust: 'AJUSTA_ALGUNS' | 'REDUZ_SIGNIFICATIVO' | 'MANTEM_TUDO'
    growthPreference: 'SEGURANCA' | 'CRESCIMENTO_MODERADO' | 'CRESCIMENTO_AGRESSIVO'
  }
}

export interface AnamnesisAnalysis {
  profileType: 'CONTROLE' | 'RECUPERACAO' | 'CRESCIMENTO'
  riskLevel: 'CONSERVADOR' | 'MODERADO' | 'AGRESSIVO'
  score: number
  riskScore: number
  strategies: Strategy[]
  recommendations: Recommendation[]
  automationLevel: 'BAIXO' | 'MEDIO' | 'ALTO'
  interventionIntensity: 'SUAVE' | 'MODERADO' | 'INTENSO'
  insights: Insight[]
  nextSteps: NextStep[]
}

export interface Strategy {
  area: string
  priority: 'BAIXA' | 'MEDIA' | 'ALTA'
  description: string
  actions: string[]
  expectedResults: string[]
  timeframe: string
  complexity: 'BAIXA' | 'MEDIA' | 'ALTA'
}

export interface Recommendation {
  type: string
  priority: 'BAIXA' | 'MEDIA' | 'ALTA'
  title: string
  description: string
  benefits: string[]
  implementation: string[]
}

export interface Insight {
  category: string
  title: string
  description: string
  impact: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO'
  confidence: number
}

export interface NextStep {
  order: number
  title: string
  description: string
  estimatedTime: string
  requiredActions: string[]
  dependencies: string[]
}

/**
 * Análise completa da anámnese com IA avançada
 */
export function analyzeAnamnesisAdvanced(responses: AnamnesisResponse): AnamnesisAnalysis {
  const scores = calculateDetailedScores(responses)
  const profileType = determineProfileType(scores)
  const riskAnalysis = analyzeRiskProfile(responses)
  const strategies = generateAdvancedStrategies(profileType, riskAnalysis, responses)
  const recommendations = generateIntelligentRecommendations(responses, scores)
  const insights = generateDeepInsights(responses, scores)
  const nextSteps = generateActionPlan(profileType, riskAnalysis, responses)

  return {
    profileType,
    riskLevel: riskAnalysis.level,
    score: scores.total,
    riskScore: riskAnalysis.score,
    strategies,
    recommendations,
    automationLevel: determineAutomationLevel(responses),
    interventionIntensity: determineInterventionLevel(responses, scores),
    insights,
    nextSteps,
  }
}

function calculateDetailedScores(responses: AnamnesisResponse) {
  const scores = {
    financial: 0,
    behavioral: 0,
    risk: 0,
    execution: 0,
    total: 0,
  }

  // Score financeiro (-3 a +3)
  if (responses.financialContext.financialSituation === 'CRITICA') scores.financial -= 2
  else if (responses.financialContext.financialSituation === 'ORGANIZADA') scores.financial += 1
  else if (responses.financialContext.financialSituation === 'DESORGANIZADA') scores.financial -= 1

  if (responses.financialContext.hasDebts === 'SIM_PREOCUPANTE') scores.financial -= 1
  else if (responses.financialContext.hasDebts === 'NAO') scores.financial += 1

  // Score comportamental (-3 a +3)
  if (responses.financialBehavior.moneyHandling === 'PLANEJA_ANTES') scores.behavioral += 2
  else if (responses.financialBehavior.moneyHandling === 'TENTA_CONTROLAR') scores.behavioral += 1
  else if (responses.financialBehavior.moneyHandling === 'GASTA_SEM_PLANEJAR') scores.behavioral -= 1

  if (responses.financialBehavior.trackingFrequency === 'TODA_SEMANA') scores.behavioral += 1
  else if (responses.financialBehavior.trackingFrequency === 'RARAMENTE') scores.behavioral -= 1

  if (responses.financialBehavior.moneyPriority === 'GUARDA_INVESTE') scores.behavioral += 1
  else if (responses.financialBehavior.moneyPriority === 'GASTA') scores.behavioral -= 1

  // Score de risco (1-3)
  if (responses.riskProfile.investmentProfile === 'CONSERVADOR') scores.risk = 1
  else if (responses.riskProfile.investmentProfile === 'MODERADO') scores.risk = 2
  else scores.risk = 3

  // Score de execução baseado na disposição para ajuste
  if (responses.executionCapacity.willingnessToAdjust === 'REDUZ_SIGNIFICATIVO') scores.execution = 5
  else if (responses.executionCapacity.willingnessToAdjust === 'AJUSTA_ALGUNS') scores.execution = 3
  else scores.execution = 1

  scores.total = scores.financial + scores.behavioral

  return scores
}

function determineProfileType(scores: any): 'CONTROLE' | 'RECUPERACAO' | 'CRESCIMENTO' {
  if (scores.total <= -1) return 'RECUPERACAO'
  if (scores.total >= 2) return 'CRESCIMENTO'
  return 'CONTROLE'
}

function analyzeRiskProfile(responses: AnamnesisResponse) {
  let score = 0
  const factors: string[] = []

  if (responses.riskProfile.investmentProfile === 'CONSERVADOR') {
    score += 1
    factors.push('Perfil conservador declarado')
  } else if (responses.riskProfile.investmentProfile === 'MODERADO') {
    score += 2
    factors.push('Perfil moderado declarado')
  } else {
    score += 3
    factors.push('Perfil agressivo declarado')
  }

  if (responses.riskProfile.lossReaction === 'EVITA_RISCO') {
    score -= 0.5
    factors.push('Aversão a perdas')
  } else if (responses.riskProfile.lossReaction === 'BUSCA_RETORNO_RISCO') {
    score += 0.5
    factors.push('Tolerância a perdas')
  }

  if (responses.lifeMoment.hasDependents) {
    score -= 0.3
    factors.push('Dependentes financeiros')
  }

  if (responses.lifeMoment.careerStage === 'INICIO_CARREIRA') {
    score += 0.2
    factors.push('Início de carreira')
  }

  const normalizedScore = Math.max(1, Math.min(3, score))
  let level: 'CONSERVADOR' | 'MODERADO' | 'AGRESSIVO' = 'CONSERVADOR'
  if (normalizedScore >= 2.3) level = 'AGRESSIVO'
  else if (normalizedScore >= 1.7) level = 'MODERADO'

  return {
    score: normalizedScore,
    level,
    factors,
    tolerance: calculateRiskTolerance(responses),
    capacity: calculateRiskCapacity(responses),
  }
}

function calculateRiskTolerance(responses: AnamnesisResponse): number {
  let tolerance = 0.5

  if (responses.riskProfile.lossReaction === 'EVITA_RISCO') tolerance -= 0.3
  else if (responses.riskProfile.lossReaction === 'BUSCA_RETORNO_RISCO') tolerance += 0.3

  if (responses.cardsInstallments.installmentFrequency === 'NUNCA') tolerance += 0.1
  else if (responses.cardsInstallments.installmentFrequency === 'FREQUENTEMENTE') tolerance -= 0.1

  return Math.max(0, Math.min(1, tolerance))
}

function calculateRiskCapacity(responses: AnamnesisResponse): number {
  let capacity = 0.5

  if (responses.financialContext.financialSituation === 'ORGANIZADA') capacity += 0.3
  else if (responses.financialContext.financialSituation === 'CRITICA') capacity -= 0.3

  if (responses.financialContext.incomeType === 'FIXA') capacity += 0.2
  else if (responses.financialContext.incomeType === 'VARIAVEL') capacity -= 0.1

  if (!responses.lifeMoment.hasDependents) capacity += 0.1

  return Math.max(0, Math.min(1, capacity))
}

function generateAdvancedStrategies(
  profileType: string,
  riskAnalysis: any,
  responses: AnamnesisResponse
): Strategy[] {
  const strategies: Strategy[] = []

  if (profileType === 'RECUPERACAO') {
    strategies.push({
      area: 'ESTABILIZACAO FINANCEIRA',
      priority: 'ALTA',
      description: 'Recuperação do controle financeiro através de ações emergenciais',
      actions: [
        'Mapear todas as dívidas com juros',
        'Negociar parcelamentos e redução de juros',
        'Criar fluxo de caixa emergencial',
        'Implementar corte de gastos supérfluos',
        'Buscar fontes de renda complementar',
      ],
      expectedResults: [
        'Redução de 30% nas despesas não essenciais',
        'Economia mínima de 10% da renda',
        'Plano de quitação de dívidas em 12 meses',
      ],
      timeframe: '3-6 meses',
      complexity: 'ALTA',
    })
    strategies.push({
      area: 'RESERVA DE EMERGENCIA',
      priority: 'ALTA',
      description: 'Construção de fundo de segurança para imprevistos',
      actions: [
        'Definir meta de 3 meses de despesas',
        'Criar conta separada para emergência',
        'Automatizar depósitos mensais',
        'Vender bens não utilizados',
        'Aplicar em renda fixa líquida',
      ],
      expectedResults: [
        'Reserva inicial de R$ 1.000',
        'Meta completa em 8-12 meses',
        'Segurança para despesas inesperadas',
      ],
      timeframe: '6-12 meses',
      complexity: 'MEDIA',
    })
  } else if (profileType === 'CONTROLE') {
    strategies.push({
      area: 'OTIMIZACAO DO CONTROLE',
      priority: 'MEDIA',
      description: 'Sistema robusto de acompanhamento financeiro',
      actions: [
        'Implementar upload semanal de extratos',
        'Configurar categorização automática',
        'Criar dashboard personalizado',
        'Estabelecer metas por categoria',
        'Revisar orçamento mensalmente',
      ],
      expectedResults: [
        'Visão 100% das finanças',
        'Economia de 15-20% com otimização',
        'Decisões baseadas em dados',
      ],
      timeframe: '1-3 meses',
      complexity: 'BAIXA',
    })
    strategies.push({
      area: 'METAS E OBJETIVOS',
      priority: 'MEDIA',
      description: 'Estruturação de planejamento financeiro de longo prazo',
      actions: [
        'Definir metas SMART financeiras',
        'Criar plano de ação para cada meta',
        'Acompanhar progresso mensalmente',
        'Ajustar estratégias conforme necessário',
        'Celebrar conquistas parciais',
      ],
      expectedResults: [
        'Clareza nos objetivos financeiros',
        'Motivação aumentada',
        'Alcance de metas 30% mais rápido',
      ],
      timeframe: '3-6 meses',
      complexity: 'MEDIA',
    })
  } else {
    strategies.push({
      area: 'MAXIMIZACAO DE RETORNOS',
      priority: 'ALTA',
      description: 'Otimização avançada do portfolio para crescimento acelerado',
      actions: [
        'Analisar alocação de ativos atual',
        'Diversificar para classes de maior retorno',
        'Implementar estratégias de tax loss harvesting',
        'Rebalancear portfolio trimestralmente',
        'Explorar oportunidades internacionais',
      ],
      expectedResults: [
        'Retorno adicional de 2-4% ao ano',
        'Portfolio otimizado para perfil',
        'Risco diversificado e controlado',
      ],
      timeframe: '6-12 meses',
      complexity: 'ALTA',
    })
  }

  if (riskAnalysis.level === 'CONSERVADOR') {
    strategies.push({
      area: 'PRESERVACAO DE CAPITAL',
      priority: 'ALTA',
      description: 'Estratégias focadas em segurança e liquidez',
      actions: [
        'Alocar 70% em renda fixa pós-fixada',
        'Diversificar entre Tesouro, CDB e LC',
        'Manter 10% em alta liquidez',
        'Investir 20% em fundos conservadores',
        'Revisar carteira semestralmente',
      ],
      expectedResults: [
        'Preservação do capital inflacionário',
        'Renda previsível e estável',
        'Liquidez para emergências',
      ],
      timeframe: 'Contínuo',
      complexity: 'BAIXA',
    })
  } else if (riskAnalysis.level === 'MODERADO') {
    strategies.push({
      area: 'BALANCEAMENTO RISCO/RETORNO',
      priority: 'ALTA',
      description: 'Estratégia equilibrada entre segurança e crescimento',
      actions: [
        'Alocar 40% em renda fixa',
        'Investir 30% em ações de blue chips',
        'Diversificar 20% em fundos multimercado',
        'Explorar 10% em oportunidades alternativas',
        'Rebalancear quadrimestralmente',
      ],
      expectedResults: [
        'Retorno acima da inflação + CDI',
        'Risco moderado e controlado',
        'Potencial de crescimento sólido',
      ],
      timeframe: 'Contínuo',
      complexity: 'MEDIA',
    })
  } else {
    strategies.push({
      area: 'CRESCIMENTO AGRESSIVO',
      priority: 'ALTA',
      description: 'Estratégias de alto potencial de retorno',
      actions: [
        'Alocar 20% em renda fixa estratégica',
        'Investir 50% em ações growth',
        'Diversificar 15% em criptoativos',
        'Explorar 10% em startups/Equity',
        'Manter 5% para oportunidades pontuais',
      ],
      expectedResults: [
        'Potencial de retorno > 15% ao ano',
        'Portfolio diversificado em alto crescimento',
        'Exposição a tecnologias disruptivas',
      ],
      timeframe: 'Contínuo',
      complexity: 'ALTA',
    })
  }

  return strategies
}

function generateIntelligentRecommendations(
  responses: AnamnesisResponse,
  scores: any
): Recommendation[] {
  const recommendations: Recommendation[] = []

  if (responses.financialBehavior.trackingFrequency === 'RARAMENTE') {
    recommendations.push({
      type: 'HABITO',
      priority: 'ALTA',
      title: 'Estabelecer Rotina de Acompanhamento',
      description: 'Crie o hábito de revisar suas finanças semanalmente para manter o controle',
      benefits: [
        'Visão clara da situação financeira',
        'Detecção precoce de problemas',
        'Tomada de decisões mais informada',
      ],
      implementation: [
        'Defina dia e horário fixo na semana',
        'Configure lembretes no celular',
        'Use checklist de verificação',
        'Anote insights e aprendizados',
      ],
    })
  }

  if (responses.budgetControl.budgetHandling === 'NAO_FAZ_ORCAMENTO') {
    recommendations.push({
      type: 'PLANEJAMENTO',
      priority: 'ALTA',
      title: 'Implementar Sistema de Orçamento',
      description: 'Crie limites de gastos por categoria para controlar despesas e alcançar metas',
      benefits: [
        'Controle efetivo dos gastos',
        'Redução de despesas desnecessárias',
        'Aceleração do alcance de metas',
      ],
      implementation: [
        'Analise 3 meses de gastos passados',
        'Defina categorias e limites realistas',
        'Use método 50/30/20 como base',
        'Ajuste conforme sua realidade',
      ],
    })
  }

  if (scores.financial < 0) {
    recommendations.push({
      type: 'EDUCACAO',
      priority: 'MEDIA',
      title: 'Desenvolver Conhecimento Financeiro',
      description: 'Invista em sua educação financeira para tomar melhores decisões',
      benefits: [
        'Autonomia nas decisões financeiras',
        'Redução de erros comuns',
        'Maior confiança para investir',
      ],
      implementation: [
        'Leia livros básicos de finanças',
        'Faça cursos online gratuitos',
        'Siga especialistas financeiros',
        'Pratique com pequenos investimentos',
      ],
    })
  }

  if (!responses.objectives.hasGoals || responses.objectives.goals.length === 0) {
    recommendations.push({
      type: 'OBJETIVOS',
      priority: 'MEDIA',
      title: 'Definir Metas Financeiras',
      description: 'Estabeleça objetivos claros e mensuráveis para direcionar seus esforços',
      benefits: [
        'Foco e motivação aumentados',
        'Planejamento mais eficaz',
        'Mensuração do progresso',
      ],
      implementation: [
        'Use framework SMART',
        'Priorize 3-5 metas principais',
        'Defina prazos realistas',
        'Revise e ajuste periodicamente',
      ],
    })
  }

  return recommendations
}

function generateDeepInsights(responses: AnamnesisResponse, scores: any): Insight[] {
  const insights: Insight[] = []

  const behaviorConsistency =
    (responses.financialBehavior.moneyHandling === 'PLANEJA_ANTES' &&
      responses.budgetControl.budgetHandling !== 'NAO_FAZ_ORCAMENTO') ||
    (responses.financialBehavior.moneyHandling === 'GASTA_SEM_PLANEJAR' &&
      responses.budgetControl.budgetHandling === 'NAO_FAZ_ORCAMENTO')

  if (behaviorConsistency) {
    insights.push({
      category: 'COMPORTAMENTO',
      title: 'Alinhamento Comportamental',
      description: 'Seu comportamento financeiro está alinhado com suas práticas de orçamento',
      impact: 'POSITIVO',
      confidence: 0.85,
    })
  } else {
    insights.push({
      category: 'COMPORTAMENTO',
      title: 'Incoerência Comportamental',
      description: 'Há desconexão entre como você lida com dinheiro e suas práticas de orçamento',
      impact: 'NEGATIVO',
      confidence: 0.75,
    })
  }

  if (
    responses.riskProfile.investmentProfile === 'AGRESSIVO' &&
    responses.financialContext.financialSituation === 'CRITICA'
  ) {
    insights.push({
      category: 'RISCO',
      title: 'Risco Acima da Capacidade',
      description: 'Sua tolerância ao risco é maior que sua situação financeira atual permite',
      impact: 'NEGATIVO',
      confidence: 0.9,
    })
  }

  if (
    responses.lifeMoment.hasDependents &&
    responses.executionCapacity.willingnessToAdjust === 'MANTEM_TUDO'
  ) {
    insights.push({
      category: 'RESPONSABILIDADE',
      title: 'Responsabilidade vs Flexibilidade',
      description: 'Com dependentes financeiros, a flexibilidade para ajustar gastos se torna crucial',
      impact: 'NEGATIVO',
      confidence: 0.8,
    })
  }

  return insights
}

function generateActionPlan(
  profileType: string,
  riskAnalysis: any,
  responses: AnamnesisResponse
): NextStep[] {
  const steps: NextStep[] = []

  if (profileType === 'RECUPERACAO') {
    steps.push({
      order: 1,
      title: 'Diagnóstico Financeiro Completo',
      description: 'Mapear detalhadamente toda situação financeira atual',
      estimatedTime: '1 semana',
      requiredActions: [
        'Listar todas as dívidas com juros',
        'Mapear todas as fontes de renda',
        'Categorizar todos os gastos',
        'Calcular patrimônio líquido',
      ],
      dependencies: [],
    })
    steps.push({
      order: 2,
      title: 'Plano de Emergência',
      description: 'Criar plano de ação imediata para estabilização',
      estimatedTime: '2 semanas',
      requiredActions: [
        'Negociar dívidas prioritárias',
        'Cortar gastos não essenciais',
        'Criar fluxo de caixa mínimo',
        'Buscar renda extra urgente',
      ],
      dependencies: ['Diagnóstico Financeiro Completo'],
    })
  } else if (profileType === 'CONTROLE') {
    steps.push({
      order: 1,
      title: 'Sistema de Controle',
      description: 'Implementar estrutura robusta de acompanhamento',
      estimatedTime: '2 semanas',
      requiredActions: [
        'Configurar upload de extratos',
        'Definir categorias personalizadas',
        'Criar dashboard inicial',
        'Estabelecer rotina semanal',
      ],
      dependencies: [],
    })
    steps.push({
      order: 2,
      title: 'Metas Financeiras',
      description: 'Definir e estruturar objetivos claros',
      estimatedTime: '1 semana',
      requiredActions: [
        'Brainstorm de objetivos',
        'Priorizar metas principais',
        'Definir prazos e valores',
        'Criar plano de ação',
      ],
      dependencies: ['Sistema de Controle'],
    })
  } else {
    steps.push({
      order: 1,
      title: 'Análise de Portfolio',
      description: 'Avaliar e otimizar investimentos atuais',
      estimatedTime: '1 semana',
      requiredActions: [
        'Levantar todos os investimentos',
        'Calcular rentabilidade real',
        'Analisar alocação de ativos',
        'Identificar oportunidades',
      ],
      dependencies: [],
    })
    steps.push({
      order: 2,
      title: 'Estratégia de Otimização',
      description: 'Implementar plano de maximização de retornos',
      estimatedTime: '2-3 semanas',
      requiredActions: [
        'Rebalancear portfolio',
        'Diversificar classes de ativos',
        'Implementar tax loss harvesting',
        'Explorar novas oportunidades',
      ],
      dependencies: ['Análise de Portfolio'],
    })
  }

  return steps
}

function determineAutomationLevel(responses: AnamnesisResponse): 'BAIXO' | 'MEDIO' | 'ALTO' {
  let level = 0

  if (
    responses.dataImport.preferredFormat === 'PDF' ||
    responses.dataImport.preferredFormat === 'EXCEL_CSV'
  ) {
    level += 1
  }

  if (responses.financialBehavior.trackingFrequency === 'TODA_SEMANA') {
    level += 1
  }

  if (responses.executionCapacity.willingnessToAdjust === 'REDUZ_SIGNIFICATIVO') {
    level += 1
  }

  if (level >= 2) return 'ALTO'
  if (level >= 1) return 'MEDIO'
  return 'BAIXO'
}

function determineInterventionLevel(
  responses: AnamnesisResponse,
  scores: any
): 'SUAVE' | 'MODERADO' | 'INTENSO' {
  if (responses.financialContext.financialSituation === 'CRITICA') {
    return 'INTENSO'
  }

  if (responses.executionCapacity.willingnessToAdjust === 'REDUZ_SIGNIFICATIVO') {
    return 'MODERADO'
  }

  if (scores.total <= -2) {
    return 'MODERADO'
  }

  return 'SUAVE'
}
