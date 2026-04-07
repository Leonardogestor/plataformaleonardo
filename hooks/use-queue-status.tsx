/**
 * Hook React para Status de Fila - Feedback Visual em Tempo Real
 * Evita sensação de travamento, mostra progresso real
 */

import { useState, useEffect } from "react"
import { useQueueStatus, enqueueWithVisibility, queueVisibility } from "@/lib/queue-visibility"

export interface QueueStatusDisplay {
  position: number
  totalInQueue: number
  estimatedWaitTime: number
  processingSpeed: number
  averageProcessingTime: number
  progress: number
  status: "queued" | "processing" | "completed" | "failed"
}

export function useQueueStatusDisplay(itemId: string, type: string) {
  const queueStatus = useQueueStatus(itemId, type)
  const [displayStatus, setDisplayStatus] = useState<QueueStatusDisplay | null>(null)

  useEffect(() => {
    if (queueStatus) {
      setDisplayStatus({
        ...queueStatus,
        progress: 0, // Será atualizado pelo progresso real
        status: queueStatus.position > 0 ? "queued" : "processing",
      })
    }
  }, [queueStatus])

  return displayStatus
}

// Componente para mostrar status da fila
export function QueueStatusIndicator({
  itemId,
  type,
  showDetails = true,
}: {
  itemId: string
  type: string
  showDetails?: boolean
}) {
  const status = useQueueStatusDisplay(itemId, type)

  if (!status) return null

  const formatTime = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}min`
    return `${Math.round(ms / 3600000)}h`
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "queued":
        return "text-blue-600 bg-blue-50"
      case "processing":
        return "text-yellow-600 bg-yellow-50"
      case "completed":
        return "text-green-600 bg-green-50"
      case "failed":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "queued":
        return "⏳"
      case "processing":
        return "🔄"
      case "completed":
        return "✅"
      case "failed":
        return "❌"
      default:
        return "⏸️"
    }
  }

  const getStatusMessage = (status: QueueStatusDisplay): string => {
    switch (status.status) {
      case "queued":
        return `Posição ${status.position} de ${status.totalInQueue} na fila`
      case "processing":
        return "Processando..."
      case "completed":
        return "Concluído!"
      case "failed":
        return "Falhou ao processar"
      default:
        return "Status desconhecido"
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor(status.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getStatusIcon(status.status)}</span>
          <div>
            <p className="font-medium">{getStatusMessage(status)}</p>
            {showDetails && (
              <p className="text-sm opacity-75">
                Tempo estimado: {formatTime(status.estimatedWaitTime)}
              </p>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="text-right">
            <div className="text-sm">
              <div>Velocidade: {status.processingSpeed.toFixed(1)}/min</div>
              <div>Tempo médio: {formatTime(status.averageProcessingTime)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {status.status === "processing" && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-xs mt-1 text-right opacity-75">{status.progress}% completo</p>
        </div>
      )}

      {/* Indicador de fila */}
      {status.status === "queued" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span>Sua posição:</span>
            <span className="font-medium">
              {status.position} / {status.totalInQueue}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((status.totalInQueue - status.position + 1) / status.totalInQueue) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente simplificado para inline
export function QueueStatusInline({ itemId, type }: { itemId: string; type: string }) {
  const status = useQueueStatusDisplay(itemId, type)

  if (!status || status.status === "completed") return null

  const formatTime = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}min`
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <span className="animate-pulse">⏳</span>
      <span>
        {status.status === "queued"
          ? `Fila: ${status.position}/${status.totalInQueue} (${formatTime(status.estimatedWaitTime)})`
          : "Processando..."}
      </span>
    </div>
  )
}

// Hook para operações com fila visível
export function useQueuedOperation<T>(
  operation: () => Promise<T>,
  options: {
    type: "pdf" | "ai" | "sync" | "upload"
    estimatedDuration?: number
    metadata?: Record<string, any>
  }
) {
  const [queueStatus, setQueueStatus] = useState<{
    id: string | null
    status: "idle" | "queued" | "processing" | "completed" | "failed"
    error: Error | null
  }>({
    id: null,
    status: "idle",
    error: null,
  })

  const execute = async (): Promise<T> => {
    try {
      setQueueStatus({ id: null, status: "idle", error: null })

      // Adicionar à fila
      const { id } = await enqueueWithVisibility(
        options.type,
        "current_user", // Em produção, viria do auth
        operation,
        options
      )

      setQueueStatus({ id, status: "queued", error: null })

      // Aguardar completar (em produção, seria notificado pelo sistema)
      const { result } = await waitForQueueCompletion(id, options.type)

      setQueueStatus({ id, status: "completed", error: null })
      return result
    } catch (error) {
      setQueueStatus({
        id: queueStatus.id,
        status: "failed",
        error: error instanceof Error ? error : new Error("Unknown error"),
      })
      throw error
    }
  }

  const reset = () => {
    setQueueStatus({ id: null, status: "idle", error: null })
  }

  return {
    execute,
    queueStatus: queueStatus.status,
    queueId: queueStatus.id,
    error: queueStatus.error,
    reset,
    isInQueue: queueStatus.status === "queued" || queueStatus.status === "processing",
  }
}

// Função para aguardar completar (simulação)
async function waitForQueueCompletion(id: string, type: string): Promise<{ result: any }> {
  return new Promise((resolve) => {
    const checkStatus = () => {
      const status = queueVisibility.getItemStatus(id, type)

      if (status && status.position === 0) {
        // Simular resultado
        resolve({ result: { success: true, id } })
      } else {
        // Continuar verificando
        setTimeout(checkStatus, 1000)
      }
    }

    checkStatus()
  })
}
