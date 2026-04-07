/**
 * SSE Anti-Avalanche - Prevenir múltiplas conexões e reconexões agressivas
 * Otimizado para comportamento real sem sobrecarregar backend
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"

interface SSEMessage {
  type: string
  data?: any
  timestamp?: number
}

interface UseSSEAntiAvalancheOptions {
  onMessage?: (message: SSEMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  maxReconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  connectionTimeout?: number
}

// Cache global para evitar múltiplas conexões por usuário
const globalConnections = new Map<
  string,
  {
    eventSource: EventSource | null
    lastActivity: number
    reconnectCount: number
    isConnecting: boolean
  }
>()

export function useSSEAntiAvalanche(endpoint: string, options: UseSSEAntiAvalancheOptions = {}) {
  const {
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    maxReconnectAttempts = 3,
    reconnectDelay = 5000, // Aumentado para evitar avalanche
    heartbeatInterval = 45000, // Aumentado para reduzir carga
    connectionTimeout = 10000,
  } = options

  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error" | "throttled"
  >("disconnected")
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)

  const localEventSourceRef = useRef<EventSource | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageQueueRef = useRef<SSEMessage[]>([])
  const isManualDisconnectRef = useRef(false)

  // Obter identificador único do usuário
  const getUserKey = useCallback(() => {
    if (!session?.user?.id) return null
    return `${session.user.id}:${endpoint}`
  }, [session?.user?.id, endpoint])

  // Limpar recursos locais
  const cleanupLocal = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (localEventSourceRef.current) {
      localEventSourceRef.current.close()
      localEventSourceRef.current = null
    }
  }, [])

  // Limitar reconexões para evitar avalanche
  const shouldAllowReconnection = useCallback(
    (userKey: string) => {
      const global = globalConnections.get(userKey)
      if (!global) return true

      const now = Date.now()
      const timeSinceLastActivity = now - global.lastActivity

      // Se reconectou muito recentemente, throttling
      if (timeSinceLastActivity < reconnectDelay) {
        console.warn(`[SSE] Throttling reconnection for ${userKey}`)
        return false
      }

      // Se excedeu tentativas, bloquear por mais tempo
      if (global.reconnectCount >= maxReconnectAttempts) {
        const blockTime = reconnectDelay * 2 // 2x o delay normal
        if (timeSinceLastActivity < blockTime) {
          console.warn(`[SSE] Blocking reconnection for ${userKey} (max attempts reached)`)
          return false
        }
      }

      return true
    },
    [reconnectDelay, maxReconnectAttempts]
  )

  // Conectar com controle de avalanche
  const connect = useCallback(() => {
    const userKey = getUserKey()
    if (!userKey) {
      console.warn("[SSE] No user session, aborting connection")
      return
    }

    // Verificar se já existe conexão global
    const existingConnection = globalConnections.get(userKey)
    if (existingConnection?.eventSource?.readyState === EventSource.OPEN) {
      console.log("[SSE] Reusing existing global connection")
      setIsConnected(true)
      setConnectionStatus("connected")
      return
    }

    // Verificar throttling
    if (!shouldAllowReconnection(userKey)) {
      setConnectionStatus("throttled")
      return
    }

    // Verificar se já está conectando
    if (existingConnection?.isConnecting) {
      console.log("[SSE] Connection already in progress")
      return
    }

    setConnectionStatus("connecting")
    isManualDisconnectRef.current = false

    try {
      // Construir URL com query params e timestamp para cache busting
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set("userId", session?.user?.id || "anonymous")
      url.searchParams.set("timestamp", Date.now().toString())
      url.searchParams.set("cacheBust", Math.random().toString(36))

      const eventSource = new EventSource(url.toString())
      localEventSourceRef.current = eventSource

      // Atualizar estado global
      globalConnections.set(userKey, {
        eventSource,
        lastActivity: Date.now(),
        reconnectCount: (existingConnection?.reconnectCount || 0) + 1,
        isConnecting: true,
      })

      // Timeout para conexão
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn("[SSE] Connection timeout")
        eventSource.close()
        setConnectionStatus("error")
        onError?.(new Event("timeout"))
      }, connectionTimeout)

      // Heartbeat com intervalo maior
      const resetHeartbeat = () => {
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
        }

        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("[SSE] Heartbeat timeout, closing connection")
          eventSource.close()
          if (!isManualDisconnectRef.current) {
            // Tentar reconexão apenas se não for manual
            setTimeout(() => connect(), reconnectDelay * 2)
          }
        }, heartbeatInterval + 10000) // 10s de tolerância
      }

      eventSource.onopen = () => {
        console.log("[SSE] Connected")
        setIsConnected(true)
        setConnectionStatus("connected")

        // Limpar timeout de conexão
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }

        // Resetar contadores em sucesso
        const global = globalConnections.get(userKey)
        if (global) {
          global.reconnectCount = 0
          global.isConnecting = false
          global.lastActivity = Date.now()
        }

        resetHeartbeat()
        onConnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)

          // Reset heartbeat em qualquer mensagem
          resetHeartbeat()

          // Atualizar atividade global
          const global = globalConnections.get(userKey)
          if (global) {
            global.lastActivity = Date.now()
          }

          // Processar mensagem
          setLastMessage(message)
          onMessage?.(message)

          // Limitar logging em produção
          if (process.env.NODE_ENV === "development") {
            console.log("[SSE] Message received:", message.type)
          }
        } catch (error) {
          console.error("[SSE] Error parsing message:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error)
        setIsConnected(false)
        setConnectionStatus("error")

        // Limpar recursos
        cleanupLocal()

        // Atualizar estado global
        const global = globalConnections.get(userKey)
        if (global) {
          global.isConnecting = false
          global.eventSource = null
        }

        onError?.(error)

        // Reconexão controlada
        if (!isManualDisconnectRef.current && shouldAllowReconnection(userKey)) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        } else {
          setConnectionStatus("disconnected")
          onDisconnect?.()
        }
      }
    } catch (error) {
      console.error("[SSE] Error creating EventSource:", error)
      setConnectionStatus("error")
      onError?.(error as Event)
    }
  }, [
    getUserKey,
    shouldAllowReconnection,
    session?.user?.id,
    endpoint,
    connectionTimeout,
    heartbeatInterval,
    reconnectDelay,
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    cleanupLocal,
  ])

  // Desconectar controlado
  const disconnect = useCallback(() => {
    console.log("[SSE] Manual disconnect")
    isManualDisconnectRef.current = true

    const userKey = getUserKey()
    if (userKey) {
      const global = globalConnections.get(userKey)
      if (global) {
        global.eventSource = null
        global.isConnecting = false
      }
    }

    cleanupLocal()
    setIsConnected(false)
    setConnectionStatus("disconnected")
    onDisconnect?.()
  }, [getUserKey, cleanupLocal, onDisconnect])

  // Conectar automaticamente quando usuário estiver autenticado
  useEffect(() => {
    if (session?.user?.id) {
      // Delay pequeno para evitar conexões múltiplas em mount
      const timeout = setTimeout(() => {
        connect()
      }, 100)

      return () => {
        clearTimeout(timeout)
        disconnect()
      }
    } else {
      disconnect()
    }
    return undefined
  }, [session?.user?.id, connect, disconnect])

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      cleanupLocal()
    }
  }, [cleanupLocal])

  // Limpeza periódica de conexões inativas
  useEffect(() => {
    const interval = setInterval(
      () => {
        const now = Date.now()
        for (const [key, connection] of globalConnections.entries()) {
          // Remover conexões inativas há mais de 10 minutos
          if (now - connection.lastActivity > 10 * 60 * 1000) {
            if (connection.eventSource) {
              connection.eventSource.close()
            }
            globalConnections.delete(key)
            console.log(`[SSE] Cleaned up inactive connection: ${key}`)
          }
        }
      },
      5 * 60 * 1000
    ) // A cada 5 minutos

    return () => clearInterval(interval)
  }, [])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    reconnectAttempts: globalConnections.get(getUserKey() || "")?.reconnectCount || 0,
    isThrottled: connectionStatus === "throttled",
  }
}

// Hook específico para eventos de refresh com controle de avalanche
export function useRefreshEventsAntiAvalanche() {
  const { data: session } = useSession()
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [isThrottled, setIsThrottled] = useState(false)

  const { isConnected, connectionStatus, lastMessage, disconnect } = useSSEAntiAvalanche(
    "/api/events/refresh",
    {
      onMessage: (message) => {
        if (message.type === "heartbeat") {
          // Heartbeat - não fazer nada, apenas manter conexão viva
        } else if (message.type === "refresh") {
          console.log("[SSE] Refresh event received")
          setLastRefresh(Date.now())
          // Aqui você pode invalidar queries do React Query com controle
          // queryClient.invalidateQueries({ stale: true })
        }
      },
      onError: (error) => {
        console.warn("[SSE] Error in refresh events:", error)
      },
      maxReconnectAttempts: 2, // Menos tentativas para refresh
      reconnectDelay: 10000, // 10s entre tentativas
      heartbeatInterval: 60000, // 1min heartbeat para refresh
    }
  )

  // Desconectar se não houver sessão
  useEffect(() => {
    if (!session?.user?.id) {
      disconnect()
    }
  }, [session?.user?.id, disconnect])

  // Detectar throttling
  useEffect(() => {
    setIsThrottled(connectionStatus === "throttled")
  }, [connectionStatus])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    lastRefresh,
    isThrottled,
    // Método para forçar refresh manual (com throttling)
    triggerRefresh: () => {
      const now = Date.now()
      // Limitar refreshes manuais para não gerar avalanche
      if (now - lastRefresh < 5000) {
        console.warn("[SSE] Manual refresh throttled")
        return
      }
      setLastRefresh(now)
    },
  }
}

// Fallback polling controlado para não gerar avalanche
export function usePollingFallbackAntiAvalanche(endpoint: string, interval: number = 60000) {
  const [lastData, setLastData] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isThrottled, setIsThrottled] = useState(false)
  const { data: session } = useSession()
  const lastPollTime = useRef(Date.now())

  useEffect(() => {
    if (!session?.user?.id) return

    setIsPolling(true)

    const poll = async () => {
      const now = Date.now()

      // Throttling: não pollar se última requisição foi muito recente
      if (now - lastPollTime.current < interval / 2) {
        console.warn("[Polling] Throttled - too soon since last request")
        setIsThrottled(true)
        return
      }

      setIsThrottled(false)
      lastPollTime.current = now

      try {
        const url = new URL(endpoint, window.location.origin)
        url.searchParams.set("userId", session.user.id)
        url.searchParams.set("timestamp", now.toString())

        const response = await fetch(url.toString())
        if (response.ok) {
          const data = await response.json()
          setLastData(data)
        }
      } catch (error) {
        console.warn("[Polling] Error:", error)
      }
    }

    // Intervalo maior para não sobrecarregar
    const intervalId = setInterval(poll, interval)
    poll() // Primeira chamada imediata

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [endpoint, interval, session?.user?.id])

  return { lastData, isPolling, isThrottled }
}
