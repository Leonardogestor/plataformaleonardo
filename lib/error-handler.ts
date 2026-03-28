/**
 * BLINDAGEM - Tratamento de Erros Global
 * Sistema centralizado de tratamento de erros
 */

import React from "react"
import { toast } from "@/hooks/use-toast"

// Tipos de erro
export enum ErrorType {
  VALIDATION = "VALIDATION",
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}

// Interface de erro personalizado
export interface AppError {
  type: ErrorType
  message: string
  code?: string
  details?: any
  timestamp: Date
  stack?: string
}

// Classe de erro personalizada
export class CustomError extends Error {
  public readonly type: ErrorType
  public readonly code?: string
  public readonly details?: any

  constructor(type: ErrorType, message: string, code?: string, details?: any) {
    super(message)
    this.type = type
    this.code = code
    this.details = details
    this.name = "CustomError"
  }
}

// Função para determinar tipo de erro baseado no status HTTP
export const getErrorTypeFromStatus = (status: number): ErrorType => {
  if (status === 400) return ErrorType.VALIDATION
  if (status === 401) return ErrorType.AUTHENTICATION
  if (status === 403) return ErrorType.AUTHORIZATION
  if (status === 404) return ErrorType.NOT_FOUND
  if (status >= 500) return ErrorType.SERVER_ERROR
  if (status >= 400) return ErrorType.NETWORK
  return ErrorType.UNKNOWN
}

// Função para criar erro padronizado
export const createError = (
  error: any,
  defaultMessage = "Ocorreu um erro inesperado"
): AppError => {
  const timestamp = new Date()

  // Se já for um CustomError
  if (error instanceof CustomError) {
    return {
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      stack: error.stack,
    }
  }

  // Se for erro de HTTP (fetch)
  if (error.status) {
    const type = getErrorTypeFromStatus(error.status)
    return {
      type,
      message: error.message || defaultMessage,
      code: error.status.toString(),
      details: error,
      timestamp,
    }
  }

  // Se for erro genérico
  return {
    type: ErrorType.UNKNOWN,
    message: error?.message || defaultMessage,
    details: error,
    timestamp,
    stack: error?.stack,
  }
}

// Função para logar erros
export const logError = (error: AppError, context?: string) => {
  const logData = {
    ...error,
    context,
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Server",
    url: typeof window !== "undefined" ? window.location.href : "Server",
  }

  // Log no console em desenvolvimento
  if (process.env.NODE_ENV === "development") {
    console.error("🚨 [ERROR]", logData)
  }

  // Aqui você poderia enviar para um serviço de logging
  // Ex: Sentry, LogRocket, etc.
}

// Função para mostrar toast de erro
export const showErrorToast = (error: AppError) => {
  const messages = {
    [ErrorType.VALIDATION]: "Verifique os dados informados",
    [ErrorType.NETWORK]: "Erro de conexão. Tente novamente",
    [ErrorType.AUTHENTICATION]: "Faça login para continuar",
    [ErrorType.AUTHORIZATION]: "Você não tem permissão para esta ação",
    [ErrorType.NOT_FOUND]: "Recurso não encontrado",
    [ErrorType.SERVER_ERROR]: "Erro no servidor. Tente novamente",
    [ErrorType.UNKNOWN]: "Ocorreu um erro inesperado",
  }

  toast({
    title: "Erro",
    description: error.message || messages[error.type],
    variant: "destructive",
  })
}

// Função para mostrar toast de sucesso
export const showSuccessToast = (message: string) => {
  toast({
    title: "Sucesso",
    description: message,
  })
}

// Wrapper para funções assíncronas com tratamento de erro
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context?: string,
  showToast = true
): Promise<T | null> => {
  try {
    const result = await fn()
    return result
  } catch (error) {
    const appError = createError(error)
    logError(appError, context)

    if (showToast) {
      showErrorToast(appError)
    }

    return null
  }
}

// Hook para tratamento de erros em componentes
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string, showToast = true) => {
    const appError = createError(error)
    logError(appError, context)

    if (showToast) {
      showErrorToast(appError)
    }

    return appError
  }

  return { handleError }
}

// Função para validar resposta de API
export const validateApiResponse = (response: any): boolean => {
  if (!response || typeof response !== "object") {
    return false
  }

  // Verificar se tem dados ou mensagem de erro
  return response.data !== undefined || response.error !== undefined
}

// Função para retry com backoff exponencial
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error

      // Não retry em erros de autenticação/autorização
      const appError = createError(error)
      if (appError.type === ErrorType.AUTHENTICATION || appError.type === ErrorType.AUTHORIZATION) {
        throw error
      }

      // Espera com backoff exponencial
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// Boundary para componentes React
export class ErrorBoundary {
  static wrap(component: React.ComponentType<any>): React.ComponentType<any> {
    return (props: any) => {
      try {
        return React.createElement(component, props)
      } catch (error) {
        const appError = createError(error)
        logError(appError, "Component Error")
        return React.createElement(
          "div",
          {
            style: { padding: "20px", border: "1px solid red", borderRadius: "8px" },
          },
          "Ocorreu um erro ao carregar este componente."
        )
      }
    }
  }
}
