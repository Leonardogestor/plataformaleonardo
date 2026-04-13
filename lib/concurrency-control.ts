import { DocumentStatus } from "@prisma/client"
/**
 * Controle de Concorrência - Anti-Caos
 * Fila simples, limites e priorização real
 */

export interface Task {
  id: string
  type: "pdf" | "ai" | "db" | "sync"
  userId: string
  priority: "low" | "medium" | "high" | "critical"
  data: any
  createdAt: number
  timeout: number
  maxRetries: number
}

export interface QueueConfig {
  maxSize: number
  maxConcurrency: number
  timeoutMs: number
  retryDelay: number
}

class ConcurrencyController {
  private static instance: ConcurrencyController
  private queues: Map<string, Task[]> = new Map()
  private processing: Map<string, Set<string>> = new Map()
  private workers: Map<string, number> = new Map()
  private configs: Map<string, QueueConfig> = new Map()
  private metrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    queuedTasks: 0,
    processingTasks: 0,
  }

  constructor() {
    this.initializeQueues()
    this.startWorkers()
  }

  static getInstance(): ConcurrencyController {
    if (!this.instance) {
      this.instance = new ConcurrencyController()
    }
    return this.instance
  }

  private initializeQueues() {
    // Configurações por tipo de tarefa
    this.configs.set("pdf", {
      maxSize: 50,
      maxConcurrency: 3,
      timeoutMs: 120000, // 2 minutos
      retryDelay: 5000,
    })

    this.configs.set("ai", {
      maxSize: 100,
      maxConcurrency: 5,
      timeoutMs: 60000, // 1 minuto
      retryDelay: 3000,
    })

    this.configs.set("db", {
      maxSize: 200,
      maxConcurrency: 10,
      timeoutMs: 30000, // 30 segundos
      retryDelay: 1000,
    })

    this.configs.set("sync", {
      maxSize: 30,
      maxConcurrency: 2,
      timeoutMs: 180000, // 3 minutos
      retryDelay: 10000,
    })

    // Inicializar filas vazias
    for (const [queueType] of this.configs) {
      this.queues.set(queueType, [])
      this.processing.set(queueType, new Set())
      this.workers.set(queueType, 0)
    }
  }

  private startWorkers() {
    for (const [queueType, config] of this.configs) {
      // Iniciar workers para cada tipo de fila
      for (let i = 0; i < config.maxConcurrency; i++) {
        this.startWorker(queueType, i)
      }
    }
  }

  private async startWorker(queueType: string, workerId: number) {
    const config = this.configs.get(queueType)!

    while (true) {
      try {
        const task = await this.getNextTask(queueType)

        if (!task) {
          // Sem tarefas, esperar um pouco
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }

        this.workers.set(queueType, (this.workers.get(queueType) || 0) + 1)
        this.metrics.processingTasks++

        await this.executeTask(queueType, workerId, task)
      } catch (error) {
        console.error(`[Concurrency] Worker ${queueType}-${workerId} error:`, error)
        await new Promise((resolve) => setTimeout(resolve, 5000)) // Esperar 5s em caso de erro
      } finally {
        this.workers.set(queueType, Math.max(0, (this.workers.get(queueType) || 0) - 1))
        this.metrics.processingTasks--
      }
    }
  }

  private async getNextTask(queueType: string): Promise<Task | null> {
    const queue = this.queues.get(queueType)!

    if (queue.length === 0) {
      return null
    }

    // Encontrar tarefa com maior prioridade
    let highestPriorityTask: Task | null = null
    let highestPriorityIndex = -1

    for (let i = 0; i < queue.length; i++) {
      const task = queue[i]

      if (
        task &&
        (!highestPriorityTask ||
          this.comparePriority(task?.priority || "low", highestPriorityTask.priority) > 0)
      ) {
        highestPriorityTask = task
        highestPriorityIndex = i
      }
    }

    if (highestPriorityTask) {
      queue.splice(highestPriorityIndex, 1)
      this.processing.get(queueType)!.add(highestPriorityTask.id)
    }

    return highestPriorityTask
  }

  private comparePriority(p1: string, p2: string): number {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return (
      priorityOrder[p1 as keyof typeof priorityOrder] -
      priorityOrder[p2 as keyof typeof priorityOrder]
    )
  }

  private async executeTask(queueType: string, workerId: number, task: Task) {
    const config = this.configs.get(queueType)!
    const processing = this.processing.get(queueType)!

    console.log(`[Concurrency] Worker ${queueType}-${workerId} executing task ${task.id}`)

    try {
      // Executar com timeout
      const result = await Promise.race([
        this.executeTaskLogic(task),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Task timeout")), task.timeout)
        ),
      ])

      this.metrics.completedTasks++
      console.log(`[Concurrency] Task ${task.id} completed successfully`)

      return result
    } catch (error) {
      this.metrics.failedTasks++
      console.error(`[Concurrency] Task ${task.id} failed:`, error)

      // Tentar retry se ainda tiver tentativas
      if (task.maxRetries > 0) {
        task.maxRetries--
        task.createdAt = Date.now() // Atualizar para nova tentativa

        // Adicionar de volta à fila com delay
        setTimeout(() => {
          this.queues.get(queueType)!.push(task)
          this.metrics.queuedTasks++
        }, config.retryDelay)
      }

      throw error
    } finally {
      // Remover do processing
      processing.delete(task.id)
    }
  }

  private async executeTaskLogic(task: Task): Promise<any> {
    switch (task.type) {
      case "pdf":
        return await this.executePDFTask(task)
      case "ai":
        return await this.executeAITask(task)
      case "db":
        return await this.executeDBTask(task)
      case "sync":
        return await this.executeSyncTask(task)
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  private async executePDFTask(task: Task): Promise<any> {
    const { processPdfCostAware } = await import("@/lib/pdf-processor-cost-aware")

    return await processPdfCostAware(
      task.data.documentId,
      task.data.buffer,
      task.data.fileName,
      task.userId
    )
  }

  private async executeAITask(task: Task): Promise<any> {
    // Implementação simulada para build funcionar
    return { success: true, message: "AI task executed" }
  }

  private async executeDBTask(task: Task): Promise<any> {
    const { prisma } = await import("@/lib/db")

    switch (task.data.operation) {
      case "query":
        return await prisma.$queryRawUnsafe(task.data.sql)
      case "create":
        return await (prisma as any)[task.data.model]?.create(task.data.data)
      case "update":
        return await (prisma as any)[task.data.model]?.update({
          where: task.data.where,
          data: task.data.data,
        })
      case "delete":
        return await (prisma as any)[task.data.model]?.delete({
          where: task.data.where,
        })
      default:
        throw new Error(`Unsupported DB operation: ${task.data.operation}`)
    }
  }

  private async executeSyncTask(task: Task): Promise<any> {
    // Implementar lógica de sincronização (ex: Open Finance)
    // Por enquanto, simular
    await new Promise((resolve) => setTimeout(resolve, 5000))
    return { synced: true, transactions: [] }
  }

  // Adicionar tarefa à fila
  async addTask(task: Omit<Task, "id" | "createdAt">): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const fullTask: Task = {
      ...task,
      id: taskId,
      createdAt: Date.now(),
    }

    const queue = this.queues.get(task.type)!
    const config = this.configs.get(task.type)!

    // Verificar se fila está cheia
    if (queue.length >= config.maxSize) {
      throw new Error(`Queue ${task.type} is full. Please try again later.`)
    }

    // Adicionar à fila
    queue.push(fullTask)
    this.metrics.totalTasks++
    this.metrics.queuedTasks++

    console.log(`[Concurrency] Task ${taskId} added to ${task.type} queue`)

    return taskId
  }

  // Verificar status de tarefa
  getTaskStatus(taskId: string): {
    status: DocumentStatus | "queued" | "processing" | "completed" | "failed" | "not_found"
    queueType?: string
    workerId?: number
  } {
    // Verificar se está em alguma fila
    for (const [queueType, queue] of this.queues) {
      const found = queue.find((task) => task.id === taskId)
      if (found) {
        return { status: DocumentStatus.PROCESSING, queueType }
      }
    }

    // Verificar se está processando
    for (const [queueType, processing] of this.processing) {
      if (processing.has(taskId)) {
        return { status: DocumentStatus.PROCESSING, queueType }
      }
    }

    return { status: "not_found" }
  }

  // Obter métricas
  getMetrics() {
    return {
      ...this.metrics,
      queueStatus: Object.fromEntries(
        Array.from(this.queues.entries()).map(([type, queue]) => [
          type,
          {
            queued: queue.length,
            processing: this.processing.get(type)?.size || 0,
            workers: this.workers.get(type) || 0,
            maxConcurrency: this.configs.get(type)?.maxConcurrency,
          },
        ])
      ),
    }
  }

  // Limpar tarefas antigas
  cleanup() {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutos

    for (const [queueType, queue] of this.queues) {
      const originalLength = queue.length

      // Remover tarefas muito antigas
      const filtered = queue.filter((task) => now - task.createdAt < maxAge)

      if (filtered.length !== originalLength) {
        this.queues.set(queueType, filtered)
        console.log(
          `[Concurrency] Cleaned ${originalLength - filtered.length} old tasks from ${queueType} queue`
        )
      }
    }
  }
}

// Singleton global
export const concurrencyController = ConcurrencyController.getInstance()

// Wrappers para uso fácil
export async function queuePDFProcessing(
  userId: string,
  documentId: string,
  buffer: Buffer,
  fileName: string,
  priority: Task["priority"] = "medium"
): Promise<string> {
  return await concurrencyController.addTask({
    type: "pdf",
    userId,
    priority,
    data: { documentId, buffer, fileName },
    timeout: 120000, // 2 minutos
    maxRetries: 2,
  })
}

export async function queueAIRequest(
  userId: string,
  messages: any[],
  model = "gpt-4o-mini",
  priority: Task["priority"] = "medium"
): Promise<string> {
  return await concurrencyController.addTask({
    type: "ai",
    userId,
    priority,
    data: { messages, model, maxTokens: 1000, temperature: 0.1 },
    timeout: 60000, // 1 minuto
    maxRetries: 3,
  })
}

export async function queueDatabaseOperation(
  userId: string,
  operation: string,
  model: string,
  data: any,
  where?: any,
  priority: Task["priority"] = "medium"
): Promise<string> {
  return await concurrencyController.addTask({
    type: "db",
    userId,
    priority,
    data: { operation, model, data, where },
    timeout: 30000, // 30 segundos
    maxRetries: 2,
  })
}

export async function queueSyncOperation(
  userId: string,
  syncType: string,
  data: any,
  priority: Task["priority"] = "low"
): Promise<string> {
  return await concurrencyController.addTask({
    type: "sync",
    userId,
    priority,
    data: { syncType, ...data },
    timeout: 180000, // 3 minutos
    maxRetries: 1,
  })
}

// Limpeza periódica
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      concurrencyController.cleanup()
    },
    15 * 60 * 1000
  ) // A cada 15 minutos
}
