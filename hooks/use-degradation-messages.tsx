/**
 * Hook React para Mensagens de Degradação - UX Clara
 * Comunicação consistente e amigável para o usuário
 */

import { useState, useEffect } from "react"
import { degradationCommunication, DegradationMessage } from "@/lib/degradation-communication"

export function useDegradationMessages() {
  const [messages, setMessages] = useState<DegradationMessage[]>([])

  useEffect(() => {
    const unsubscribe = degradationCommunication.subscribe(setMessages)
    return unsubscribe
  }, [])

  const removeMessage = (id: string) => {
    degradationCommunication.removeMessage(id)
  }

  const clearAll = () => {
    degradationCommunication.clearMessages()
  }

  return {
    messages,
    removeMessage,
    clearAll,
    hasMessages: messages.length > 0,
    messageCount: messages.length,
  }
}

// Componente para exibir mensagens de degradação
export function DegradationMessageCenter({
  position = "top-right",
  maxVisible = 3,
}: {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  maxVisible?: number
}) {
  const { messages, removeMessage } = useDegradationMessages()
  const visibleMessages = messages.slice(-maxVisible)

  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "top-4 right-4"
      case "top-left":
        return "top-4 left-4"
      case "bottom-right":
        return "bottom-4 right-4"
      case "bottom-left":
        return "bottom-4 left-4"
      default:
        return "top-4 right-4"
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-800"
      case "success":
        return "bg-green-50 border-green-200 text-green-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "info":
        return "ℹ️"
      case "warning":
        return "⚠️"
      case "error":
        return "❌"
      case "success":
        return "✅"
      default:
        return "📢"
    }
  }

  if (visibleMessages.length === 0) return null

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-sm`}>
      {visibleMessages.map((message) => (
        <DegradationMessageItem
          key={message.id}
          message={message}
          onRemove={() => removeMessage(message.id)}
          colorClass={getMessageColor(message.type)}
          icon={getIcon(message.type)}
        />
      ))}
    </div>
  )
}

// Componente individual de mensagem
function DegradationMessageItem({
  message,
  onRemove,
  colorClass,
  icon,
}: {
  message: DegradationMessage
  onRemove: () => void
  colorClass: string
  icon: string
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`rounded-lg border p-4 shadow-lg ${colorClass} animate-in slide-in-from-right`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{message.title}</h4>
            <p className="text-sm mt-1 opacity-90">{message.message}</p>

            {message.details && (
              <details className="mt-2">
                <summary
                  className="text-xs cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowDetails(!showDetails)
                  }}
                >
                  {showDetails ? "Menos detalhes" : "Mais detalhes"}
                </summary>
                {showDetails && <p className="text-xs mt-1 opacity-75">{message.details}</p>}
              </details>
            )}

            {message.actions && message.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (action.handler) {
                        action.handler()
                      } else {
                        handleAction(action.action)
                      }
                      onRemove()
                    }}
                    className="text-xs px-2 py-1 rounded border border-current opacity-75 hover:opacity-100 transition-opacity"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!message.persistent && (
          <button
            onClick={onRemove}
            className="text-xs opacity-50 hover:opacity-75 transition-opacity ml-2"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// Componente para banner de mensagens importantes
export function DegradationMessageBanner() {
  const { messages } = useDegradationMessages()

  // Mostrar apenas mensagens de erro ou warning persistentes
  const importantMessages = messages.filter(
    (msg) => (msg.type === "error" || msg.type === "warning") && msg.persistent
  )

  if (importantMessages.length === 0) return null

  const message = importantMessages[0] // Mostrar apenas a mais importante

  const getColorClass = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-800"
      default:
        return "bg-blue-50 border-blue-200 text-blue-800"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return "⚠️"
      case "error":
        return "🚨"
      default:
        return "ℹ️"
    }
  }

  return (
    <div className={`w-full border-b ${getColorClass(message?.type || "info")}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getIcon(message?.type || "info")}</span>
            <div className="text-sm">
              <span className="font-medium">{message?.title || ""}</span>
              <span className="ml-2 opacity-90">{message?.message || ""}</span>
            </div>
          </div>

          {message?.actions && message.actions.length > 0 && (
            <div className="flex space-x-2">
              {message.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.action)}
                  className="text-sm underline hover:no-underline"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente inline para contexto específico
export function ContextualMessage({
  type,
  title,
  message,
  showIcon = true,
}: {
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  showIcon?: boolean
}) {
  const getColorClass = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-800"
      case "success":
        return "bg-green-50 border-green-200 text-green-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "info":
        return "ℹ️"
      case "warning":
        return "⚠️"
      case "error":
        return "❌"
      case "success":
        return "✅"
      default:
        return "📢"
    }
  }

  return (
    <div className={`rounded-lg border p-3 ${getColorClass(type)}`}>
      <div className="flex items-center space-x-2">
        {showIcon && <span>{getIcon(type)}</span>}
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm opacity-90">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Hook para mensagens contextuais
export function useContextualMessages() {
  const addMessage = (
    type: "info" | "warning" | "error" | "success",
    title: string,
    message: string,
    options?: {
      duration?: number
      persistent?: boolean
      details?: string
      actions?: Array<{
        label: string
        action: "retry" | "refresh" | "continue" | "contact"
        handler?: () => void
      }>
    }
  ) => {
    return degradationCommunication.addMessage({
      type,
      title,
      message,
      details: options?.details,
      actions: options?.actions,
      duration: options?.duration,
      persistent: options?.persistent,
    })
  }

  const notifySlow = (operation: string) => {
    return addMessage(
      "warning",
      "Processamento Lento",
      `${operation} está demorando mais que o normal devido à alta demanda.`,
      {
        details: "Seu arquivo está seguro e será processado. Agradecemos a paciência.",
        duration: 15000,
      }
    )
  }

  const notifyQueue = (position: number, estimatedTime: number) => {
    const formatTime = (ms: number): string => {
      if (ms < 60000) return `${Math.round(ms / 1000)}s`
      return `${Math.round(ms / 60000)}min`
    }

    return addMessage(
      "info",
      "Na Fila de Processamento",
      `Posição ${position} - Tempo estimado: ${formatTime(estimatedTime)}`,
      {
        duration: 30000,
      }
    )
  }

  const notifyFeatureLimited = (feature: string) => {
    return addMessage(
      "warning",
      "Funcionalidade Limitada",
      `${feature} está operando com capacidade reduzida.`,
      {
        details: "Para garantir estabilidade, limitamos temporariamente esta funcionalidade.",
        duration: 20000,
      }
    )
  }

  const notifySuccess = (operation: string) => {
    return addMessage("success", "Operação Concluída", `${operation} foi concluída com sucesso.`, {
      duration: 5000,
    })
  }

  return {
    addMessage,
    notifySlow,
    notifyQueue,
    notifyFeatureLimited,
    notifySuccess,
  }
}

// Função auxiliar para tratar ações
function handleAction(action: "retry" | "refresh" | "continue" | "contact") {
  switch (action) {
    case "retry":
      // Em produção, implementar retry da operação
      console.log("Retrying operation...")
      break
    case "refresh":
      window.location.reload()
      break
    case "continue":
      // Não faz nada, apenas fecha a mensagem
      break
    case "contact":
      // Em produção, abrir chat de suporte ou enviar email
      window.open("mailto:support@example.com?subject=Preciso de ajuda")
      break
  }
}
