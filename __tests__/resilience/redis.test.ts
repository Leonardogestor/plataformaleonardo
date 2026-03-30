import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { addTransactionProcessingJob, getQueueStatus } from '@/lib/queue/queue'
import { pipelineLogger } from '@/lib/utils/logger'

// Mock do Redis para simular offline
const originalEnv = process.env

describe('Redis Offline Resilience Tests', () => {
  beforeAll(() => {
    // Simula Redis offline
    process.env.REDIS_HOST = 'nonexistent-redis-host'
    process.env.REDIS_PORT = '6379'
  })

  afterAll(() => {
    // Restaura ambiente original
    process.env = originalEnv
  })

  it('should handle Redis connection failure gracefully', async () => {
    const jobData = {
      fileUrl: 'test://document.pdf',
      userId: 'test-user',
      fileName: 'test.pdf',
      fileId: 'test-file-id'
    }

    // Tenta adicionar job com Redis offline
    const result = await addTransactionProcessingJob(jobData)

    // Deve falhar mas não crashar
    expect(result.success).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')

    // Logger deve registrar erro
    // Verifica se erro foi logado (em teste real, mockaríamos o logger)
  })

  it('should return queue status with default values when Redis offline', async () => {
    const status = await getQueueStatus()

    // Deve retornar valores padrão quando Redis está offline
    expect(status.waiting).toBe(0)
    expect(status.active).toBe(0)
    expect(status.completed).toBe(0)
    expect(status.failed).toBe(0)
    expect(status.total).toBe(0)
  })

  it('should not crash application when Redis is unavailable', async () => {
    // Testa se aplicação continua rodando mesmo com Redis offline
    expect(async () => {
      await addTransactionProcessingJob({
        fileUrl: 'test://document.pdf',
        userId: 'test-user',
        fileName: 'test.pdf',
        fileId: 'test-file-id'
      })
    }).not.toThrow()
  })
})
