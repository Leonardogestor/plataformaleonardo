/**
 * Comunicação de Degradação - UX Clara e Consistente
 * Garante que o usuário sempre entenda o que está acontecendo
 */

export interface DegradationMessage {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  details?: string
  actions?: Array<{
    label: string
    action: 'retry' | 'refresh' | 'continue' | 'contact'
    handler?: () => void
  }>
  duration?: number // ms
  persistent?: boolean
  timestamp: number
}

export interface CommunicationConfig {
  showSystemState: boolean
  showQueueStatus: boolean
  showProgress: boolean
  autoHide: boolean
  maxMessages: number
  groupSimilar: boolean
}

class DegradationCommunicationManager {
  private static instance: DegradationCommunicationManager
  private messages: DegradationMessage[] = []
  private subscribers: Set<(messages: DegradationMessage[]) => void> = new Set()
  private config: CommunicationConfig
  private messageQueue: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.config = {
      showSystemState: true,
      showQueueStatus: true,
      showProgress: true,
      autoHide: true,
      maxMessages: 5,
      groupSimilar: true
    }
  }

  static getInstance(): DegradationCommunicationManager {
    if (!this.instance) {
      this.instance = new DegradationCommunicationManager()
    }
    return this.instance
  }

  // Adicionar mensagem de degradação
  addMessage(message: Omit<DegradationMessage, 'id' | 'timestamp'>): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const fullMessage: DegradationMessage = {
      ...message,
      id,
      timestamp: Date.now()
    }

    // Verificar se deve agrupar mensagens similares
    if (this.config.groupSimilar) {
      const existing = this.findSimilarMessage(fullMessage)
      if (existing) {
        this.updateExistingMessage(existing, fullMessage)
        return existing.id
      }
    }

    // Limitar número de mensagens
    if (this.messages.length >= this.config.maxMessages) {
      this.messages.shift()
    }

    this.messages.push(fullMessage)

    // Auto-hide se configurado
    if (this.config.autoHide && message.duration) {
      const timeout = setTimeout(() => {
        this.removeMessage(id)
      }, message.duration)
      
      this.messageQueue.set(id, timeout)
    }

    this.notifySubscribers()
    
    console.log(`[DegradationCommunication] Message added: ${message.title}`)
    
    return id
  }

  // Remover mensagem
  removeMessage(id: string): void {
    const index = this.messages.findIndex(msg => msg.id === id)
    if (index !== -1) {
      this.messages.splice(index, 1)
      
      // Limpar timeout se existir
      const timeout = this.messageQueue.get(id)
      if (timeout) {
        clearTimeout(timeout)
        this.messageQueue.delete(id)
      }
      
      this.notifySubscribers()
    }
  }

  // Limpar todas as mensagens
  clearMessages(): void {
    this.messages.forEach(msg => {
      const timeout = this.messageQueue.get(msg.id)
      if (timeout) {
        clearTimeout(timeout)
      }
    })
    
    this.messages = []
    this.messageQueue.clear()
    this.notifySubscribers()
  }

  // Obter mensagens ativas
  getMessages(): DegradationMessage[] {
    return [...this.messages]
  }

  // Subscrever para atualizações
  subscribe(callback: (messages: DegradationMessage[]) => void): () => void {
    this.subscribers.add(callback)
    
    // Enviar mensagens atuais imediatamente
    callback(this.getMessages())
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Mensagens predefinidas para cenários comuns
  getSystemSlowMessage(): DegradationMessage {
    return {
      id: '',
      type: 'warning',
      title: 'Sistema Mais Lento',
      message: 'O sistema está respondendo mais lentamente que o normal devido à alta demanda.',
      details: 'Estamos processando todas as requisições na ordem recebida. Sua operação será concluída em breve.',
      actions: [
        { label: 'Aguardar', action: 'continue' },
        { label: 'Atualizar Página', action: 'refresh' }
      ],
      duration: 15000,
      timestamp: 0
    }
  }

  getQueueMessage(position: number, estimatedTime: number, type: string): DegradationMessage {
    const formatTime = (ms: number): string => {
      if (ms < 60000) return `${Math.round(ms / 1000)} segundos`
      return `${Math.round(ms / 60000)} minutos`
    }

    return {
      id: '',
      type: 'info',
      title: 'Processamento em Fila',
      message: `Sua ${type} está na posição ${position} da fila.`,
      details: `Tempo estimado: ${formatTime(estimatedTime)}. Você será notificado quando começar o processamento.`,
      actions: [
        { label: 'Aguardar', action: 'continue' }
      ],
      duration: 30000,
      timestamp: 0
    }
  }

  getFeatureLimitedMessage(feature: string): DegradationMessage {
    const featureNames = {
      pdf_processing: 'Processamento de PDF',
      ai_analysis: 'Análise de IA',
      data_sync: 'Sincronização de dados',
      upload: 'Upload de arquivos'
    }

    return {
      id: '',
      type: 'warning',
      title: 'Funcionalidade Limitada',
      message: `${featureNames[feature as keyof typeof featureNames] || feature} está operando com capacidade reduzida.`,
      details: 'Para garantir estabilidade para todos os usuários, limitamos temporariamente esta funcionalidade.',
      actions: [
        { label: 'Entendido', action: 'continue' }
      ],
      duration: 20000,
      timestamp: 0
    }
  }

  getFeatureUnavailableMessage(feature: string): DegradationMessage {
    const featureNames = {
      pdf_processing: 'Processamento de PDF',
      ai_analysis: 'Análise de IA',
      data_sync: 'Sincronização de dados',
      upload: 'Upload de arquivos'
    }

    return {
      id: '',
      type: 'error',
      title: 'Funcionalidade Indisponível',
      message: `${featureNames[feature as keyof typeof featureNames] || feature} está temporariamente indisponível.`,
      details: 'Estamos trabalhando para restaurar esta funcionalidade o mais rápido possível.',
      actions: [
        { label: 'Tentar Novamente', action: 'retry' },
        { label: 'Contatar Suporte', action: 'contact' }
      ],
      persistent: true,
      timestamp: 0
    }
  }

  getProcessingSlowMessage(operation: string, progress: number): DegradationMessage {
    return {
      id: '',
      type: 'info',
      title: 'Processamento em Andamento',
      message: `${operation} está sendo processada (${progress}% concluído).`,
      details: 'O sistema está operando mais lentamente que o normal, mas sua operação será concluída.',
      actions: [
        { label: 'Aguardar', action: 'continue' }
      ],
      duration: 10000,
      timestamp: 0
    }
  }

  getRecoveryMessage(): DegradationMessage {
    return {
      id: '',
      type: 'success',
      title: 'Sistema Recuperado',
      message: 'O sistema voltou ao normal. Todas as funcionalidades estão operando normalmente.',
      details: 'Obrigado pela sua paciência enquanto resolvíamos as dificuldades técnicas.',
      actions: [
        { label: 'Continuar', action: 'continue' }
      ],
      duration: 10000,
      timestamp: 0
    }
  }

  // Métodos de conveniência
  notifySystemSlow(): void {
    this.addMessage(this.getSystemSlowMessage())
  }

  notifyQueueStatus(position: number, estimatedTime: number, type: string): void {
    this.addMessage(this.getQueueMessage(position, estimatedTime, type))
  }

  notifyFeatureLimited(feature: string): void {
    this.addMessage(this.getFeatureLimitedMessage(feature))
  }

  notifyFeatureUnavailable(feature: string): void {
    this.addMessage(this.getFeatureUnavailableMessage(feature))
  }

  notifyProcessingSlow(operation: string, progress: number): void {
    this.addMessage(this.getProcessingSlowMessage(operation, progress))
  }

  notifyRecovery(): void {
    this.addMessage(this.getRecoveryMessage())
  }

  // Métodos privados
  private findSimilarMessage(newMessage: DegradationMessage): DegradationMessage | null {
    return this.messages.find(msg => 
      msg.type === newMessage.type && 
      msg.title === newMessage.title
    ) || null
  }

  private updateExistingMessage(existing: DegradationMessage, updated: DegradationMessage): void {
    const index = this.messages.findIndex(msg => msg.id === existing.id)
    if (index !== -1) {
      this.messages[index] = {
        ...existing,
        message: updated.message,
        details: updated.details,
        timestamp: Date.now()
      }
      
      // Resetar timeout
      const timeout = this.messageQueue.get(existing.id)
      if (timeout) {
        clearTimeout(timeout)
        if (this.config.autoHide && updated.duration) {
          const newTimeout = setTimeout(() => {
            this.removeMessage(existing.id)
          }, updated.duration)
          this.messageQueue.set(existing.id, newTimeout)
        }
      }
      
      this.notifySubscribers()
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getMessages())
      } catch (error) {
        console.error('[DegradationCommunication] Error in subscriber callback:', error)
      }
    })
  }
}

// Singleton global
export const degradationCommunication = DegradationCommunicationManager.getInstance()

// Funções para uso fácil
export function notifySystemSlow(): void {
  degradationCommunication.notifySystemSlow()
}

export function notifyQueueStatus(position: number, estimatedTime: number, type: string): void {
  degradationCommunication.notifyQueueStatus(position, estimatedTime, type)
}

export function notifyFeatureLimited(feature: string): void {
  degradationCommunication.notifyFeatureLimited(feature)
}

export function notifyFeatureUnavailable(feature: string): void {
  degradationCommunication.notifyFeatureUnavailable(feature)
}

export function notifyProcessingSlow(operation: string, progress: number): void {
  degradationCommunication.notifyProcessingSlow(operation, progress)
}

export function notifyRecovery(): void {
  degradationCommunication.notifyRecovery()
}

// Mensagens personalizadas
export function addCustomMessage(message: {
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  details?: string
  actions?: Array<{
    label: string
    action: 'retry' | 'refresh' | 'continue' | 'contact'
    handler?: () => void
  }>
  duration?: number
  persistent?: boolean
}): string {
  return degradationCommunication.addMessage(message)
}

export function removeMessage(id: string): void {
  degradationCommunication.removeMessage(id)
}

export function clearAllMessages(): void {
  degradationCommunication.clearMessages()
}
