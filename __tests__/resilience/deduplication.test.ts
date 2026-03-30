import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkTransactionDuplicate, checkBatchDuplicates } from '@/lib/services/deduplication'
import { prisma } from '@/lib/db'

// Mock do Prisma
const mockPrisma = vi.mocked(prisma)

describe('Transaction Deduplication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prevent duplicate transactions with same fingerprint', async () => {
    const transaction = {
      date: new Date('2024-03-15'),
      amount: 100.50,
      description: 'MERCADO EXEMPLO',
      type: 'EXPENSE' as const,
      userId: 'test-user'
    }

    // Primeira inserção deve sucesso
    const firstCheck = await checkTransactionDuplicate(transaction)
    expect(firstCheck.isDuplicate).toBe(false)

    // Mock segunda inserção para simular duplicata
    mockPrisma.transaction.findFirst.mockResolvedValueOnce({
      id: 'existing-transaction-id',
      fingerprint: 'test-fingerprint'
    } as any)

    // Segunda verificação deve detectar duplicata
    const secondCheck = await checkTransactionDuplicate(transaction)
    expect(secondCheck.isDuplicate).toBe(true)
    expect(secondCheck.existingTransaction?.id).toBe('existing-transaction-id')
  })

  it('should handle batch deduplication efficiently', async () => {
    const transactions = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(`2024-03-${15 + i}`),
      amount: 100 + i,
      description: `TRANSACTION ${i}`,
      type: 'EXPENSE' as const,
      userId: 'test-user'
    }))

    // Mock para retornar algumas duplicatas
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: 'dup-1', fingerprint: 'fp-1' },
      { id: 'dup-2', fingerprint: 'fp-2' }
    ] as any)

    const result = await checkBatchDuplicates(transactions)

    expect(result.total).toBe(100)
    expect(result.duplicates).toBe(2)
    expect(result.unique).toBe(98)
    expect(result.duplicateRate).toBe(0.02) // 2%
  })

  it('should generate consistent fingerprints', async () => {
    const transaction1 = {
      date: new Date('2024-03-15T10:30:00'),
      amount: 100.50,
      description: 'MERCADO EXEMPLO',
      type: 'EXPENSE' as const,
      userId: 'test-user'
    }

    const transaction2 = {
      date: new Date('2024-03-15T10:30:01'), // Diferença de 1 segundo
      amount: 100.50,
      description: 'MERCADO EXEMPLO',
      type: 'EXPENSE' as const,
      userId: 'test-user'
    }

    // Mock sem duplicatas
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    mockPrisma.transaction.findMany.mockResolvedValue([])

    const [check1, check2] = await Promise.all([
      checkTransactionDuplicate(transaction1),
      checkTransactionDuplicate(transaction2)
    ])

    // Fingerprints devem ser idênticos para transações idênticas
    expect(check1.fingerprint).toBe(check2.fingerprint)
  })

  it('should handle Decimal type correctly', async () => {
    const transaction = {
      date: new Date('2024-03-15'),
      amount: 100.50,
      description: 'MERCADO EXEMPLO',
      type: 'EXPENSE' as const,
      userId: 'test-user'
    }

    // Mock retornando Decimal do Prisma
    mockPrisma.transaction.findFirst.mockResolvedValue({
      id: 'existing-id',
      amount: new (100.50).constructor('Decimal'), // Simula tipo Decimal
      fingerprint: 'test-fingerprint'
    } as any)

    const result = await checkTransactionDuplicate(transaction)

    // Não deve crashar com tipo Decimal
    expect(result.isDuplicate).toBe(true)
  })
})
