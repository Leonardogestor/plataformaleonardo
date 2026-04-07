/**
 * Graceful Degradation - Experiência do Usuário Crítica
 * Garante que o usuário nunca veja erro técnico
 * Sistema degrada de forma elegante sob falhas
 */

import { useState, useEffect, useCallback, ReactNode } from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
  retryCount: number
}

interface GracefulErrorProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
  maxRetries?: number
  component?: string
}

// Error Boundary com graceful degradation
export function GracefulErrorBoundary({
  children,
  fallback,
  onError,
  maxRetries = 3,
  component = "Unknown",
}: GracefulErrorProps) {
  const [state, setState] = useState<ErrorBoundaryState>({
    hasError: false,
    retryCount: 0,
  })

  useEffect(() => {
    const handleError = (error: Error, errorInfo: any) => {
      console.error(`[GracefulError] ${component}:`, error)

      setState((prev) => ({
        hasError: true,
        error,
        errorInfo,
        retryCount: prev.retryCount + 1,
      }))

      // Enviar para monitoring
      if (onError) {
        onError(error, errorInfo)
      }
    }

    // Configurar error boundary global
    const originalHandler = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        handleError(error, { message, source, lineno, colno })
      }
      if (originalHandler) {
        return originalHandler(message, source, lineno, colno, error)
      }
      return false
    }

    return () => {
      window.onerror = originalHandler
    }
  }, [component, onError])

  const handleRetry = useCallback(() => {
    if (state.retryCount < maxRetries) {
      setState((prev) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prev.retryCount,
      }))
    }
  }, [state.retryCount, maxRetries])

  if (state.hasError) {
    // Fallback customizado ou padrão
    if (fallback) {
      return <>{fallback}</>
    }

    // Fallback padrão baseado no componente
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[200px] bg-gray-50 rounded-lg border">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ops! Algo deu errado</h3>

          <p className="text-gray-600 mb-4 max-w-md">
            Estamos trabalhando para resolver isso. Você pode tentar novamente ou recarregar a
            página.
          </p>

          {state.retryCount < maxRetries && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-2"
            >
              Tentar Novamente
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Recarregar Página
          </button>

          {state.retryCount >= maxRetries && (
            <p className="text-sm text-gray-500 mt-4">
              Você atingiu o número máximo de tentativas. Por favor, recarregue a página.
            </p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook para operações com fallback
export function useGracefulOperation<T, E = Error>(
  operation: () => Promise<T>,
  options: {
    fallback?: T
    retryCount?: number
    retryDelay?: number
    timeout?: number
    onError?: (error: E) => void
    onRetry?: (attempt: number) => void
    component?: string
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: E | null
    attempt: number
    usingFallback: boolean
  }>({
    data: null,
    loading: false,
    error: null,
    attempt: 0,
    usingFallback: false,
  })

  const execute = useCallback(async () => {
    const {
      fallback,
      retryCount = 3,
      retryDelay = 1000,
      timeout = 10000,
      onError,
      onRetry,
      component = "Unknown",
    } = options

    setState((prev) => ({ ...prev, loading: true, error: null, attempt: prev.attempt + 1 }))

    let lastError: E | null = null

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        // Adicionar timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), timeout)
        })

        const result = await Promise.race([operation(), timeoutPromise])

        setState({
          data: result,
          loading: false,
          error: null,
          attempt,
          usingFallback: false,
        })

        return result
      } catch (error) {
        lastError = error as E

        console.warn(`[GracefulOperation] ${component} attempt ${attempt} failed:`, error)

        if (onRetry) {
          onRetry(attempt)
        }

        if (attempt < retryCount) {
          // Esperar antes de tentar novamente (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)))
        }
      }
    }

    // Todas as tentativas falharam - usar fallback se disponível
    if (fallback !== undefined) {
      console.warn(`[GracefulOperation] ${component} using fallback after ${retryCount} attempts`)

      setState({
        data: fallback,
        loading: false,
        error: lastError,
        attempt: retryCount,
        usingFallback: true,
      })

      if (onError && lastError) {
        onError(lastError)
      }

      return fallback
    }

    // Sem fallback - propagar erro
    setState({
      data: null,
      loading: false,
      error: lastError,
      attempt: retryCount,
      usingFallback: false,
    })

    if (onError && lastError) {
      onError(lastError)
    }

    throw lastError
  }, [operation, options])

  return {
    ...state,
    execute,
    reset: () =>
      setState({
        data: null,
        loading: false,
        error: null,
        attempt: 0,
        usingFallback: false,
      }),
  }
}

// Hook para dados com cache e fallback
export function useGracefulData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    fallback?: T
    cacheTime?: number
    staleTime?: number
    retryCount?: number
    component?: string
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: Error | null
    lastFetch: number | null
    usingFallback: boolean
  }>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
    usingFallback: false,
  })

  const {
    fallback,
    cacheTime = 5 * 60 * 1000, // 5 minutos
    staleTime = 60 * 1000, // 1 minuto
    retryCount = 3,
    component = "Data",
  } = options

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const data = await fetcher()

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        usingFallback: false,
      })

      // Salvar no cache
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        )
      } catch (cacheError) {
        console.warn("Failed to cache data:", cacheError)
      }
    } catch (error) {
      console.error(`[GracefulData] ${component} fetch failed:`, error)

      // Tentar usar cache
      const cached = getCachedData(key)
      if (cached && !isCacheStale(cached.timestamp, staleTime)) {
        setState({
          data: cached.data,
          loading: false,
          error: error as Error,
          lastFetch: cached.timestamp,
          usingFallback: true,
        })
        return
      }

      // Usar fallback se disponível
      if (fallback !== undefined) {
        setState({
          data: fallback,
          loading: false,
          error: error as Error,
          lastFetch: null,
          usingFallback: true,
        })
        return
      }

      setState({
        data: null,
        loading: false,
        error: error as Error,
        lastFetch: null,
        usingFallback: false,
      })
    }
  }, [key, fetcher, fallback, staleTime, component])

  // Verificar cache ao montar
  useEffect(() => {
    const cached = getCachedData(key)

    if (cached && !isCacheStale(cached.timestamp, staleTime)) {
      setState({
        data: cached.data,
        loading: false,
        error: null,
        lastFetch: cached.timestamp,
        usingFallback: true,
      })
    } else {
      fetchData()
    }
  }, [key, staleTime])

  // Auto-refresh se dados estiverem stale
  useEffect(() => {
    if (state.lastFetch && isCacheStale(state.lastFetch, staleTime) && !state.loading) {
      fetchData()
    }
  }, [state.lastFetch, staleTime, state.loading, fetchData])

  return {
    ...state,
    refetch: fetchData,
    isStale: state.lastFetch ? isCacheStale(state.lastFetch, staleTime) : true,
  }
}

// Funções auxiliares
function getCachedData(key: string): { data: any; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(key)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function isCacheStale(timestamp: number, staleTime: number): boolean {
  return Date.now() - timestamp > staleTime
}

// Componente de loading elegante
export function GracefulLoading({
  message = "Carregando...",
  showSpinner = true,
  size = "medium",
}: {
  message?: string
  showSpinner?: boolean
  size?: "small" | "medium" | "large"
}) {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {showSpinner && (
        <div
          className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} mb-4`}
        ></div>
      )}
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}

// Componente de erro elegante
export function GracefulError({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
}: {
  error: Error
  onRetry?: () => void
  onDismiss?: () => void
  showRetry?: boolean
}) {
  const isNetworkError = error.message.includes("network") || error.message.includes("fetch")
  const isTimeoutError = error.message.includes("timeout")

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {isNetworkError
              ? "Problema de Conexão"
              : isTimeoutError
                ? "Tempo Esgotado"
                : "Erro Inesperado"}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {isNetworkError
                ? "Não foi possível conectar ao servidor. Verifique sua conexão com a internet."
                : isTimeoutError
                  ? "A operação demorou demais para responder. Tente novamente."
                  : "Ocorreu um erro inesperado. Nossa equipe já foi notificada."}
            </p>
          </div>
          <div className="mt-3 flex space-x-2">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook para detectar problemas de conexão
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [connectionQuality, setConnectionQuality] = useState<"good" | "poor" | "offline">("good")

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionQuality("good")
    }

    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality("offline")
    }

    // Detectar qualidade da conexão
    const checkConnectionQuality = async () => {
      if (!isOnline) return

      try {
        const start = Date.now()
        await fetch("/api/health", { method: "HEAD" })
        const duration = Date.now() - start

        if (duration > 3000) {
          setConnectionQuality("poor")
        } else {
          setConnectionQuality("good")
        }
      } catch {
        setConnectionQuality("poor")
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Verificar qualidade periodicamente
    const interval = setInterval(checkConnectionQuality, 30000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [isOnline])

  return {
    isOnline,
    connectionQuality,
    isSlow: connectionQuality === "poor",
  }
}

// Provider de graceful degradation para toda a aplicação
export function GracefulProvider({ children }: { children: ReactNode }) {
  const connectionStatus = useConnectionStatus()

  return (
    <GracefulErrorBoundary component="App">
      {!connectionStatus.isOnline ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sem Conexão com a Internet</h3>
            <p className="text-gray-600 mb-4">Verifique sua conexão e tente novamente.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      ) : (
        <>
          {connectionStatus.isSlow && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-2">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-sm text-yellow-800">
                  ⚠️ Conexão lenta detectada. Algumas funcionalidades podem estar mais lentas.
                </p>
              </div>
            </div>
          )}
          {children}
        </>
      )}
    </GracefulErrorBoundary>
  )
}
