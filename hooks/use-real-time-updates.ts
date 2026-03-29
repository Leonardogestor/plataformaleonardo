"use client"

import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface RefreshEvent {
  type: 'connected' | 'heartbeat' | 'refresh' | 'data-updated'
  timestamp?: number
  data?: any
}

export function useRealTimeUpdates() {
  const queryClient = useQueryClient()

  const handleRefresh = useCallback(() => {
    console.log('🔄 Recebido evento de atualização - invalidando cache...')
    
    // Invalidar todas as queries relacionadas a dados financeiros
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["balance"] })
    queryClient.invalidateQueries({ queryKey: ["investments"] })
    queryClient.invalidateQueries({ queryKey: ["accounts"] })
    queryClient.invalidateQueries({ queryKey: ["financial-metrics"] })
    
    // Forçar refetch imediato
    queryClient.refetchQueries({ queryKey: ["transactions"] })
    queryClient.refetchQueries({ queryKey: ["balance"] })
    queryClient.refetchQueries({ queryKey: ["investments"] })
    queryClient.refetchQueries({ queryKey: ["accounts"] })
    
    console.log('✅ Cache invalidado e dados atualizados')
  }, [queryClient])

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        console.log('🔌 Conectando ao stream de atualizações em tempo real...')
        eventSource = new EventSource('/api/events/refresh')

        eventSource.onmessage = (event) => {
          try {
            const data: RefreshEvent = JSON.parse(event.data)
            
            switch (data.type) {
              case 'connected':
                console.log('✅ Conectado ao stream de atualizações')
                break
              
              case 'heartbeat':
                // Manter conexão viva
                break
              
              case 'refresh':
              case 'data-updated':
                console.log('📡 Recebido evento de atualização:', data)
                handleRefresh()
                break
              
              default:
                console.log('📨 Evento desconhecido:', data)
            }
          } catch (error) {
            console.error('❌ Erro ao processar evento:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ Erro na conexão do stream:', error)
          
          // Tentar reconectar após 5 segundos
          if (eventSource) {
            eventSource.close()
          }
          
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Tentando reconectar...')
            connect()
          }, 5000)
        }

      } catch (error) {
        console.error('❌ Erro ao criar EventSource:', error)
      }
    }

    // Iniciar conexão
    connect()

    // Limpar conexão ao desmontar
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [handleRefresh])

  // Função para disparar atualização manual (útil para testes)
  const triggerRefresh = useCallback(async () => {
    try {
      await fetch('/api/events/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'refresh',
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.error('❌ Erro ao disparar atualização:', error)
    }
  }, [])

  return { triggerRefresh }
}
