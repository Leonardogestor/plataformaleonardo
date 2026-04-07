/**
 * Controle de Concorrência por Usuário - Anti-Caos Individual
 * Evita que um único usuário sobrecarregue o sistema
 */

import { useState, useEffect } from "react"
// import { resilienceManager } from './resilience-degradation' // Desabilitado temporariamente

export interface UserLock {
  userId: string
  resource: string
  acquiredAt: number
  expiresAt: number
  metadata?: Record<string, any>
}

export interface UserConcurrencyConfig {
  maxConcurrentPDFs: number
  maxConcurrentAI: number
  maxConcurrentUploads: number
  lockTimeout: number
  cleanupInterval: number
}

class UserConcurrencyController {
  private static instance: UserConcurrencyController
  private userLocks: Map<string, UserLock[]> = new Map()
  private userMetrics: Map<
    string,
    {
      activeOperations: number
      totalOperations: number
      failedOperations: number
      lastActivity: number
    }
  > = new Map()
  private config: UserConcurrencyConfig

  constructor() {
    this.config = {
      maxConcurrentPDFs: 1, // 1 PDF por vez por usuário
      maxConcurrentAI: 2, // 2 chamadas IA por vez
      maxConcurrentUploads: 2, // 2 uploads simultâneos
      lockTimeout: 300000, // 5 minutos
      cleanupInterval: 60000, // 1 minuto
    }

    this.startCleanup()
  }

  static getInstance(): UserConcurrencyController {
    if (!this.instance) {
      this.instance = new UserConcurrencyController()
    }
    return this.instance
  }

  // Adquirir lock por usuário
  async acquireLock(
    userId: string,
    resource: string,
    timeout: number = this.config.lockTimeout,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.userLocks.has(userId)) {
      this.userLocks.set(userId, [])
    }

    const userLocks = this.userLocks.get(userId)!
    const now = Date.now()

    // Limpar locks expirados
    this.cleanupExpiredLocks(userId)

    // Verificar se já tem lock para este recurso
    const existingLock = userLocks.find((lock) => lock.resource === resource)
    if (existingLock && existingLock.expiresAt > now) {
      console.log(`[UserConcurrency] User ${userId} already has lock for ${resource}`)
      return false
    }

    // Verificar limites de concorrência por tipo de recurso
    const resourceType = this.getResourceType(resource)
    const maxConcurrent = this.getMaxConcurrentForType(resourceType)
    const currentCount = userLocks.filter(
      (lock) => this.getResourceType(lock.resource) === resourceType
    ).length

    if (currentCount >= maxConcurrent) {
      console.log(
        `[UserConcurrency] User ${userId} exceeded limit for ${resourceType} (${currentCount}/${maxConcurrent})`
      )
      return false
    }

    // Criar novo lock
    const newLock: UserLock = {
      userId,
      resource,
      acquiredAt: now,
      expiresAt: now + timeout,
      metadata,
    }

    userLocks.push(newLock)
    this.updateUserMetrics(userId, "acquire")

    console.log(`[UserConcurrency] Lock acquired for user ${userId}, resource ${resource}`)
    return true
  }

  // Liberar lock por usuário
  releaseLock(userId: string, resource: string): boolean {
    const userLocks = this.userLocks.get(userId)
    if (!userLocks) return false

    const lockIndex = userLocks.findIndex((lock) => lock.resource === resource)
    if (lockIndex === -1) return false

    userLocks.splice(lockIndex, 1)
    this.updateUserMetrics(userId, "release")

    console.log(`[UserConcurrency] Lock released for user ${userId}, resource ${resource}`)
    return true
  }

  // Verificar se usuário pode executar operação
  canExecuteOperation(
    userId: string,
    resourceType: "pdf" | "ai" | "upload" | "sync",
    operationCount: number = 1
  ): boolean {
    const userLocks = this.userLocks.get(userId) || []
    const currentCount = userLocks.filter(
      (lock) => this.getResourceType(lock.resource) === resourceType
    ).length

    const maxConcurrent = this.getMaxConcurrentForType(resourceType)

    return currentCount + operationCount <= maxConcurrent
  }

  // Executar operação com lock automático
  async executeWithLock<T>(
    userId: string,
    resource: string,
    operation: () => Promise<T>,
    options: {
      timeout?: number
      metadata?: Record<string, any>
      fallback?: () => Promise<T>
    } = {}
  ): Promise<T> {
    const acquired = await this.acquireLock(userId, resource, options.timeout, options.metadata)

    if (!acquired) {
      if (options.fallback) {
        console.log(`[UserConcurrency] Using fallback for user ${userId}, resource ${resource}`)
        return await options.fallback()
      } else {
        throw new Error(
          `Cannot acquire lock for resource ${resource}. You may have too many operations running simultaneously.`
        )
      }
    }

    try {
      const result = await operation()
      return result
    } finally {
      this.releaseLock(userId, resource)
    }
  }

  // Obter status de locks do usuário
  getUserLockStatus(userId: string): {
    activeLocks: Array<{
      resource: string
      acquiredAt: number
      expiresAt: number
      timeRemaining: number
      metadata?: Record<string, any>
    }>
    metrics: {
      activeOperations: number
      totalOperations: number
      failedOperations: number
      lastActivity: number
    }
    canExecute: Record<string, boolean>
  } {
    const userLocks = this.userLocks.get(userId) || []
    const now = Date.now()
    const metrics = this.userMetrics.get(userId) || {
      activeOperations: 0,
      totalOperations: 0,
      failedOperations: 0,
      lastActivity: 0,
    }

    // Limpar locks expirados
    this.cleanupExpiredLocks(userId)
    const activeLocks = this.userLocks.get(userId) || []

    const activeLocksInfo = activeLocks.map((lock) => ({
      resource: lock.resource,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
      timeRemaining: Math.max(0, lock.expiresAt - now),
      metadata: lock.metadata,
    }))

    const canExecute = {
      pdf: this.canExecuteOperation(userId, "pdf"),
      ai: this.canExecuteOperation(userId, "ai"),
      upload: this.canExecuteOperation(userId, "upload"),
      sync: this.canExecuteOperation(userId, "sync"),
    }

    return {
      activeLocks: activeLocksInfo,
      metrics,
      canExecute,
    }
  }

  // Forçar liberação de todos os locks do usuário
  releaseAllUserLocks(userId: string): number {
    const userLocks = this.userLocks.get(userId)
    if (!userLocks) return 0

    const count = userLocks.length
    this.userLocks.delete(userId)

    console.log(`[UserConcurrency] Released ${count} locks for user ${userId}`)
    return count
  }

  // Obter métricas globais
  getGlobalMetrics(): {
    totalUsers: number
    totalActiveLocks: number
    averageLocksPerUser: number
    topUsers: Array<{
      userId: string
      activeLocks: number
      totalOperations: number
    }>
  } {
    let totalActiveLocks = 0
    const userStats: Array<{
      userId: string
      activeLocks: number
      totalOperations: number
    }> = []

    for (const [userId, locks] of this.userLocks) {
      const activeLocks = locks.filter((lock) => lock.expiresAt > Date.now()).length
      const metrics = this.userMetrics.get(userId) || { totalOperations: 0 }

      totalActiveLocks += activeLocks
      userStats.push({
        userId: userId.substring(0, 8) + "...", // Anonimizar
        activeLocks,
        totalOperations: metrics.totalOperations,
      })
    }

    // Ordenar por mais ativos
    userStats.sort((a, b) => b.activeLocks - a.activeLocks)

    return {
      totalUsers: this.userLocks.size,
      totalActiveLocks,
      averageLocksPerUser: this.userLocks.size > 0 ? totalActiveLocks / this.userLocks.size : 0,
      topUsers: userStats.slice(0, 5),
    }
  }

  private getResourceType(resource: string): "pdf" | "ai" | "upload" | "sync" {
    if (resource.includes("pdf") || resource.includes("document")) return "pdf"
    if (resource.includes("ai") || resource.includes("openai")) return "ai"
    if (resource.includes("upload") || resource.includes("file")) return "upload"
    return "sync"
  }

  private getMaxConcurrentForType(resourceType: "pdf" | "ai" | "upload" | "sync"): number {
    switch (resourceType) {
      case "pdf":
        return this.config.maxConcurrentPDFs
      case "ai":
        return this.config.maxConcurrentAI
      case "upload":
        return this.config.maxConcurrentUploads
      default:
        return 2
    }
  }

  private updateUserMetrics(userId: string, action: "acquire" | "release" | "fail"): void {
    if (!this.userMetrics.has(userId)) {
      this.userMetrics.set(userId, {
        activeOperations: 0,
        totalOperations: 0,
        failedOperations: 0,
        lastActivity: Date.now(),
      })
    }

    const metrics = this.userMetrics.get(userId)!
    metrics.lastActivity = Date.now()

    switch (action) {
      case "acquire":
        metrics.activeOperations++
        metrics.totalOperations++
        break
      case "release":
        metrics.activeOperations = Math.max(0, metrics.activeOperations - 1)
        break
      case "fail":
        metrics.failedOperations++
        break
    }
  }

  private cleanupExpiredLocks(userId: string): void {
    const userLocks = this.userLocks.get(userId)
    if (!userLocks) return

    const now = Date.now()
    const originalLength = userLocks.length

    // Remover locks expirados
    const activeLocks = userLocks.filter((lock) => lock.expiresAt > now)

    if (activeLocks.length !== originalLength) {
      this.userLocks.set(userId, activeLocks)
      console.log(
        `[UserConcurrency] Cleaned ${originalLength - activeLocks.length} expired locks for user ${userId}`
      )
    }
  }

  private startCleanup(): void {
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const now = Date.now()
        let totalCleaned = 0

        for (const [userId, locks] of this.userLocks) {
          const originalLength = locks.length
          const activeLocks = locks.filter((lock) => lock.expiresAt > now)

          if (activeLocks.length !== originalLength) {
            this.userLocks.set(userId, activeLocks)
            totalCleaned += originalLength - activeLocks.length
          }

          // Remover usuários inativos há mais de 1 hora
          const metrics = this.userMetrics.get(userId)
          if (metrics && now - metrics.lastActivity > 60 * 60 * 1000) {
            this.userLocks.delete(userId)
            this.userMetrics.delete(userId)
          }
        }

        if (totalCleaned > 0) {
          console.log(`[UserConcurrency] Cleaned ${totalCleaned} expired locks globally`)
        }
      }, this.config.cleanupInterval)
    }
  }
}

// Singleton global
export const userConcurrencyController = UserConcurrencyController.getInstance()

// Wrappers para uso fácil
export async function withUserLock<T>(
  userId: string,
  resource: string,
  operation: () => Promise<T>,
  options?: {
    timeout?: number
    metadata?: Record<string, any>
    fallback?: () => Promise<T>
  }
): Promise<T> {
  return await userConcurrencyController.executeWithLock(userId, resource, operation, options)
}

export async function withPDFLock<T>(
  userId: string,
  documentId: string,
  operation: () => Promise<T>,
  options?: {
    timeout?: number
    metadata?: Record<string, any>
    fallback?: () => Promise<T>
  }
): Promise<T> {
  return await withUserLock(userId, `pdf:${documentId}`, operation, {
    timeout: 300000, // 5 minutos para PDF
    metadata: { documentId, type: "pdf" },
    ...options,
  })
}

export async function withAILock<T>(
  userId: string,
  operationId: string,
  operation: () => Promise<T>,
  options?: {
    timeout?: number
    metadata?: Record<string, any>
    fallback?: () => Promise<T>
  }
): Promise<T> {
  return await withUserLock(userId, `ai:${operationId}`, operation, {
    timeout: 60000, // 1 minuto para IA
    metadata: { operationId, type: "ai" },
    ...options,
  })
}

export async function withUploadLock<T>(
  userId: string,
  uploadId: string,
  operation: () => Promise<T>,
  options?: {
    timeout?: number
    metadata?: Record<string, any>
    fallback?: () => Promise<T>
  }
): Promise<T> {
  return await withUserLock(userId, `upload:${uploadId}`, operation, {
    timeout: 120000, // 2 minutos para upload
    metadata: { uploadId, type: "upload" },
    ...options,
  })
}

// Hook para React (se necessário)
export function useUserConcurrency(userId: string) {
  const [lockStatus, setLockStatus] = useState(() =>
    userConcurrencyController.getUserLockStatus(userId)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setLockStatus(userConcurrencyController.getUserLockStatus(userId))
    }, 5000) // Atualizar a cada 5 segundos

    return () => clearInterval(interval)
  }, [userId])

  return {
    ...lockStatus,
    canExecutePDF: lockStatus.canExecute.pdf,
    canExecuteAI: lockStatus.canExecute.ai,
    canExecuteUpload: lockStatus.canExecute.upload,
    releaseAllLocks: () => userConcurrencyController.releaseAllUserLocks(userId),
  }
}
