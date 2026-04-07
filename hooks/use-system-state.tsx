/**
 * Hook React para Estados do Sistema - Clareza Total
 * Comunicação visual e comportamento baseado em estado
 */

import { useState, useEffect } from 'react'
import { systemStateManager, SystemState, SystemStateConfig } from '@/lib/system-states'

export function useSystemState() {
  const [state, setState] = useState<SystemState>(systemStateManager.getCurrentState())
  const [config, setConfig] = useState<SystemStateConfig>(systemStateManager.getCurrentConfig())

  useEffect(() => {
    const unsubscribe = systemStateManager.subscribe((newState, newConfig) => {
      setState(newState)
      setConfig(newConfig)
    })

    return unsubscribe
  }, [])

  return {
    state,
    config,
    isNormal: state === 'normal',
    isSlow: state === 'slow',
    isLimited: state === 'limited',
    isUnavailable: state === 'unavailable',
    hasIssues: state !== 'normal'
  }
}

// Componente para indicador de estado do sistema
export function SystemStateIndicator({ 
  showDetails = false,
  compact = false 
}: { 
  showDetails?: boolean
  compact?: boolean 
}) {
  const { state, config } = useSystemState()

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 text-sm ${
        state === 'normal' ? 'text-green-600' :
        state === 'slow' ? 'text-yellow-600' :
        state === 'limited' ? 'text-orange-600' :
        'text-red-600'
      }`}>
        <span className={config.visualIndicators.animation}>
          {config.visualIndicators.icon}
        </span>
        {!showDetails && (
          <span className="hidden sm:inline">
            {config.name}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-4 ${
      state === 'normal' ? 'border-green-200 bg-green-50' :
      state === 'slow' ? 'border-yellow-200 bg-yellow-50' :
      state === 'limited' ? 'border-orange-200 bg-orange-50' :
      'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`text-2xl ${config.visualIndicators.animation || ''}`}>
            {config.visualIndicators.icon}
          </span>
          <div>
            <h3 className="font-medium text-gray-900">
              Sistema {config.name}
            </h3>
            <p className="text-sm text-gray-600">
              {config.userMessage}
            </p>
          </div>
        </div>
        
        {showDetails && (
          <div className="text-right">
            <div className="text-sm">
              <div>Performance: {config.behavior.performance}</div>
              <div>Confiabilidade: {config.behavior.reliability}</div>
            </div>
          </div>
        )}
      </div>

      {/* Features status */}
      {showDetails && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {Object.entries(config.behavior.features).map(([feature, status]) => (
            <div key={feature} className="flex items-center justify-between">
              <span className="capitalize">{feature.replace('_', ' ')}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                status === 'full' ? 'bg-green-100 text-green-800' :
                status === 'limited' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status === 'full' ? 'Total' :
                 status === 'limited' ? 'Limitado' :
                 'Indisponível'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ações em andamento */}
      {showDetails && config.actions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Ações em andamento:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {config.actions.map((action, index) => (
              <li key={index} className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Componente para banner de estado
export function SystemStateBanner() {
  const { state, config, hasIssues } = useSystemState()

  if (!hasIssues) return null

  return (
    <div className={`w-full border-b ${
      state === 'slow' ? 'bg-yellow-50 border-yellow-200' :
      state === 'limited' ? 'bg-orange-50 border-orange-200' :
      'bg-red-50 border-red-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`text-lg ${config.visualIndicators.animation || ''}`}>
              {config.visualIndicators.icon}
            </span>
            <div className="text-sm">
              <span className="font-medium">{config.userMessage}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              // Em produção, abrir modal com detalhes
              console.log('Show system details')
            }}
            className="text-sm underline hover:no-underline"
          >
            Saiba mais
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook para verificar disponibilidade de features
export function useFeatureAvailability(feature: string) {
  const { state, config } = useSystemState()
  
  const availability = config.behavior.features[feature] || 'disabled'
  
  return {
    isAvailable: availability !== 'disabled',
    isLimited: availability === 'limited',
    isFull: availability === 'full',
    message: availability === 'disabled' ? 
      'Esta funcionalidade está temporariamente indisponível.' :
      availability === 'limited' ?
      'Esta funcionalidade está operando com capacidade reduzida.' :
      'Funcionalidade disponível normalmente.'
  }
}

// Componente wrapper para features com verificação de disponibilidade
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showWarning = true 
}: {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showWarning?: boolean
}) {
  const availability = useFeatureAvailability(feature)

  if (!availability.isAvailable) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showWarning) {
      return (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-medium text-orange-800">
                Funcionalidade Indisponível
              </h4>
              <p className="text-sm text-orange-600">
                {availability.message}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  if (availability.isLimited && showWarning) {
    return (
      <div>
        <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <div className="flex items-center space-x-2">
            <span>🐌</span>
            <p className="text-sm text-yellow-800">
              {availability.message}
            </p>
          </div>
        </div>
        {children}
      </div>
    )
  }

  return <>{children}</>
}

// Hook para mensagens de estado
export function useSystemMessages() {
  const { state, config } = useSystemState()

  const getOperationMessage = (operation: string): string => {
    const baseMessages = {
      normal: {
        upload: 'Upload sendo processado normalmente.',
        analysis: 'Análise em andamento.',
        sync: 'Sincronização em progresso.'
      },
      slow: {
        upload: 'Upload sendo processado, mas pode levar mais tempo que o normal.',
        analysis: 'Análise em andamento, processamento mais lento devido à demanda.',
        sync: 'Sincronização em progresso, levando mais tempo que o habitual.'
      },
      limited: {
        upload: 'Upload em fila devido à alta demanda. Você será notificado quando começar.',
        analysis: 'Análise temporariamente limitada. Pode haver fila de processamento.',
        sync: 'Sincronização em modo limitado. Atualizações podem demorar mais.'
      },
      unavailable: {
        upload: 'Upload temporariamente indisponível. Tente novamente mais tarde.',
        analysis: 'Análise indisponível no momento. Funcionalidade essencial mantida.',
        sync: 'Sincronização indisponível. Dados mais recentes serão sincronizados quando possível.'
      }
    }

    return baseMessages[state]?.[operation as keyof typeof baseMessages.normal] || 
           'Operação em andamento.'
  }

  const getQueueMessage = (position: number, total: number): string => {
    if (state === 'normal') {
      return `Posição ${position} de ${total} na fila. Processamento normal.`
    } else if (state === 'slow') {
      return `Posição ${position} de ${total} na fila. Processamento mais lento devido à demanda.`
    } else if (state === 'limited') {
      return `Posição ${position} de ${total} na fila. Sistema operando com capacidade reduzida.`
    } else {
      return `Posição ${position} de ${total} na fila. Sistema em modo emergencial. Agradecemos a paciência.`
    }
  }

  return {
    state,
    config,
    getOperationMessage,
    getQueueMessage,
    userMessage: config.userMessage,
    visualIndicators: config.visualIndicators
  }
}
