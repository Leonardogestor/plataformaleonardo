import { useState, useEffect } from "react"

/**
 * Visibilidade de Fila - Feedback Real para Operações em Fila
 * Evita sensação de travamento, mostra progresso real
 */

export interface QueueItem {
  id: string
  userId: string
  type: "pdf" | "ai" | "sync" | "upload"
  status: "queued" | "processing" | "completed" | "failed"
  createdAt: number
  startedAt?: number
  estimatedDuration: number // ms
  progress: number // 0-100
  metadata?: Record<string, any>
}

export interface QueueStatus {
  position: number
  totalInQueue: number
  estimatedWaitTime: number // ms
  processingSpeed: number // items por minuto
  averageProcessingTime: number // ms
}

export interface QueueVisibilityConfig {
  showPosition: boolean
  showEstimatedTime: boolean
  showProgress: boolean
  updateInterval: number // ms
  maxHistory: number
}

class QueueVisibilityManager {
  private static instance: QueueVisibilityManager
  private queues: Map<string, QueueItem[]> = new Map()
  private processingHistory: Map<string, number[]> = new Map()
  private subscribers: Map<string, Set<(status: QueueStatus) => void>> = new Map()
  private config: QueueVisibilityConfig

  constructor() {
    this.config = {
      showPosition: true,
      showEstimatedTime: true,
      showProgress: true,
      updateInterval: 1000, // 1 segundo
      maxHistory: 100,
    }

    this.startPeriodicUpdates()
  }

  static getInstance(): QueueVisibilityManager {
    if (!this.instance) {
      this.instance = new QueueVisibilityManager()
    }
    return this.instance
  }

  // Adicionar item à fila com visibilidade
  enqueue(item: Omit<QueueItem, "status" | "createdAt" | "progress">): string {
    const queueItem: QueueItem = {
      ...item,
      status: "queued",
      createdAt: Date.now(),
      progress: 0,
    }

    const queueType = item.type
    if (!this.queues.has(queueType)) {
      this.queues.set(queueType, [])
    }

    const queue = this.queues.get(queueType)!
    queue.push(queueItem)

    // Notificar subscribers
    this.notifySubscribers(queueType)

    console.log(
      `[QueueVisibility] Item ${item.id} added to ${queueType} queue, position ${queue.length}`
    )

    return item.id
  }

  // Iniciar processamento de item
  startProcessing(itemId: string, type: string): void {
    const queue = this.queues.get(type)
    if (!queue) return

    const item = queue.find((item) => item.id === itemId)
    if (!item) return

    item.status = "processing"
    item.startedAt = Date.now()
    item.progress = 0

    this.notifySubscribers(type)

    console.log(`[QueueVisibility] Started processing ${itemId} (${type})`)
  }

  // Atualizar progresso
  updateProgress(itemId: string, type: string, progress: number): void {
    const queue = this.queues.get(type)
    if (!queue) return

    const item = queue.find((item) => item.id === itemId)
    if (!item || item.status !== "processing") return

    item.progress = Math.min(100, Math.max(0, progress))
    this.notifySubscribers(type)
  }

  // Completar item
  complete(itemId: string, type: string): void {
    const queue = this.queues.get(type)
    if (!queue) return

    const item = queue.find((item) => item.id === itemId)
    if (!item) return

    item.status = "completed"
    item.progress = 100

    // Registrar no histórico
    if (!this.processingHistory.has(type)) {
      this.processingHistory.set(type, [])
    }

    const history = this.processingHistory.get(type)!
    const processingTime = Date.now() - (item.startedAt || item.createdAt)
    history.push(processingTime)

    // Manter apenas histórico recente
    if (history.length > this.config.maxHistory) {
      history.shift()
    }

    // Remover da fila após um tempo
    setTimeout(() => {
      this.removeFromQueue(itemId, type)
    }, 5000) // Manter por 5 segundos para visualização

    this.notifySubscribers(type)

    console.log(`[QueueVisibility] Completed ${itemId} (${type}) in ${processingTime}ms`)
  }

  // Falhar item
  fail(itemId: string, type: string, error?: string): void {
    const queue = this.queues.get(type)
    if (!queue) return

    const item = queue.find((item) => item.id === itemId)
    if (!item) return

    item.status = "failed"

    // Remover da fila após um tempo
    setTimeout(() => {
      this.removeFromQueue(itemId, type)
    }, 5000)

    this.notifySubscribers(type)

    console.log(`[QueueVisibility] Failed ${itemId} (${type}): ${error}`)
  }

  // Obter status de um item específico
  getItemStatus(itemId: string, type: string): QueueStatus | null {
    const queue = this.queues.get(type)
    if (!queue) return null

    const itemIndex = queue.findIndex((item) => item.id === itemId)
    if (itemIndex === -1) return null

    const item = queue[itemIndex]
    const queueAhead = queue.slice(0, itemIndex).filter((i) => i.status === "queued")

    const position = queueAhead.length + 1
    const totalInQueue = queue.filter((i) => i.status === "queued").length

    // Calcular tempo estimado
    const avgProcessingTime = this.getAverageProcessingTime(type)
    const estimatedWaitTime = position * avgProcessingTime

    // Calcular velocidade de processamento
    const processingSpeed = this.getProcessingSpeed(type)

    return {
      position,
      totalInQueue,
      estimatedWaitTime,
      processingSpeed,
      averageProcessingTime: avgProcessingTime,
    }
  }

  // Obter status geral da fila
  getQueueStatus(type: string): {
    total: number
    queued: number
    processing: number
    completed: number
    failed: number
    averageWaitTime: number
    processingSpeed: number
  } {
    const queue = this.queues.get(type) || []

    const queued = queue.filter((item) => item.status === "queued").length
    const processing = queue.filter((item) => item.status === "processing").length
    const completed = queue.filter((item) => item.status === "completed").length
    const failed = queue.filter((item) => item.status === "failed").length

    const avgWaitTime = this.calculateAverageWaitTime(type)
    const processingSpeed = this.getProcessingSpeed(type)

    return {
      total: queue.length,
      queued,
      processing,
      completed,
      failed,
      averageWaitTime: avgWaitTime,
      processingSpeed,
    }
  }

  // Inscrever para atualizações de status
  subscribe(itemId: string, type: string, callback: (status: QueueStatus) => void): () => void {
    const key = `${type}:${itemId}`

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }

    this.subscribers.get(key)!.add(callback)

    // Enviar status atual imediatamente
    const currentStatus = this.getItemStatus(itemId, type)
    if (currentStatus) {
      callback(currentStatus)
    }

    // Retornar função de unsubscribe
    return () => {
      const subscribers = this.subscribers.get(key)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.subscribers.delete(key)
        }
      }
    }
  }

  // Notificar subscribers
  private notifySubscribers(type: string): void {
    const queue = this.queues.get(type)
    if (!queue) return

    queue.forEach((item) => {
      const key = `${type}:${item.id}`
      const subscribers = this.subscribers.get(key)

      if (subscribers) {
        const status = this.getItemStatus(item.id, type)
        if (status) {
          subscribers.forEach((callback) => {
            try {
              callback(status)
            } catch (error) {
              console.error("[QueueVisibility] Error in subscriber callback:", error)
            }
          })
        }
      }
    })
  }

  // Métodos auxiliares
  private getAverageProcessingTime(type: string): number {
    const history = this.processingHistory.get(type)
    if (!history || history.length === 0) {
      // Valores padrão por tipo
      const defaults = {
        pdf: 60000, // 1 minuto
        ai: 15000, // 15 segundos
        sync: 30000, // 30 segundos
        upload: 45000, // 45 segundos
      }
      return defaults[type as keyof typeof defaults] || 30000
    }

    const sum = history.reduce((a, b) => a + b, 0)
    return sum / history.length
  }

  private getProcessingSpeed(type: string): number {
    const history = this.processingHistory.get(type)
    if (!history || history.length < 5) return 0 // Dados insuficientes

    // Calcular itens por minuto baseado no histórico recente
    const recentHistory = history.slice(-10) // Últimos 10 itens
    const totalTime = recentHistory.reduce((a, b) => a + b, 0)
    const avgTime = totalTime / recentHistory.length

    return avgTime > 0 ? 60000 / avgTime : 0 // itens por minuto
  }

  private calculateAverageWaitTime(type: string): number {
    const queue = this.queues.get(type)
    if (!queue) return 0

    const queuedItems = queue.filter((item) => item.status === "queued")
    if (queuedItems.length === 0) return 0

    const avgProcessingTime = this.getAverageProcessingTime(type)
    return queuedItems.length * avgProcessingTime
  }

  private removeFromQueue(itemId: string, type: string): void {
    const queue = this.queues.get(type)
    if (!queue) return

    const index = queue.findIndex((item) => item.id === itemId)
    if (index !== -1) {
      queue.splice(index, 1)
      this.notifySubscribers(type)
    }
  }

  private startPeriodicUpdates(): void {
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        // Atualizar progresso para itens em processamento
        this.queues.forEach((queue, type) => {
          queue.forEach((item) => {
            if (item.status === "processing" && item.startedAt) {
              const elapsed = Date.now() - item.startedAt
              const progress = Math.min(100, (elapsed / item.estimatedDuration) * 100)

              if (progress !== item.progress) {
                this.updateProgress(item.id, type, progress)
              }
            }
          })
        })
      }, this.config.updateInterval)
    }
  }

  // Obter métricas para monitoramento
  getMetrics(): Record<
    string,
    {
      queueLength: number
      avgWaitTime: number
      processingSpeed: number
      successRate: number
    }
  > {
    const metrics: Record<string, any> = {}

    this.queues.forEach((queue, type) => {
      const status = this.getQueueStatus(type)
      const successRate =
        status.completed > 0 ? (status.completed / (status.completed + status.failed)) * 100 : 100

      metrics[type] = {
        queueLength: status.total,
        avgWaitTime: status.averageWaitTime,
        processingSpeed: status.processingSpeed,
        successRate,
      }
    })

    return metrics
  }
}

// Singleton global
export const queueVisibility = QueueVisibilityManager.getInstance()

// Wrappers para uso fácil
export function enqueueWithVisibility<T>(
  type: "pdf" | "ai" | "sync" | "upload",
  userId: string,
  operation: () => Promise<T>,
  options: {
    estimatedDuration?: number
    metadata?: Record<string, any>
  } = {}
): Promise<{ id: string; result: T }> {
  return new Promise((resolve, reject) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Adicionar à fila
    queueVisibility.enqueue({
      id,
      userId,
      type,
      estimatedDuration: options.estimatedDuration || 30000,
      metadata: options.metadata,
    })

    // Simular processamento (em produção, seria chamado pelo worker)
    setTimeout(async () => {
      try {
        queueVisibility.startProcessing(id, type)

        // Simular progresso
        const progressInterval = setInterval(() => {
          const queue = queueVisibility["queues"].get(type)
          const item = queue?.find((item) => item.id === id)

          if (item && item.status === "processing") {
            const elapsed = Date.now() - (item.startedAt || item.createdAt)
            const progress = Math.min(100, (elapsed / (options.estimatedDuration || 30000)) * 100)
            queueVisibility.updateProgress(id, type, progress)
          }
        }, 1000)

        // Executar operação
        const result = await operation()

        clearInterval(progressInterval)
        queueVisibility.complete(id, type)
        resolve({ id, result })
      } catch (error) {
        queueVisibility.fail(id, type, error instanceof Error ? error.message : String(error))
        reject(error)
      }
    }, 100) // Pequeno delay para simular tempo de fila
  })
}

// Hook para React
export function useQueueStatus(itemId: string, type: string) {
  const [status, setStatus] = useState<QueueStatus | null>(null)

  useEffect(() => {
    const unsubscribe = queueVisibility.subscribe(itemId, type, setStatus)

    return unsubscribe
  }, [itemId, type])

  return status
}
