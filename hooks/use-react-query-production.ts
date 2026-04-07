/**
 * React Query Configuração Produção - Anti-Overfetching
 * Otimizado para comportamento real e controle de custo
 */

import {
  QueryClient,
  useQuery,
  useMutation,
  UseQueryOptions,
  useQueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import React from "react"

// Estender opções para incluir callbacks
interface ExtendedUseQueryOptions<T> extends Omit<UseQueryOptions<T>, "queryKey"> {
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
}

// Configuração global do QueryClient para produção
export const createProductionQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // StaleTime otimizado por tipo de dado
        staleTime: 30 * 1000, // Default 30 segundos

        // CacheTime mais longo para reduzir re-fetches
        gcTime: 10 * 60 * 1000, // 10 minutos

        // Refetch estratégico
        refetchOnWindowFocus: false, // Desativado para não gerar spam
        refetchOnReconnect: false, // Desativado para não gerar avalanche
        refetchOnMount: false, // Evitar refetch ao montar componente

        // Retry inteligente
        retry: (failureCount, error) => {
          // Não retry erros de autenticação
          if (error && typeof error === "object" && "status" in error) {
            const status = (error as any).status
            if (status === 401 || status === 403) return false
          }

          // Máximo 3 tentativas para erros de rede
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff

        // Background updates controladas
        refetchInterval: false, // Sem updates automáticos em background

        // Prefetching controlado
        enabled: true,
      },

      mutations: {
        // Retry para mutations (mais importante que queries)
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

// QueryClient global
export const queryClient = createProductionQueryClient()

// Provider
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Hook personalizado com controle de overfetching
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: ExtendedUseQueryOptions<T> = {}
) {
  const [isManualRefetch, setIsManualRefetch] = React.useState(false)

  const queryOptions: UseQueryOptions<T> = {
    ...options,
    queryKey,
    queryFn,

    // Controle de refetch manual
    refetchInterval: isManualRefetch ? false : options.refetchInterval,

    // Desabilitar refetch automático se usuário está ativo
    refetchOnWindowFocus: false,
  }

  const result = useQuery(queryOptions)

  // Callbacks separados para evitar conflito de tipos
  React.useEffect(() => {
    if (result.data && options.onSuccess) {
      options.onSuccess(result.data)
    }
  }, [result.data, options.onSuccess])

  React.useEffect(() => {
    if (result.error && options.onError) {
      options.onError(result.error)
    }
  }, [result.error, options.onError])

  return {
    ...result,
    // Métodos para controle manual
    manualRefetch: () => {
      setIsManualRefetch(true)
      result.refetch().finally(() => setIsManualRefetch(false))
    },
    // Indicador se é cache hit
    isFromCache: result.fetchStatus === "idle",
  }
}

// Hook para mutations com controle de invalidação
export function useOptimizedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    invalidateQueries?: string[][]
    onSuccess?: (data: T, variables: V) => void
    onError?: (error: any, variables: V) => void
  } = {}
) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn,

    onSuccess: (data: any, variables: any) => {
      // Invalidar queries relacionadas
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          qc.invalidateQueries({ queryKey })
        })
      }

      // Invalidar queries comuns
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      qc.invalidateQueries({ queryKey: ["balance"] })

      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },

    onError: (error: any, variables: any) => {
      console.error("[ReactQuery] Mutation error", {
        error: error?.message,
        variables,
        timestamp: new Date().toISOString(),
      })

      if (options.onError) {
        options.onError(error, variables)
      }
    },
  })
}

// Prefetching estratégico (background)
export function prefetchCriticalData() {
  // Dashboard data (mais crítico)
  queryClient.prefetchQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    staleTime: 2 * 60 * 1000, // 2 minutos
  })

  // Balance data
  queryClient.prefetchQuery({
    queryKey: ["balance"],
    queryFn: () => fetch("/api/balance").then((r) => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // User data
  queryClient.prefetchQuery({
    queryKey: ["user"],
    queryFn: () => fetch("/api/user").then((r) => r.json()),
    staleTime: 3 * 60 * 1000, // 3 minutos
  })
}

// Controle de overfetching por componente
export function useOverfetchingDetector(componentName: string) {
  const requestCount = React.useRef(0)
  const lastRequestTime = React.useRef(Date.now())

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime.current

      // Detectar overfetching
      if (requestCount.current > 10 && timeSinceLastRequest < 5000) {
        console.warn(`[Overfetching] Component ${componentName} making too many requests`)
      }

      // Reset contador
      requestCount.current = 0
      lastRequestTime.current = now
    }, 5000)

    return () => clearInterval(interval)
  }, [componentName])

  return {
    trackRequest: () => {
      requestCount.current++
      lastRequestTime.current = Date.now()
    },
  }
}

// Hook específico para dados financeiros (com cache otimizado)
export function useFinancialData() {
  return useOptimizedQuery(
    ["financial-data"],
    () => fetch("/api/financial-data").then((r) => r.json()),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos para dados financeiros
      refetchOnWindowFocus: false,
      refetchInterval: false,
    }
  )
}

// Hook para transações (com cache mais curto)
export function useTransactions(filters?: any) {
  return useOptimizedQuery(
    ["transactions", filters],
    () => fetch(`/api/transactions?${new URLSearchParams(filters)}`).then((r) => r.json()),
    {
      staleTime: 30 * 1000, // 30 segundos para transações
      refetchOnWindowFocus: false,
    }
  )
}

// Hook para dashboard (com prefetching)
export function useDashboard() {
  const result = useOptimizedQuery(
    ["dashboard"],
    () => fetch("/api/dashboard").then((r) => r.json()),
    {
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchOnWindowFocus: false,
      refetchInterval: false,
    }
  )

  const qc = useQueryClient()

  // Prefetch dados relacionados quando dashboard carregar
  React.useEffect(() => {
    if (result.data && !result.isFetching) {
      // Prefetch em background
      setTimeout(() => {
        qc.prefetchQuery({
          queryKey: ["balance"],
          queryFn: () => fetch("/api/balance").then((r) => r.json()),
        })
      }, 1000)
    }
  }, [result.data, result.isFetching, qc])

  return result
}

// Limpeza de cache periódica
export function cleanupQueryCache() {
  // Remover queries não usadas há mais de 30 minutos
  queryClient.removeQueries({
    stale: true,
  })
}

// Executar limpeza a cada 15 minutos
if (typeof setInterval !== "undefined") {
  setInterval(cleanupQueryCache, 15 * 60 * 1000)
}
