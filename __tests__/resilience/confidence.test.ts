import { describe, it, expect, vi } from 'vitest'
import { calculateConfidenceScore, applyConfidenceFilter } from '@/lib/services/confidenceScoring'

describe('Confidence Score Tests', () => {
  it('should reject transactions with low confidence', () => {
    const transaction = {
      date: new Date('2024-03-15'),
      amount: 999999, // Valor suspeito
      description: 'XXX TEST TRANSACTION', // Descrição suspeita
      type: 'EXPENSE' as const
    }

    const confidence = calculateConfidenceScore(
      transaction,
      'OCR', // Pior fonte
      undefined, // Sem merchant mapping
      0.3 // Baixa confiança do parsing
    )

    expect(confidence.score).toBeLessThan(0.6)
    expect(confidence.status).toBe('REJECTED')
    expect(confidence.recommendations).toContain('Transação rejeitada')
  })

  it('should auto-approve high confidence transactions', () => {
    const transaction = {
      date: new Date('2024-03-15'),
      amount: 150.75,
      description: 'SUPERMERCADO SAO PAULO', // Descrição normal
      type: 'EXPENSE' as const
    }

    const merchantMapping = {
      id: 'merchant-1',
      rawDescription: 'SUPERMERCADO SAO PAULO',
      merchant: 'SUPERMERCADO',
      category: 'SUPERMERCADO',
      usageCount: 50,
      confidence: 0.95 // Alta confiança
    }

    const confidence = calculateConfidenceScore(
      transaction,
      'STRUCTURED', // Melhor fonte
      merchantMapping,
      0.9 // Alta confiança
    )

    expect(confidence.score).toBeGreaterThan(0.85)
    expect(confidence.status).toBe('AUTO_APPROVED')
    expect(confidence.recommendations).toContain('aprovada automaticamente')
  })

  it('should require review for medium confidence', () => {
    const transaction = {
      date: new Date('2024-03-15'),
      amount: 250.00,
      description: 'LOJA DESCONHECIDA', // Descrição genérica
      type: 'EXPENSE' as const
    }

    const confidence = calculateConfidenceScore(
      transaction,
      'AI', // Fonte média
      undefined, // Sem merchant mapping
      0.7 // Confiança média
    )

    expect(confidence.score).toBeGreaterThan(0.6)
    expect(confidence.score).toBeLessThan(0.85)
    expect(confidence.status).toBe('REVIEW_REQUIRED')
    expect(confidence.recommendations).toContain('Revisar categoria')
  })

  it('should filter transactions by confidence correctly', async () => {
    const transactions = [
      {
        date: new Date('2024-03-15'),
        amount: 100.00,
        description: 'MERCADO LOCAL',
        type: 'EXPENSE' as const
      },
      {
        date: new Date('2024-03-15'),
        amount: 999999.99,
        description: 'XXX SUSPICIOUS',
        type: 'EXPENSE' as const
      },
      {
        date: new Date('2024-03-15'),
        amount: 50.00,
        description: 'NORMAL STORE',
        type: 'EXPENSE' as const
      }
    ]

    const result = await applyConfidenceFilter(transactions, 'STRUCTURED')

    expect(result.stats.total).toBe(3)
    expect(result.stats.approved).toBe(2) // 2 transações normais
    expect(result.stats.review).toBe(0) // 0 para revisão
    expect(result.stats.rejected).toBe(1) // 1 suspeita
    expect(result.stats.avgScore).toBeGreaterThan(0.5) // Média razoável
  })

  it('should handle edge cases in confidence calculation', () => {
    // Teste com data futura
    const futureTransaction = {
      date: new Date('2025-12-31'), // 1 ano no futuro
      amount: 100.00,
      description: 'FUTURE TRANSACTION',
      type: 'EXPENSE' as const
    }

    const futureConfidence = calculateConfidenceScore(
      futureTransaction,
      'STRUCTURED',
      undefined,
      0.9
    )

    expect(futureConfidence.score).toBeLessThan(0.5) // Penalizado por data futura
    expect(futureConfidence.status).toBe('REJECTED')

    // Teste com valor zero
    const zeroTransaction = {
      date: new Date('2024-03-15'),
      amount: 0,
      description: 'ZERO VALUE',
      type: 'EXPENSE' as const
    }

    const zeroConfidence = calculateConfidenceScore(
      zeroTransaction,
      'STRUCTURED',
      undefined,
      0.9
    )

    expect(zeroConfidence.score).toBeLessThan(0.3) // Penalizado por valor zero
    expect(zeroConfidence.status).toBe('REJECTED')
  })
})
