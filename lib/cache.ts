/**
 * BLINDAGEM - Sistema de Cache e Memoização
 * Cache inteligente para performance e otimização
 */

// Interface para itens do cache
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live em milissegundos
}

// Classe principal de cache
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 100
  private cleanupInterval = 60000 // 1 minuto

  constructor() {
    // Limpar cache expirado periodicamente
    setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  // Adicionar item ao cache
  set<T>(key: string, data: T, ttl = 300000): void {
    // 5 minutos default
    if (!key) return

    // Remover item mais antigo se o cache estiver cheio
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  // Obter item do cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // Verificar se o item expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  // Verificar se item existe e não expirou
  has(key: string): boolean {
    const item = this.cache.get(key)

    if (!item) {
      return false
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // Remover item do cache
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Limpar todo o cache
  clear(): void {
    this.cache.clear()
  }

  // Limpar itens expirados
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Obter estatísticas do cache
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Poderia ser implementado com contadores
    }
  }
}

// Instância global do cache
const globalCache = new MemoryCache()

// Hook para cache em componentes
export const useCache = () => {
  const set = <T>(key: string, data: T, ttl?: number) => {
    globalCache.set(key, data, ttl)
  }

  const get = <T>(key: string): T | null => {
    return globalCache.get<T>(key)
  }

  const has = (key: string): boolean => {
    return globalCache.has(key)
  }

  const remove = (key: string): boolean => {
    return globalCache.delete(key)
  }

  const clear = (): void => {
    globalCache.clear()
  }

  return {
    set,
    get,
    has,
    remove,
    clear,
    stats: globalCache.getStats(),
  }
}

// Função de memoização para funções puras
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Função de memoização com TTL
export function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttl = 300000, // 5 minutos
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { data: ReturnType<T>; timestamp: number }>()

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)
    const now = Date.now()

    const cached = cache.get(key)
    if (cached && now - cached.timestamp < ttl) {
      return cached.data
    }

    const result = fn(...args)
    cache.set(key, { data: result, timestamp: now })
    return result
  }) as T
}

// Cache para requisições de API
export class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  // Cache para requisições GET
  async get<T>(url: string, fetcher: () => Promise<T>, ttl = 300000): Promise<T> {
    const cacheKey = `api:${url}`
    const cached = this.cache.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T
    }

    try {
      const data = await fetcher()
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        ttl,
      })
      return data
    } catch (error) {
      // Retornar cache antigo se disponível
      if (cached) {
        console.warn("API request failed, returning cached data:", error)
        return cached.data as T
      }
      throw error
    }
  }

  // Invalidar cache por URL
  invalidate(url: string): void {
    const cacheKey = `api:${url}`
    this.cache.delete(cacheKey)
  }

  // Limpar cache de API
  clear(): void {
    this.cache.clear()
  }
}

// Instância global do cache de API
const apiCache = new ApiCache()

// Hook para cache de API
export const useApiCache = () => {
  const get = async <T>(url: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> => {
    return apiCache.get(url, fetcher, ttl)
  }

  const invalidate = (url: string): void => {
    apiCache.invalidate(url)
  }

  const clear = (): void => {
    apiCache.clear()
  }

  return { get, invalidate, clear }
}

// Cache para cálculos complexos
export class ComputationCache {
  private cache = new Map<string, { result: any; timestamp: number; ttl: number }>()

  // Cache para funções de computação pesadas
  compute<T>(
    key: string,
    fn: () => T,
    ttl = 600000 // 10 minutos
  ): T {
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.result as T
    }

    const result = fn()
    this.cache.set(key, {
      result,
      timestamp: now,
      ttl,
    })
    return result
  }

  // Invalidar cache por chave
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  // Limpar cache
  clear(): void {
    this.cache.clear()
  }
}

// Instância global do cache de computação
const computationCache = new ComputationCache()

// Hook para cache de computação
export const useComputationCache = () => {
  const compute = <T>(key: string, fn: () => T, ttl?: number): T => {
    return computationCache.compute(key, fn, ttl)
  }

  const invalidate = (key: string): void => {
    computationCache.invalidate(key)
  }

  const clear = (): void => {
    computationCache.clear()
  }

  return { compute, invalidate, clear }
}

// Cache para dados do usuário
export class UserCache {
  private cache = new Map<string, { data: any; timestamp: number }>()

  // Cache para dados do usuário
  setUser(userId: string, data: any): void {
    this.cache.set(`user:${userId}`, {
      data,
      timestamp: Date.now(),
    })
  }

  getUser(userId: string): any | null {
    const cached = this.cache.get(`user:${userId}`)
    return cached ? cached.data : null
  }

  // Cache para sessões
  setSession(sessionId: string, data: any): void {
    this.cache.set(`session:${sessionId}`, {
      data,
      timestamp: Date.now(),
    })
  }

  getSession(sessionId: string): any | null {
    const cached = this.cache.get(`session:${sessionId}`)
    return cached ? cached.data : null
  }

  // Limpar cache de usuário
  clearUser(userId: string): void {
    this.cache.delete(`user:${userId}`)
  }

  // Limpar sessão
  clearSession(sessionId: string): void {
    this.cache.delete(`session:${sessionId}`)
  }

  // Limpar tudo
  clear(): void {
    this.cache.clear()
  }
}

// Instância global do cache de usuário
const userCache = new UserCache()

// Hook para cache de usuário
export const useUserCache = () => {
  const setUser = (userId: string, data: any): void => {
    userCache.setUser(userId, data)
  }

  const getUser = (userId: string): any | null => {
    return userCache.getUser(userId)
  }

  const setSession = (sessionId: string, data: any): void => {
    userCache.setSession(sessionId, data)
  }

  const getSession = (sessionId: string): any | null => {
    return userCache.getSession(sessionId)
  }

  const clearUser = (userId: string): void => {
    userCache.clearUser(userId)
  }

  const clearSession = (sessionId: string): void => {
    userCache.clearSession(sessionId)
  }

  const clear = (): void => {
    userCache.clear()
  }

  return {
    setUser,
    getUser,
    setSession,
    getSession,
    clearUser,
    clearSession,
    clear,
  }
}

// Função wrapper para cache automático
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    ttl?: number
    keyPrefix?: string
    getKey?: (...args: Parameters<T>) => string
  } = {}
): T {
  const { ttl = 300000, keyPrefix = "", getKey } = options

  return (async (...args: Parameters<T>) => {
    const key = keyPrefix + (getKey ? getKey(...args) : JSON.stringify(args))

    // Tentar obter do cache
    const cached = globalCache.get(key)
    if (cached !== null) {
      return cached
    }

    // Executar função e cache resultado
    const result = await fn(...args)
    globalCache.set(key, result, ttl)
    return result
  }) as T
}

// Exportar tudo
export const Cache = {
  MemoryCache,
  useCache,
  memoize,
  memoizeWithTTL,
  ApiCache,
  useApiCache,
  ComputationCache,
  useComputationCache,
  UserCache,
  useUserCache,
  withCache,
}
