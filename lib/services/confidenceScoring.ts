import { pipelineLogger } from '@/lib/utils/logger'

export interface ConfidenceScore {
  score: number
  status: 'AUTO_APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED'
  reasons: string[]
  recommendations: string[]
}

/**
 * Calcula score de confiança baseado em múltiplos fatores
 */
export function calculateConfidenceScore(
  transaction: {
    date: Date
    amount: number
    description: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  },
  source: 'STRUCTURED' | 'REGEX' | 'AI' | 'OCR',
  merchantMapping?: any,
  parsingConfidence?: number
): ConfidenceScore {
  let score = 0.5 // Base score
  const reasons: string[] = []
  const recommendations: string[] = []

  // 1. Fonte dos dados (30% do peso)
  const sourceScores = {
    'STRUCTURED': 0.3,
    'REGEX': 0.2,
    'AI': 0.25,
    'OCR': 0.1
  }
  score += sourceScores[source] || 0.1
  reasons.push(`Fonte: ${source} (+${sourceScores[source] || 0.1})`)

  // 2. Confiança do parsing (25% do peso)
  if (parsingConfidence) {
    score += parsingConfidence * 0.25
    reasons.push(`Parsing: ${(parsingConfidence * 100).toFixed(1)}% (+${(parsingConfidence * 0.25).toFixed(3)})`)
  }

  // 3. Mapeamento de merchant (20% do peso)
  if (merchantMapping) {
    const merchantScore = Math.min(merchantMapping.confidence, 0.9) * 0.2
    score += merchantScore
    reasons.push(`Merchant mapping: ${(merchantMapping.confidence * 100).toFixed(1)}% (+${merchantScore.toFixed(3)})`)
    
    if (merchantMapping.usageCount > 5) {
      score += 0.05 // Bônus por uso frequente
      reasons.push(`Merchant mapping bem estabelecido (+0.05)`)
    }
  } else {
    reasons.push('Sem merchant mapping (-0.1)')
    score -= 0.1
  }

  // 4. Qualidade da descrição (15% do peso)
  const descriptionQuality = analyzeDescriptionQuality(transaction.description)
  score += descriptionQuality.score * 0.15
  reasons.push(...descriptionQuality.reasons)

  // 5. Validação dos dados (10% do peso)
  const dataValidation = validateTransactionData(transaction)
  score += dataValidation.score * 0.1
  reasons.push(...dataValidation.reasons)

  // Garante que score fica entre 0 e 1
  score = Math.max(0, Math.min(1, score))

  // Determina status baseado no score
  let status: 'AUTO_APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED'
  
  if (score >= 0.85) {
    status = 'AUTO_APPROVED'
    recommendations.push('Transação aprovada automaticamente')
  } else if (score >= 0.6) {
    status = 'REVIEW_REQUIRED'
    recommendations.push('Revisar categoria e valores')
    recommendations.push('Confirmar data e descrição')
  } else {
    status = 'REJECTED'
    recommendations.push('Transação rejeitada - revisar manualmente')
    recommendations.push('Verificar origem dos dados')
    recommendations.push('Possível erro de parsing')
  }

  return {
    score,
    status,
    reasons,
    recommendations
  }
}

/**
 * Analisa qualidade da descrição
 */
function analyzeDescriptionQuality(description: string): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0.5

  // Comprimento adequado
  if (description.length >= 5 && description.length <= 100) {
    score += 0.2
    reasons.push('Descrição com tamanho adequado (+0.2)')
  } else {
    reasons.push('Descrição com tamanho inadequado (-0.1)')
    score -= 0.1
  }

  // Contém números suspeitos
  const suspiciousPatterns = [
    /\d{4,}/, // Sequências longas de números
    /XXX/i, // Marcadores de teste
    /TEST/i,
    /DEMO/i
  ]

  const hasSuspicious = suspiciousPatterns.some(pattern => pattern.test(description))
  if (hasSuspicious) {
    score -= 0.3
    reasons.push('Descrição contém padrões suspeitos (-0.3)')
  } else {
    score += 0.1
    reasons.push('Descrição sem padrões suspeitos (+0.1)')
  }

  // Palavras-chave positivas
  const positiveKeywords = [
    'supermercado', 'mercado', 'restaurante', 'posto', 'farmacia',
    'salario', 'recebimento', 'transferencia', 'pagamento'
  ]

  const hasPositiveKeywords = positiveKeywords.some(keyword => 
    description.toLowerCase().includes(keyword)
  )
  if (hasPositiveKeywords) {
    score += 0.1
    reasons.push('Descrição contém palavras-chave reconhecidas (+0.1)')
  }

  return { score: Math.max(0, Math.min(1, score)), reasons }
}

/**
 * Valida dados da transação
 */
function validateTransactionData(transaction: {
  date: Date
  amount: number
  description: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0.5

  // Data válida
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

  if (transaction.date >= oneYearAgo && transaction.date <= oneMonthFuture) {
    score += 0.3
    reasons.push('Data em período razoável (+0.3)')
  } else {
    score -= 0.2
    reasons.push('Data fora de período razoável (-0.2)')
  }

  // Valor válido
  if (transaction.amount > 0 && transaction.amount < 1000000) {
    score += 0.2
    reasons.push('Valor em faixa razoável (+0.2)')
  } else {
    score -= 0.3
    reasons.push('Valor fora de faixa razoável (-0.3)')
  }

  // Tipo válido
  if (['INCOME', 'EXPENSE', 'TRANSFER'].includes(transaction.type)) {
    score += 0.2
    reasons.push('Tipo de transação válido (+0.2)')
  } else {
    score -= 0.2
    reasons.push('Tipo de transação inválido (-0.2)')
  }

  return { score: Math.max(0, Math.min(1, score)), reasons }
}

/**
 * Aplica score de confiança no processo de persistência
 */
export async function applyConfidenceFilter(
  transactions: Array<{
    date: Date
    amount: number
    description: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  }>,
  source: 'STRUCTURED' | 'REGEX' | 'AI' | 'OCR'
): Promise<{
  approved: any[]
  review: any[]
  rejected: any[]
  stats: {
    total: number
    approved: number
    review: number
    rejected: number
    avgScore: number
  }
}> {
  const approved = []
  const review = []
  const rejected = []
  let totalScore = 0

  for (const tx of transactions) {
    const confidence = calculateConfidenceScore(tx, source)
    totalScore += confidence.score

    const enrichedTx = {
      ...tx,
      confidenceScore: confidence.score,
      confidenceStatus: confidence.status,
      confidenceReasons: confidence.reasons,
      confidenceRecommendations: confidence.recommendations
    }

    if (confidence.status === 'AUTO_APPROVED') {
      approved.push(enrichedTx)
    } else if (confidence.status === 'REVIEW_REQUIRED') {
      review.push(enrichedTx)
    } else {
      rejected.push(enrichedTx)
    }

    // Log individual
    pipelineLogger.info(`Transaction classified with confidence ${confidence.score.toFixed(3)}`, {
      status: confidence.status,
      description: tx.description,
      amount: tx.amount
    })
  }

  const stats = {
    total: transactions.length,
    approved: approved.length,
    review: review.length,
    rejected: rejected.length,
    avgScore: totalScore / transactions.length
  }

  pipelineLogger.info('Confidence filtering completed', stats)

  return { approved, review, rejected, stats }
}
