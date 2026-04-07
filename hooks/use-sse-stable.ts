/**
 * Hook SSE estável com reconexão automática e fallback
 * Funciona dentro das limitações da Vercel
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"

interface SSEMessage {
  type: string
  data?: any
  timestamp?: number
}

interface UseSSEOptions {
  onMessage?: (message: SSEMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
}

export function useSSE(endpoint: string, options: UseSSEOptions = {}) {
  const {
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval = 30000,
  } = options

  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected")
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isManualDisconnectRef = useRef(false)

  const cleanup = useCallback(() => {
    // Limpar timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }

    // Fechar EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
  }, [])

  const connect = useCallback(() => {
    if (!session?.user?.id) {
      console.warn("[SSE] Usuário não autenticado, abortando conexão")
      return
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return // Já conectado
    }

    setConnectionStatus("connecting")
    isManualDisconnectRef.current = false

    try {
      // Construir URL com query params
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set("userId", session.user.id)
      url.searchParams.set("timestamp", Date.now().toString())

      const eventSource = new EventSource(url.toString())
      eventSourceRef.current = eventSource

      // Heartbeat para detectar conexões mortas
      const resetHeartbeat = () => {
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
        }

        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("[SSE] Heartbeat timeout, reconectando...")
          eventSource.close()
          if (!isManualDisconnectRef.current && reconnectAttemptsRef.current < reconnectAttempts) {
            reconnect()
          }
        }, heartbeatInterval + 5000) // 5s de tolerância
      }

      eventSource.onopen = (event) => {
        console.log("[SSE] Conectado")
        setIsConnected(true)
        setConnectionStatus("connected")
        reconnectAttemptsRef.current = 0
        resetHeartbeat()
        onConnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)

          // Reset heartbeat em qualquer mensagem
          resetHeartbeat()

          setLastMessage(message)
          onMessage?.(message)

          // Log apenas em desenvolvimento
          if (process.env.NODE_ENV === "development") {
            console.log("[SSE] Mensagem recebida:", message)
          }
        } catch (error) {
          console.error("[SSE] Erro ao parsear mensagem:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("[SSE] Erro na conexão:", error)
        setIsConnected(false)
        setConnectionStatus("error")
        onError?.(error)

        // Limpar heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
        }

        // Tentar reconexão se não for desconexão manual
        if (!isManualDisconnectRef.current && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnect()
        } else {
          setConnectionStatus("disconnected")
          onDisconnect?.()
        }
      }
    } catch (error) {
      console.error("[SSE] Erro ao criar EventSource:", error)
      setConnectionStatus("error")
      onError?.(error as Event)
    }
  }, [session?.user?.id, endpoint, onConnect, onDisconnect, onMessage, onError, reconnectAttempts])

  const reconnect = useCallback(() => {
    if (isManualDisconnectRef.current) return

    cleanup()

    reconnectAttemptsRef.current++
    console.log(
      `[SSE] Tentativa ${reconnectAttemptsRef.current} de reconexão em ${reconnectDelay}ms`
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, reconnectDelay)
  }, [cleanup, connect, reconnectDelay])

  const disconnect = useCallback(() => {
    console.log("[SSE] Desconectando manualmente")
    isManualDisconnectRef.current = true
    cleanup()
    onDisconnect?.()
  }, [cleanup, onDisconnect])

  // Conectar automaticamente quando o usuário estiver autenticado
  useEffect(() => {
    if (session?.user?.id) {
      connect()
    } else {
      disconnect()
    }

    return cleanup
  }, [session?.user?.id, connect, disconnect, cleanup])

  // Limpar ao desmontar
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Reconectar manualmente (exposed para uso externo)
  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    isManualDisconnectRef.current = false
    connect()
  }, [connect])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect: manualReconnect,
    disconnect,
    reconnectAttempts: reconnectAttemptsRef.current,
  }
}

// Hook específico para eventos de refresh
export function useRefreshEvents() {
  const { data: session } = useSession()
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const { isConnected, connectionStatus, lastMessage, disconnect } = useSSE("/api/events/refresh", {
    onMessage: (message) => {
      if (message.type === "heartbeat") {
        // Heartbeat - não fazer nada, apenas manter conexão viva
      } else if (message.type === "refresh") {
        console.log("[SSE] Evento de refresh recebido")
        setLastRefresh(Date.now())
        // Aqui você pode invalidar queries do React Query, etc.
        // queryClient.invalidateQueries()
      }
    },
    onError: (error) => {
      console.warn("[SSE] Erro nos eventos de refresh:", error)
    },
    reconnectAttempts: 3,
    reconnectDelay: 2000,
  })

  // Desconectar se não houver sessão
  useEffect(() => {
    if (!session?.user?.id) {
      disconnect()
    }
  }, [session?.user?.id, disconnect])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    lastRefresh,
    // Método para forçar refresh manual
    triggerRefresh: () => setLastRefresh(Date.now()),
  }
}

// Hook fallback para quando SSE não está disponível
export function usePollingFallback(endpoint: string, interval: number = 30000) {
  const [lastData, setLastData] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.id) return

    setIsPolling(true)

    const poll = async () => {
      try {
        const response = await fetch(
          `${endpoint}?userId=${session.user.id}&timestamp=${Date.now()}`
        )
        if (response.ok) {
          const data = await response.json()
          setLastData(data)
        }
      } catch (error) {
        console.warn("[Polling] Erro:", error)
      }
    }

    const intervalId = setInterval(poll, interval)
    poll() // Primeira chamada imediata

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [endpoint, interval, session?.user?.id])

  return { lastData, isPolling }
}
