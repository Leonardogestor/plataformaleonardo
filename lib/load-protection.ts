/**
 * Proteção Contra Sobrecarga - Load Testing Real
 * Simula e trata cenários reais de múltiplos usuários
 */

import { concurrencyController } from "./concurrency-control"
import { userConcurrencyController } from "./user-concurrency-control"
// import { resilienceManager } from "./resilience-degradation" // Desabilitado temporariamente

// Import externo com fallback
let externalResilience: any
try {
  externalResilience = require("./external-resilience").externalResilience
} catch {
  externalResilience = {
    shouldUseFallback: () => false,
  }
}

export interface LoadTestScenario {
  name: string
  description: string
  users: number
  duration: number // ms
  operations: LoadOperation[]
}

export interface LoadOperation {
  type: "pdf_upload" | "ai_request" | "dashboard_load" | "transaction_create" | "sync_request"
  weight: number // 1-10, peso na frequência
  delay: number // delay entre operações (ms)
  timeout: number // timeout da operação (ms)
  parallel: boolean // se pode executar em paralelo
}

export interface LoadTestResult {
  scenario: string
  startTime: number
  endTime: number
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  p95ResponseTime: number
  errors: Array<{
    operation: string
    error: string
    count: number
  }>
  systemState: {
    finalState: string
    servicesAvailable: Record<string, boolean>
    queueSizes: Record<string, number>
    userLocksActive: number
  }
}

class LoadProtection {
  private static instance: LoadProtection
  private isRunning = false
  private currentTest: LoadTestResult | null = null
  private scenarios: Map<string, LoadTestScenario> = new Map()

  constructor() {
    this.initializeScenarios()
  }

  static getInstance(): LoadProtection {
    if (!this.instance) {
      this.instance = new LoadProtection()
    }
    return this.instance
  }

  private initializeScenarios() {
    // Cenário 1: 3 usuários simultâneos (leve)
    this.scenarios.set("light_load", {
      name: "Light Load",
      description: "3 usuários simultâneos, operações normais",
      users: 3,
      duration: 60000, // 1 minuto
      operations: [
        {
          type: "dashboard_load",
          weight: 5,
          delay: 2000,
          timeout: 5000,
          parallel: false,
        },
        {
          type: "pdf_upload",
          weight: 1,
          delay: 10000,
          timeout: 30000,
          parallel: false,
        },
        {
          type: "ai_request",
          weight: 2,
          delay: 5000,
          timeout: 15000,
          parallel: false,
        },
      ],
    })

    // Cenário 2: 5 usuários simultâneos (moderado)
    this.scenarios.set("moderate_load", {
      name: "Moderate Load",
      description: "5 usuários simultâneos, mix de operações",
      users: 5,
      duration: 120000, // 2 minutos
      operations: [
        {
          type: "dashboard_load",
          weight: 4,
          delay: 1500,
          timeout: 5000,
          parallel: false,
        },
        {
          type: "pdf_upload",
          weight: 2,
          delay: 8000,
          timeout: 30000,
          parallel: false,
        },
        {
          type: "ai_request",
          weight: 3,
          delay: 3000,
          timeout: 15000,
          parallel: false,
        },
        {
          type: "transaction_create",
          weight: 3,
          delay: 2000,
          timeout: 8000,
          parallel: false,
        },
      ],
    })

    // Cenário 3: 10 usuários simultâneos (pesado)
    this.scenarios.set("heavy_load", {
      name: "Heavy Load",
      description: "10 usuários simultâneos, operações intensivas",
      users: 10,
      duration: 180000, // 3 minutos
      operations: [
        {
          type: "dashboard_load",
          weight: 3,
          delay: 1000,
          timeout: 5000,
          parallel: false,
        },
        {
          type: "pdf_upload",
          weight: 3,
          delay: 5000,
          timeout: 30000,
          parallel: false,
        },
        {
          type: "ai_request",
          weight: 3,
          delay: 2000,
          timeout: 15000,
          parallel: false,
        },
        {
          type: "transaction_create",
          weight: 2,
          delay: 1500,
          timeout: 8000,
          parallel: false,
        },
        {
          type: "sync_request",
          weight: 1,
          delay: 10000,
          timeout: 30000,
          parallel: false,
        },
      ],
    })

    // Cenário 4: Upload simultâneo (crítico)
    this.scenarios.set("upload_stress", {
      name: "Upload Stress",
      description: "5 usuários fazendo upload simultâneo",
      users: 5,
      duration: 90000, // 1.5 minutos
      operations: [
        {
          type: "pdf_upload",
          weight: 5,
          delay: 2000,
          timeout: 30000,
          parallel: false,
        },
        {
          type: "dashboard_load",
          weight: 1,
          delay: 5000,
          timeout: 5000,
          parallel: false,
        },
      ],
    })
  }

  // Executar teste de carga
  async runLoadTest(scenarioName: string): Promise<LoadTestResult> {
    if (this.isRunning) {
      throw new Error("Load test already running")
    }

    const scenario = this.scenarios.get(scenarioName)
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`)
    }

    console.log(`[LoadProtection] Starting load test: ${scenarioName}`)
    this.isRunning = true

    const result: LoadTestResult = {
      scenario: scenarioName,
      startTime: Date.now(),
      endTime: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      p95ResponseTime: 0,
      errors: [],
      systemState: {
        finalState: "unknown",
        servicesAvailable: {},
        queueSizes: {},
        userLocksActive: 0,
      },
    }

    const responseTimes: number[] = []
    const operationPromises: Promise<void>[] = []

    try {
      // Iniciar usuários em paralelo
      for (let userId = 0; userId < scenario.users; userId++) {
        const userPromise = this.simulateUser(userId, scenario, result, responseTimes)
        operationPromises.push(userPromise)
      }

      // Aguardar todos os usuários terminarem
      await Promise.allSettled(operationPromises)

      result.endTime = Date.now()
      result.totalOperations = responseTimes.length
      result.successfulOperations = result.totalOperations - result.failedOperations

      // Calcular métricas
      if (responseTimes.length > 0) {
        result.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        result.maxResponseTime = Math.max(...responseTimes)
        result.minResponseTime = Math.min(...responseTimes)

        // Calcular P95
        const sortedTimes = responseTimes.sort((a, b) => a - b)
        const p95Index = Math.floor(sortedTimes.length * 0.95)
        result.p95ResponseTime = sortedTimes[p95Index] || 0
      }

      // Capturar estado final do sistema
      result.systemState = this.captureSystemState()

      console.log(`[LoadProtection] Load test completed: ${scenarioName}`)
      console.log(
        `[LoadProtection] Operations: ${result.totalOperations}, Success: ${result.successfulOperations}, Failed: ${result.failedOperations}`
      )
    } catch (error) {
      console.error(`[LoadProtection] Load test failed:`, error)
      result.errors.push({
        operation: "test_execution",
        error: error instanceof Error ? error.message : String(error),
        count: 1,
      })
    } finally {
      this.isRunning = false
      this.currentTest = result
    }

    return result
  }

  // Simular comportamento de um usuário
  private async simulateUser(
    userId: number,
    scenario: LoadTestScenario,
    result: LoadTestResult,
    responseTimes: number[]
  ): Promise<void> {
    const startTime = Date.now()
    const endTime = startTime + scenario.duration

    while (Date.now() < endTime) {
      try {
        // Selecionar operação baseado nos pesos
        const operation = this.selectOperation(scenario.operations)

        if (!operation) {
          throw new Error("No operation available")
        }

        // Executar operação
        const operationResult = await this.executeOperation(
          `user_${userId}`,
          operation,
          responseTimes,
          result
        )

        if (!operationResult.success) {
          result.failedOperations++
        }

        // Esperar antes da próxima operação
        await new Promise((resolve) => setTimeout(resolve, operation.delay))
      } catch (error) {
        result.failedOperations++
        console.error(`[LoadProtection] User ${userId} operation failed:`, error)
      }
    }

    console.log(`[LoadProtection] User ${userId} completed simulation`)
  }

  private selectOperation(operations: LoadOperation[]): LoadOperation | undefined {
    const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0)
    let random = Math.random() * totalWeight

    for (const operation of operations) {
      random -= operation.weight
      if (random <= 0) {
        return operation
      }
    }

    return operations[0] // Fallback
  }

  private async executeOperation(
    userId: string,
    operation: LoadOperation,
    responseTimes: number[],
    result: LoadTestResult
  ): Promise<{ success: boolean; responseTime: number }> {
    const startTime = Date.now()

    try {
      switch (operation.type) {
        case "dashboard_load":
          await this.executeDashboardLoad(userId, operation.timeout)
          break
        case "pdf_upload":
          await this.executePDFUpload(userId, operation.timeout)
          break
        case "ai_request":
          await this.executeAIRequest(userId, operation.timeout)
          break
        case "transaction_create":
          await this.executeTransactionCreate(userId, operation.timeout)
          break
        case "sync_request":
          await this.executeSyncRequest(userId, operation.timeout)
          break
        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }

      const responseTime = Date.now() - startTime
      responseTimes.push(responseTime)

      return { success: true, responseTime }
    } catch (error) {
      const responseTime = Date.now() - startTime
      responseTimes.push(responseTime)

      // Registrar erro
      const errorMessage = error instanceof Error ? error.message : String(error)
      const existingError = result.errors.find((e) => e.operation === operation.type)

      if (existingError) {
        existingError.count++
      } else {
        result.errors.push({
          operation: operation.type,
          error: errorMessage,
          count: 1,
        })
      }

      return { success: false, responseTime }
    }
  }

  private async executeDashboardLoad(userId: string, timeout: number): Promise<void> {
    // Simular carregamento do dashboard
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500))

    // Verificar se sistema está saudável
    // const systemStatus = resilienceManager.getSystemStatus()
    // if (systemStatus.state === "emergency") {
    //   throw new Error("System in emergency state")
    // }
  }

  private async executePDFUpload(userId: string, timeout: number): Promise<void> {
    // Simular upload de PDF
    const acquired = await userConcurrencyController.acquireLock(
      userId,
      `pdf_upload_${userId}`,
      timeout
    )

    if (!acquired) {
      throw new Error("Cannot acquire PDF lock - too many concurrent uploads")
    }

    try {
      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000 + 2000))

      // Verificar se processamento foi para fila
      const queueMetrics = concurrencyController.getMetrics()
      const pdfQueued = queueMetrics.queueStatus.pdf?.queued || 0

      if (pdfQueued > 10) {
        throw new Error("PDF queue too long")
      }
    } finally {
      userConcurrencyController.releaseLock(userId, `pdf_upload_${userId}`)
    }
  }

  private async executeAIRequest(userId: string, timeout: number): Promise<void> {
    // Simular requisição IA
    const acquired = await userConcurrencyController.acquireLock(
      userId,
      `ai_request_${userId}`,
      timeout
    )

    if (!acquired) {
      throw new Error("Cannot acquire AI lock - too many concurrent requests")
    }

    try {
      // Verificar se OpenAI está disponível
      if (!externalResilience.shouldUseFallback("openai")) {
        // Simular chamada IA
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 3000 + 1000))
      } else {
        // Usar fallback
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } finally {
      userConcurrencyController.releaseLock(userId, `ai_request_${userId}`)
    }
  }

  private async executeTransactionCreate(userId: string, timeout: number): Promise<void> {
    // Simular criação de transação
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 200))

    // Verificar se banco está disponível
    if (!externalResilience.shouldUseFallback("database")) {
      // Simular operação de banco
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 100))
    }
  }

  private async executeSyncRequest(userId: string, timeout: number): Promise<void> {
    // Simular sincronização
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 8000 + 2000))

    // Verificar se Pluggy está disponível
    if (!externalResilience.shouldUseFallback("pluggy")) {
      // Simular chamada Pluggy
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500))
    }
  }

  private captureSystemState() {
    // const systemStatus = resilienceManager.getSystemStatus()
    const queueMetrics = concurrencyController.getMetrics()
    const userMetrics = userConcurrencyController.getGlobalMetrics()

    return {
      finalState: "healthy", // Default quando resilienceManager está desabilitado
      servicesAvailable: {
        openai: true, // Default quando não há monitoramento
        database: true,
        pdf: true,
      },
      queueSizes: {
        pdf: queueMetrics.queueStatus.pdf?.queued || 0,
        ai: queueMetrics.queueStatus.ai?.queued || 0,
        db: queueMetrics.queueStatus.db?.queued || 0,
      },
      userLocksActive: userMetrics.totalActiveLocks,
    }
  }

  // Obter resultado do último teste
  getLastTestResult(): LoadTestResult | null {
    return this.currentTest
  }

  // Verificar se sistema está sob carga
  isUnderLoad(): boolean {
    if (!this.currentTest) return false

    const now = Date.now()
    const testEnd = this.currentTest.endTime

    // Considera sob carga se teste terminou há menos de 1 minuto
    return now - testEnd < 60000
  }

  // Obter cenários disponíveis
  getAvailableScenarios(): Record<string, LoadTestScenario> {
    return Object.fromEntries(this.scenarios)
  }

  // Analisar resultado do teste
  analyzeTestResult(result: LoadTestResult): {
    overall: "excellent" | "good" | "warning" | "critical"
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Taxa de sucesso
    const successRate =
      result.totalOperations > 0 ? (result.successfulOperations / result.totalOperations) * 100 : 0

    if (successRate < 90) {
      issues.push(`Baixa taxa de sucesso: ${successRate.toFixed(1)}%`)
      recommendations.push("Verificar rate limiting e timeouts")
    }

    // Tempo de resposta
    if (result.p95ResponseTime > 5000) {
      issues.push(`P95 response time muito alto: ${result.p95ResponseTime}ms`)
      recommendations.push("Otimizar operações lentas ou aumentar timeouts")
    }

    if (result.maxResponseTime > 10000) {
      issues.push(`Response time máximo muito alto: ${result.maxResponseTime}ms`)
      recommendations.push("Investigar operações com picos de latência")
    }

    // Erros
    if (result.errors.length > 0) {
      const topError = result.errors.reduce((max, err) => (err.count > max.count ? err : max))
      issues.push(`Erro mais comum: ${topError.operation} (${topError.count} ocorrências)`)
      recommendations.push(`Investigar causa de erros em ${topError.operation}`)
    }

    // Estado do sistema
    if (
      result.systemState.finalState === "critical" ||
      result.systemState.finalState === "emergency"
    ) {
      issues.push(`Sistema em estado crítico: ${result.systemState.finalState}`)
      recommendations.push("Reduzir carga ou melhorar resiliência")
    }

    // Filas
    const totalQueued = Object.values(result.systemState.queueSizes).reduce((a, b) => a + b, 0)
    if (totalQueued > 20) {
      issues.push(`Filas muito longas: ${totalQueued} tarefas enfileiradas`)
      recommendations.push("Aumentar capacidade de processamento")
    }

    // Locks de usuário
    const userCount = parseInt((result.scenario || "").split(" ")[0] || "1") || 1
    if (result.systemState.userLocksActive > userCount * 2) {
      issues.push(`Muitos locks ativos: ${result.systemState.userLocksActive}`)
      recommendations.push("Revisar limites de concorrência por usuário")
    }

    // Determinar avaliação geral
    let overall: "excellent" | "good" | "warning" | "critical" = "excellent"

    if (issues.length >= 3 || successRate < 70 || result.systemState.finalState === "emergency") {
      overall = "critical"
    } else if (
      issues.length >= 2 ||
      successRate < 85 ||
      result.systemState.finalState === "critical"
    ) {
      overall = "warning"
    } else if (issues.length >= 1 || successRate < 95) {
      overall = "good"
    }

    return { overall, issues, recommendations }
  }
}

// Singleton global
export const loadProtection = LoadProtection.getInstance()

// Funções para uso fácil
export async function runLightLoadTest(): Promise<LoadTestResult> {
  return await loadProtection.runLoadTest("light_load")
}

export async function runModerateLoadTest(): Promise<LoadTestResult> {
  return await loadProtection.runLoadTest("moderate_load")
}

export async function runHeavyLoadTest(): Promise<LoadTestResult> {
  return await loadProtection.runLoadTest("heavy_load")
}

export async function runUploadStressTest(): Promise<LoadTestResult> {
  return await loadProtection.runLoadTest("upload_stress")
}

export function getLoadTestAnalysis(result: LoadTestResult) {
  return loadProtection.analyzeTestResult(result)
}
