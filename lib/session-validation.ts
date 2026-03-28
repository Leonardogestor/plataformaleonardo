/**
 * BLINDAGEM - Validação de Sessão e Usuário
 * Sistema robusto de validação de sessões e dados do usuário
 */

import { jwtDecode } from 'jwt-decode'
import { isValidEmail, isValidId, TypeGuards } from './type-guards'
import { UserRole, Permission, hasPermission } from './permissions'

// Interface de dados do usuário
export interface UserData {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: Permission[]
  createdAt: string
  updatedAt: string
  lastLogin?: string
  isActive: boolean
}

// Interface de sessão
export interface SessionData {
  user: UserData
  token: string
  refreshToken?: string
  expiresAt: number
  deviceId?: string
  ipAddress?: string
}

// Interface de token JWT
export interface JwtPayload {
  sub: string // user id
  email: string
  name: string
  role: UserRole
  iat: number // issued at
  exp: number // expires at
  permissions?: Permission[]
}

// Classe de validação de sessão
export class SessionValidator {
  private static readonly TOKEN_PREFIX = 'Bearer '
  private static readonly MIN_TOKEN_LENGTH = 50
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutos

  // Validar formato do token
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false
    
    // Remover prefixo Bearer se existir
    const cleanToken = token.startsWith(this.TOKEN_PREFIX) 
      ? token.substring(this.TOKEN_PREFIX.length) 
      : token
    
    // Verificar tamanho mínimo
    if (cleanToken.length < this.MIN_TOKEN_LENGTH) return false
    
    // Verificar formato básico do JWT (3 partes separadas por .)
    const parts = cleanToken.split('.')
    if (parts.length !== 3) return false
    
    try {
      // Tentar decodificar para validar formato
      jwtDecode<JwtPayload>(cleanToken)
      return true
    } catch {
      return false
    }
  }

  // Decodificar token JWT
  static decodeToken(token: string): JwtPayload | null {
    try {
      const cleanToken = token.startsWith(this.TOKEN_PREFIX) 
        ? token.substring(this.TOKEN_PREFIX.length) 
        : token
      
      return jwtDecode<JwtPayload>(cleanToken)
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  // Verificar se token expirou
  static isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload) return true
    
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  }

  // Validar dados do usuário
  static validateUserData(userData: any): userData is UserData {
    if (!TypeGuards.isObject(userData)) return false
    
    const user = userData as any
    
    return (
      TypeGuards.isString(user.id) && isValidId(user.id) &&
      TypeGuards.isString(user.email) && isValidEmail(user.email) &&
      TypeGuards.isString(user.name) && user.name.trim().length > 0 &&
      TypeGuards.isString(user.role) && Object.values(UserRole).includes(user.role) &&
      TypeGuards.isArray(user.permissions) &&
      TypeGuards.isString(user.createdAt) &&
      TypeGuards.isString(user.updatedAt) &&
      TypeGuards.isBoolean(user.isActive) &&
      (user.lastLogin === undefined || TypeGuards.isString(user.lastLogin))
    )
  }

  // Validar dados de sessão
  static validateSessionData(sessionData: any): sessionData is SessionData {
    if (!TypeGuards.isObject(sessionData)) return false
    
    const session = sessionData as any
    
    return (
      this.validateUserData(session.user) &&
      TypeGuards.isString(session.token) && this.isValidTokenFormat(session.token) &&
      TypeGuards.isNumber(session.expiresAt) &&
      (session.refreshToken === undefined || TypeGuards.isString(session.refreshToken)) &&
      (session.deviceId === undefined || TypeGuards.isString(session.deviceId)) &&
      (session.ipAddress === undefined || TypeGuards.isString(session.ipAddress))
    )
  }

  // Verificar se sessão está ativa
  static isSessionActive(sessionData: SessionData): boolean {
    const now = Date.now()
    return sessionData.expiresAt > now && !this.isTokenExpired(sessionData.token)
  }

  // Criar objeto de usuário a partir do token
  static createUserFromToken(token: string): UserData | null {
    const payload = this.decodeToken(token)
    if (!payload) return null
    
    const user: UserData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions || [],
      createdAt: new Date(payload.iat * 1000).toISOString(),
      updatedAt: new Date(payload.iat * 1000).toISOString(),
      isActive: true,
      lastLogin: new Date(payload.iat * 1000).toISOString()
    }
    
    return this.validateUserData(user) ? user : null
  }

  // Validar sessão completa
  static validateSession(token: string, sessionData?: any): {
    valid: boolean
    user?: UserData
    error?: string
  } {
    // Validar formato do token
    if (!this.isValidTokenFormat(token)) {
      return { valid: false, error: 'Token inválido' }
    }
    
    // Verificar se token expirou
    if (this.isTokenExpired(token)) {
      return { valid: false, error: 'Token expirado' }
    }
    
    // Criar usuário a partir do token
    const user = this.createUserFromToken(token)
    if (!user) {
      return { valid: false, error: 'Dados do usuário inválidos' }
    }
    
    // Verificar se usuário está ativo
    if (!user.isActive) {
      return { valid: false, error: 'Usuário inativo' }
    }
    
    // Validar dados de sessão se fornecidos
    if (sessionData) {
      if (!this.validateSessionData(sessionData)) {
        return { valid: false, error: 'Dados de sessão inválidos' }
      }
      
      if (!this.isSessionActive(sessionData)) {
        return { valid: false, error: 'Sessão expirada' }
      }
    }
    
    return { valid: true, user }
  }

  // Verificar permissões do usuário
  static hasUserPermission(user: UserData, permission: Permission): boolean {
    return hasPermission({ ...user, permissions: user.permissions }, permission)
  }

  // Atualizar última atividade da sessão
  static updateSessionActivity(sessionData: SessionData): SessionData {
    return {
      ...sessionData,
      expiresAt: Date.now() + this.SESSION_TIMEOUT
    }
  }

  // Limpar dados sensíveis do usuário
  static sanitizeUserData(userData: UserData): Omit<UserData, 'permissions' | 'createdAt' | 'updatedAt'> {
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      isActive: userData.isActive,
      lastLogin: userData.lastLogin
    }
  }
}

// Hook para validação de sessão
export const useSessionValidation = () => {
  const validateToken = (token: string) => {
    return SessionValidator.validateSession(token)
  }

  const validateUser = (userData: any): userData is UserData => {
    return SessionValidator.validateUserData(userData)
  }

  const checkPermission = (user: UserData, permission: Permission): boolean => {
    return SessionValidator.hasUserPermission(user, permission)
  }

  const isTokenExpired = (token: string): boolean => {
    return SessionValidator.isTokenExpired(token)
  }

  const decodeToken = (token: string): JwtPayload | null => {
    return SessionValidator.decodeToken(token)
  }

  return {
    validateToken,
    validateUser,
    checkPermission,
    isTokenExpired,
    decodeToken
  }
}

// Middleware para validação de sessão em APIs
export const validateSessionMiddleware = (
  req: Request,
  requiredPermission?: Permission
): {
  authorized: boolean
  user?: UserData
  error?: string
} => {
  // Obter token do header Authorization
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { authorized: false, error: 'Token não fornecido' }
  }

  // Validar sessão
  const sessionValidation = SessionValidator.validateSession(authHeader)
  if (!sessionValidation.valid || !sessionValidation.user) {
    return { authorized: false, error: sessionValidation.error }
  }

  const user = sessionValidation.user

  // Verificar permissão se necessária
  if (requiredPermission && !SessionValidator.hasUserPermission(user, requiredPermission)) {
    return { authorized: false, error: 'Permissão negada' }
  }

  return { authorized: true, user }
}

// Função para armazenar sessão segura
export const storeSession = (sessionData: SessionData): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Armazenar apenas dados essenciais
      const safeSession = {
        user: SessionValidator.sanitizeUserData(sessionData.user),
        token: sessionData.token,
        expiresAt: sessionData.expiresAt
      }
      
      localStorage.setItem('session', JSON.stringify(safeSession))
    } catch (error) {
      console.error('Error storing session:', error)
    }
  }
}

// Função para recuperar sessão
export const getSession = (): SessionData | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('session')
      if (!stored) return null
      
      const sessionData = JSON.parse(stored)
      
      // Reconstruir objeto completo
      const user = SessionValidator.createUserFromToken(sessionData.token)
      if (!user) return null
      
      return {
        user,
        token: sessionData.token,
        expiresAt: sessionData.expiresAt
      }
    } catch (error) {
      console.error('Error retrieving session:', error)
      return null
    }
  }
  
  return null
}

// Função para limpar sessão
export const clearSession = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('session')
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }
}

// Exportar tudo
export const SessionValidation = {
  SessionValidator,
  useSessionValidation,
  validateSessionMiddleware,
  storeSession,
  getSession,
  clearSession
}
