import { describe, it, expect, vi } from 'vitest'
import { FallbackPipeline } from '@/lib/services/fallbackPipeline'
import { pipelineLogger } from '@/lib/utils/logger'

// Mock do OpenAI
const mockOpenAIFailure = vi.fn().mockImplementation(() => {
  throw new Error('OpenAI service unavailable')
})

describe('OpenAI Failure Resilience Tests', () => {
  let fallbackPipeline: FallbackPipeline

  beforeAll(() => {
    fallbackPipeline = new FallbackPipeline()
  })

  it('should fallback to regex when AI fails', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' })
    
    const result = await fallbackPipeline.extractWithFallback(mockFile, 'test-user')
    
    // Deve falhar AI mas ter sucesso com regex
    expect(result.success).toBe(true)
    expect(result.source).toBe('REGEX')
    expect(result.confidence).toBeGreaterThan(0.5) // Regex tem confiança média
  })

  it('should fallback to OCR when all parsing methods fail', async () => {
    const mockFile = new File(['unparseable content'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock para falhar todos os métodos
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Failed'))
    vi.spyOn(fallbackPipeline as any, 'tryRegexParser').mockRejectedValue(new Error('Failed'))
    vi.spyOn(fallbackPipeline as any, 'tryAIParser').mockRejectedValue(new Error('Failed'))
    
    const result = await fallbackPipeline.extractWithFallback(mockFile, 'test-user')
    
    // OCR deve ser o último recurso
    expect(result.success).toBe(true)
    expect(result.source).toBe('OCR')
    expect(result.confidence).toBeLessThan(0.6) // OCR tem confiança baixa
  })

  it('should log each fallback attempt', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' })
    
    // Mock logger para capturar chamadas
    const loggerSpy = vi.spyOn(pipelineLogger, 'info')
    
    await fallbackPipeline.extractWithFallback(mockFile, 'test-user')
    
    // Deve logar tentativas de fallback
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Structured parser succeeded'),
      expect.any(Object)
    )
  })

  it('should handle complete failure gracefully', async () => {
    const mockFile = new File(['unparseable content'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock para falhar todos os métodos
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Failed'))
    vi.spyOn(fallbackPipeline as any, 'tryRegexParser').mockRejectedValue(new Error('Failed'))
    vi.spyOn(fallbackPipeline as any, 'tryAIParser').mockRejectedValue(new Error('Failed'))
    vi.spyOn(fallbackPipeline as any, 'tryOCRParser').mockRejectedValue(new Error('Failed'))
    
    const result = await fallbackPipeline.extractWithFallback(mockFile, 'test-user')
    
    // Deve falhar completamente
    expect(result.success).toBe(false)
    expect(result.source).toBe('FAILED')
    expect(result.error).toContain('Todos os métodos de extração falharam')
  })
})
