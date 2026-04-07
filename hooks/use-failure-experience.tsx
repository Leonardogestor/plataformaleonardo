/**
 * Experiência do Usuário Sob Falha - Crítico
 * Garante UX impecável mesmo quando tudo falha
 */

import { useState, useEffect, ReactNode } from "react"

export interface FailureState {
  type: "network" | "service" | "timeout" | "rate_limit" | "unknown"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  action?: string
  retryable: boolean
  countdown?: number
}

export interface FailureExperienceConfig {
  maxRetries: number
  retryDelay: number
  showTechnicalDetails: boolean
  enableAutoRetry: boolean
  fallbackContent?: ReactNode
}

// Hook principal para gerenciar falhas
export function useFailureExperience(config: Partial<FailureExperienceConfig> = {}) {
  const [failureState, setFailureState] = useState<FailureState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const defaultConfig: FailureExperienceConfig = {
    maxRetries: 3,
    retryDelay: 5000,
    showTechnicalDetails: false,
    enableAutoRetry: false,
  }

  const finalConfig = { ...defaultConfig, ...config }

  // Mapear erros para estados amigáveis
  const mapErrorToFailureState = (error: Error, context?: string): FailureState => {
    const message = error.message.toLowerCase()

    if (message.includes("network") || message.includes("fetch")) {
      return {
        type: "network",
        severity: "medium",
        message: "Não conseguimos conectar ao servidor. Verifique sua conexão com a internet.",
        action: "Tentar novamente",
        retryable: true,
      }
    }

    if (message.includes("timeout")) {
      return {
        type: "timeout",
        severity: "medium",
        message:
          "A operação está demorando mais que o esperado. Pode haver muita demanda no momento.",
        action: "Aguardar e tentar novamente",
        retryable: true,
      }
    }

    if (message.includes("rate limit") || message.includes("too many requests")) {
      return {
        type: "rate_limit",
        severity: "high",
        message:
          "Você fez muitas requisições rapidamente. Por favor, aguarde um pouco antes de tentar novamente.",
        action: "Aguarde para tentar novamente",
        retryable: false,
        countdown: 30,
      }
    }

    if (message.includes("service unavailable") || message.includes("503")) {
      return {
        type: "service",
        severity: "high",
        message:
          "Nosso serviço está temporariamente indisponível. Estamos trabalhando para resolver isso.",
        action: "Tentar novamente em alguns minutos",
        retryable: false,
      }
    }

    if (message.includes("database") || message.includes("500")) {
      return {
        type: "service",
        severity: "critical",
        message: "Estamos enfrentando dificuldades técnicas. Nossa equipe já foi notificada.",
        action: "Tentar novamente mais tarde",
        retryable: false,
      }
    }

    // Fallback para erro desconhecido
    return {
      type: "unknown",
      severity: "low",
      message: "Ocorreu uma dificuldade técnica. Nossa equipe já foi notificada.",
      action: "Tentar novamente",
      retryable: true,
    }
  }

  // Tratar erro
  const handleError = (error: Error, context?: string) => {
    const failure = mapErrorToFailureState(error, context)
    setFailureState(failure)
    setRetryCount(0)

    // Iniciar countdown se necessário
    if (failure.countdown) {
      setCountdown(failure.countdown)
    }

    console.error("[FailureExperience] Error handled:", {
      type: failure.type,
      severity: failure.severity,
      originalError: error.message,
      context,
    })
  }

  // Tentar novamente
  const retry = async (operation?: () => Promise<any>) => {
    if (!failureState?.retryable || retryCount >= finalConfig.maxRetries) {
      return
    }

    setIsLoading(true)
    setRetryCount((prev) => prev + 1)

    try {
      if (operation) {
        await operation()
      }
      setFailureState(null)
    } catch (error) {
      handleError(error as Error, "retry")
    } finally {
      setIsLoading(false)
    }
  }

  // Resetar estado
  const reset = () => {
    setFailureState(null)
    setRetryCount(0)
    setIsLoading(false)
    setCountdown(0)
  }

  // Countdown para rate limit
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [countdown])

  return {
    failureState,
    retryCount,
    isLoading,
    countdown,
    handleError,
    retry,
    reset,
    canRetry: failureState?.retryable && retryCount < finalConfig.maxRetries,
    maxRetries: finalConfig.maxRetries,
    mapErrorToFailureState, // Expor para uso externo
  }
}

// Componente de falha elegante
export function FailureDisplay({
  failureState,
  onRetry,
  canRetry,
  retryCount,
  maxRetries,
  isLoading,
  countdown,
  showTechnical = false,
}: {
  failureState: FailureState
  onRetry?: () => void
  canRetry?: boolean
  retryCount?: number
  maxRetries?: number
  isLoading?: boolean
  countdown?: number
  showTechnical?: boolean
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "network":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        )
      case "timeout":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case "rate_limit":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        )
      case "service":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  return (
    <div className={`rounded-lg border p-6 ${getSeverityColor(failureState.severity)}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">{getIcon(failureState.type)}</div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900">Ops! Algo deu errado</h3>

          <p className="mt-1 text-sm text-gray-600">{failureState.message}</p>

          {failureState.action && (
            <p className="mt-2 text-sm text-gray-500">{failureState.action}</p>
          )}

          {/* Countdown para rate limit */}
          {(countdown || 0) > 0 && (
            <div className="mt-3">
              <div className="text-sm text-gray-600">
                Você pode tentar novamente em {countdown || 0} segundos
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((countdown || 0) / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="mt-4 flex space-x-3">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                disabled={isLoading || (countdown || 0) > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Tentando..." : "Tentar novamente"}
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Recarregar página
            </button>
          </div>

          {/* Tentativas restantes */}
          {retryCount !== undefined && maxRetries && (
            <p className="mt-2 text-xs text-gray-500">
              Tentativas: {retryCount}/{maxRetries}
            </p>
          )}

          {/* Detalhes técnicos (se habilitado) */}
          {showTechnical && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Detalhes técnicos
              </summary>
              <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded">
                <div>Tipo: {failureState.type}</div>
                <div>Severidade: {failureState.severity}</div>
                <div>Retryable: {failureState.retryable ? "Yes" : "No"}</div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente wrapper para operações com falha
export function SafeOperation<T>({
  children,
  operation,
  fallback,
  config,
  onError,
}: {
  children: (result: T) => ReactNode
  operation: () => Promise<T>
  fallback?: ReactNode
  config?: Partial<FailureExperienceConfig>
  onError?: (error: Error) => void
}) {
  const failureExperience = useFailureExperience(config)
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    const executeOperation = async () => {
      try {
        const result = await operation()
        setData(result)
        failureExperience.reset()
      } catch (error) {
        failureExperience.handleError(error as Error)
        onError?.(error as Error)
      }
    }

    executeOperation()
  }, [])

  // Se houver falha, mostrar display de falha
  if (failureExperience.failureState) {
    return (
      <FailureDisplay
        failureState={failureExperience.failureState}
        onRetry={() => failureExperience.retry(operation)}
        canRetry={failureExperience.canRetry}
        retryCount={failureExperience.retryCount}
        maxRetries={failureExperience.maxRetries}
        isLoading={failureExperience.isLoading}
        countdown={failureExperience.countdown}
        showTechnical={config?.showTechnicalDetails}
      />
    )
  }

  // Se houver fallback e não tiver dados, mostrar fallback
  if (fallback && !data) {
    return <>{fallback}</>
  }

  // Se tiver dados, mostrar children
  if (data) {
    return <>{children(data)}</>
  }

  // Loading state
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

// Provider para contexto global de falhas
export function FailureExperienceProvider({ children }: { children: ReactNode }) {
  const [globalFailure, setGlobalFailure] = useState<FailureState | null>(null)

  const handleGlobalError = (error: Error) => {
    // Criar instância temporária para mapear erro
    const tempExperience = useFailureExperience()
    const failureState = tempExperience.mapErrorToFailureState?.(error) || {
      type: "unknown" as const,
      severity: "medium" as const,
      message: "Ocorreu um erro inesperado",
      action: "Tentar novamente",
      retryable: true,
    }

    setGlobalFailure(failureState)
  }

  const clearGlobalError = () => {
    setGlobalFailure(null)
  }

  return (
    <div className="min-h-screen">
      {globalFailure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <FailureDisplay
              failureState={globalFailure}
              onRetry={clearGlobalError}
              canRetry={globalFailure.retryable}
              showTechnical={false}
            />
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

// Hook para capturar erros globais
export function useGlobalErrorHandling() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[GlobalError] Unhandled error:", event.error)
      // Em produção, enviar para serviço de monitoramento
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[GlobalError] Unhandled promise rejection:", event.reason)
      // Em produção, enviar para serviço de monitoramento
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])
}

// Mensagens padrão por tipo de erro
export const FAILURE_MESSAGES = {
  network: {
    title: "Problema de Conexão",
    message: "Não conseguimos nos conectar ao servidor. Verifique sua conexão com a internet.",
    action: "Verificar conexão e tentar novamente",
  },
  timeout: {
    title: "Tempo Esgotado",
    message: "A operação está demorando mais que o esperado. Pode haver muita demanda no momento.",
    action: "Aguarde um pouco e tente novamente",
  },
  rate_limit: {
    title: "Muitas Tentativas",
    message: "Você fez muitas requisições rapidamente. Por favor, aguarde um pouco.",
    action: "Aguarde para tentar novamente",
  },
  service: {
    title: "Serviço Indisponível",
    message:
      "Nosso serviço está temporariamente indisponível. Estamos trabalhando para resolver isso.",
    action: "Tente novamente em alguns minutos",
  },
  unknown: {
    title: "Erro Inesperado",
    message: "Ocorreu uma dificuldade técnica. Nossa equipe já foi notificada.",
    action: "Tente novamente mais tarde",
  },
}
