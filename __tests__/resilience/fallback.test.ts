import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FallbackPipeline } from '@/lib/services/fallbackPipeline'
import { pipelineLogger } from '@/lib/utils/logger'

describe('Fallback Pipeline Tests', () => {
  let fallbackPipeline: FallbackPipeline

  beforeEach(() => {
    fallbackPipeline = new FallbackPipeline()
    vi.clearAllMocks()
  })

  it('should try structured parser first', async () => {
    const csvFile = new File([
      'date,description,amount',
      '2024-03-15,MERCADO,100.50',
      '2024-03-16,LOJA,50.00'
    ], 'test.csv', { type: 'text/csv' })

    const structuredSpy = vi.spyOn(fallbackPipeline as any, 'tryStructuredParser')
    
    await fallbackPipeline.extractWithFallback(csvFile, 'test-user')
    
    expect(structuredSpy).toHaveBeenCalled()
  })

  it('should fallback to regex when structured fails', async () => {
    const unstructuredFile = new File(['random text content'], 'test.txt', { type: 'text/plain' })
    
    // Mock structured parser para falhar
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Not structured'))
    
    const regexSpy = vi.spyOn(fallbackPipeline as any, 'tryRegexParser')
    
    await fallbackPipeline.extractWithFallback(unstructuredFile, 'test-user')
    
    expect(regexSpy).toHaveBeenCalled()
  })

  it('should fallback to AI when regex fails', async () => {
    const complexFile = new File(['complex unstructured data'], 'test.txt', { type: 'text/plain' })
    
    // Mock structured e regex para falhar
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Not structured'))
    vi.spyOn(fallbackPipeline as any, 'tryRegexParser').mockRejectedValue(new Error('No patterns found'))
    
    const aiSpy = vi.spyOn(fallbackPipeline as any, 'tryAIParser')
    
    await fallbackPipeline.extractWithFallback(complexFile, 'test-user')
    
    expect(aiSpy).toHaveBeenCalled()
  })

  it('should fallback to OCR as last resort', async () => {
    const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock todos os métodos para falhar
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Not structured'))
    vi.spyOn(fallbackPipeline as any, 'tryRegexParser').mockRejectedValue(new Error('No patterns found'))
    vi.spyOn(fallbackPipeline as any, 'tryAIParser').mockRejectedValue(new Error('AI failed'))
    
    const ocrSpy = vi.spyOn(fallbackPipeline as any, 'tryOCRParser')
    
    await fallbackPipeline.extractWithFallback(pdfFile, 'test-user')
    
    expect(ocrSpy).toHaveBeenCalled()
  })

  it('should return success when any method works', async () => {
    const goodFile = new File(['valid data'], 'test.csv', { type: 'text/csv' })
    
    // Mock structured parser para sucesso
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockResolvedValue({
      success: true,
      data: [{ date: '2024-03-15', description: 'TEST', amount: '100' }],
      source: 'STRUCTURED',
      confidence: 0.9
    })
    
    const result = await fallbackPipeline.extractWithFallback(goodFile, 'test-user')
    
    expect(result.success).toBe(true)
    expect(result.source).toBe('STRUCTURED')
    expect(result.confidence).toBe(0.9)
  })

  it('should return failure when all methods fail', async () => {
    const impossibleFile = new File(['impossible to parse'], 'test.xyz', { type: 'application/octet-stream' })
    
    // Mock todos os métodos para falhar
    vi.spyOn(fallbackPipeline as any, 'tryStructuredParser').mockRejectedValue(new Error('Structured failed'))
    vi.spyOn(fallbackPipeline as any, 'tryRegexParser').mockRejectedValue(new Error('Regex failed'))
    vi.spyOn(fallbackPipeline as any, 'tryAIParser').mockRejectedValue(new Error('AI failed'))
    vi.spyOn(fallbackPipeline as any, 'tryOCRParser').mockRejectedValue(new Error('OCR failed'))
    
    const result = await fallbackPipeline.extractWithFallback(impossibleFile, 'test-user')
    
    expect(result.success).toBe(false)
    expect(result.source).toBe('FAILED')
    expect(result.error).toContain('Todos os métodos de extração falharam')
  })

  it('should log each fallback attempt', async () => {
    const loggerSpy = vi.spyOn(pipelineLogger, 'info')
    
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    
    await fallbackPipeline.extractWithFallback(testFile, 'test-user')
    
    // Deve logar múltiplas tentativas
    expect(loggerSpy).toHaveBeenCalledTimes(4) // Structured, Regex, AI, OCR
  })

  it('should handle circuit breaker correctly', async () => {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    
    // Força múltiplas falhas para ativar circuit breaker
    vi.spyOn(fallbackPipeline as any, 'tryAIParser').mockRejectedValue(new Error('AI service down'))
    
    // Primeira chamada deve funcionar (fallback para regex)
    await fallbackPipeline.extractWithFallback(testFile, 'test-user')
    
    // Segunda chamada deve falhar AI novamente
    const result = await fallbackPipeline.extractWithFallback(testFile, 'test-user')
    
    // Circuit breaker deve estar aberto após falhas
    expect(result.success).toBe(false)
    expect(result.error).toContain('Circuit breaker')
  })
})
