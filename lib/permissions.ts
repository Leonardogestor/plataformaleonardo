/**
 * BLINDAGEM - Sistema de Permissões e Acesso
 * Controle de acesso baseado em roles e permissões específicas
 */

import React from "react"

// Tipos de usuários
export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  VIEWER = "VIEWER",
}

// Permissões específicas
export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  VIEW_STRATEGY = "VIEW_STRATEGY",

  // Contas
  VIEW_ACCOUNTS = "VIEW_ACCOUNTS",
  CREATE_ACCOUNTS = "CREATE_ACCOUNTS",
  EDIT_ACCOUNTS = "EDIT_ACCOUNTS",
  DELETE_ACCOUNTS = "DELETE_ACCOUNTS",

  // Transações
  VIEW_TRANSACTIONS = "VIEW_TRANSACTIONS",
  CREATE_TRANSACTIONS = "CREATE_TRANSACTIONS",
  EDIT_TRANSACTIONS = "EDIT_TRANSACTIONS",
  DELETE_TRANSACTIONS = "DELETE_TRANSACTIONS",
  IMPORT_TRANSACTIONS = "IMPORT_TRANSACTIONS",

  // Cartões
  VIEW_CARDS = "VIEW_CARDS",
  CREATE_CARDS = "CREATE_CARDS",
  EDIT_CARDS = "EDIT_CARDS",
  DELETE_CARDS = "DELETE_CARDS",

  // Investimentos
  VIEW_INVESTMENTS = "VIEW_INVESTMENTS",
  CREATE_INVESTMENTS = "CREATE_INVESTMENTS",
  EDIT_INVESTMENTS = "EDIT_INVESTMENTS",
  DELETE_INVESTMENTS = "DELETE_INVESTMENTS",

  // Metas
  VIEW_GOALS = "VIEW_GOALS",
  CREATE_GOALS = "CREATE_GOALS",
  EDIT_GOALS = "EDIT_GOALS",
  DELETE_GOALS = "DELETE_GOALS",

  // Projeções
  VIEW_PROJECTIONS = "VIEW_PROJECTIONS",
  EDIT_PROJECTIONS = "EDIT_PROJECTIONS",

  // Relatórios
  VIEW_REPORTS = "VIEW_REPORTS",
  EXPORT_REPORTS = "EXPORT_REPORTS",

  // Configurações
  VIEW_SETTINGS = "VIEW_SETTINGS",
  EDIT_SETTINGS = "EDIT_SETTINGS",

  // Administração
  MANAGE_USERS = "MANAGE_USERS",
  VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS",
  MANAGE_SYSTEM = "MANAGE_SYSTEM",
}

// Mapeamento de roles para permissões
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin tem todas as permissões
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STRATEGY,
    Permission.VIEW_ACCOUNTS,
    Permission.CREATE_ACCOUNTS,
    Permission.EDIT_ACCOUNTS,
    Permission.DELETE_ACCOUNTS,
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.EDIT_TRANSACTIONS,
    Permission.DELETE_TRANSACTIONS,
    Permission.IMPORT_TRANSACTIONS,
    Permission.VIEW_CARDS,
    Permission.CREATE_CARDS,
    Permission.EDIT_CARDS,
    Permission.DELETE_CARDS,
    Permission.VIEW_INVESTMENTS,
    Permission.CREATE_INVESTMENTS,
    Permission.EDIT_INVESTMENTS,
    Permission.DELETE_INVESTMENTS,
    Permission.VIEW_GOALS,
    Permission.CREATE_GOALS,
    Permission.EDIT_GOALS,
    Permission.DELETE_GOALS,
    Permission.VIEW_PROJECTIONS,
    Permission.EDIT_PROJECTIONS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.MANAGE_USERS,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.MANAGE_SYSTEM,
  ],
  [UserRole.USER]: [
    // Usuário comum tem permissões básicas
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STRATEGY,
    Permission.VIEW_ACCOUNTS,
    Permission.CREATE_ACCOUNTS,
    Permission.EDIT_ACCOUNTS,
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.EDIT_TRANSACTIONS,
    Permission.DELETE_TRANSACTIONS,
    Permission.IMPORT_TRANSACTIONS,
    Permission.VIEW_CARDS,
    Permission.CREATE_CARDS,
    Permission.EDIT_CARDS,
    Permission.DELETE_CARDS,
    Permission.VIEW_INVESTMENTS,
    Permission.CREATE_INVESTMENTS,
    Permission.EDIT_INVESTMENTS,
    Permission.DELETE_INVESTMENTS,
    Permission.VIEW_GOALS,
    Permission.CREATE_GOALS,
    Permission.EDIT_GOALS,
    Permission.DELETE_GOALS,
    Permission.VIEW_PROJECTIONS,
    Permission.EDIT_PROJECTIONS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
  ],
  [UserRole.VIEWER]: [
    // Viewer só pode visualizar
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STRATEGY,
    Permission.VIEW_ACCOUNTS,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_CARDS,
    Permission.VIEW_INVESTMENTS,
    Permission.VIEW_GOALS,
    Permission.VIEW_PROJECTIONS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
  ],
}

// Interface de usuário com permissões
export interface UserWithPermissions {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: Permission[]
}

// Função para obter permissões de um role
export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || []
}

// Função para verificar se um usuário tem uma permissão específica
export const hasPermission = (
  user: UserWithPermissions | null,
  permission: Permission
): boolean => {
  if (!user) return false
  return user.permissions.includes(permission)
}

// Função para verificar se um usuário tem alguma das permissões listadas
export const hasAnyPermission = (
  user: UserWithPermissions | null,
  permissions: Permission[]
): boolean => {
  if (!user) return false
  return permissions.some((permission) => user.permissions.includes(permission))
}

// Função para verificar se um usuário tem todas as permissões listadas
export const hasAllPermissions = (
  user: UserWithPermissions | null,
  permissions: Permission[]
): boolean => {
  if (!user) return false
  return permissions.every((permission) => user.permissions.includes(permission))
}

// Função para verificar se um usuário pode acessar uma rota
export const canAccessRoute = (user: UserWithPermissions | null, route: string): boolean => {
  if (!user) return false

  const routePermissions: Record<string, Permission[]> = {
    "/dashboard": [Permission.VIEW_DASHBOARD],
    "/strategy": [Permission.VIEW_STRATEGY],
    "/accounts": [Permission.VIEW_ACCOUNTS],
    "/transactions": [Permission.VIEW_TRANSACTIONS],
    "/cards": [Permission.VIEW_CARDS],
    "/investments": [Permission.VIEW_INVESTMENTS],
    "/goals": [Permission.VIEW_GOALS],
    "/projections": [Permission.VIEW_PROJECTIONS],
    "/reports": [Permission.VIEW_REPORTS],
    "/settings": [Permission.VIEW_SETTINGS],
    "/admin": [Permission.MANAGE_SYSTEM],
  }

  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) return true // Rotas sem restrição

  return hasAnyPermission(user, requiredPermissions)
}

// Função para criar um usuário com permissões
export const createUserWithPermissions = (
  userData: Omit<UserWithPermissions, "permissions">
): UserWithPermissions => {
  const permissions = getRolePermissions(userData.role)
  return {
    ...userData,
    permissions,
  }
}

// Hook para verificar permissões em componentes
export const usePermissions = (user: UserWithPermissions | null) => {
  const checkPermission = (permission: Permission) => hasPermission(user, permission)
  const checkAnyPermission = (permissions: Permission[]) => hasAnyPermission(user, permissions)
  const checkAllPermissions = (permissions: Permission[]) => hasAllPermissions(user, permissions)
  const checkRouteAccess = (route: string) => canAccessRoute(user, route)

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    checkRouteAccess,
    isAdmin: user?.role === UserRole.ADMIN,
    isUser: user?.role === UserRole.USER,
    isViewer: user?.role === UserRole.VIEWER,
  }
}

// Componente de proteção de rota
export const ProtectedRoute = ({
  user,
  requiredPermissions,
  children,
  fallback = null,
}: {
  user: UserWithPermissions | null
  requiredPermissions: Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) => {
  const hasRequiredPermissions = hasAllPermissions(user, requiredPermissions)

  if (!hasRequiredPermissions) {
    return fallback || React.createElement("div", null, "Acesso negado")
  }

  return React.createElement(React.Fragment, null, children)
}

// Middleware para validação de permissões em API
export const validateApiPermission = (
  user: UserWithPermissions | null,
  requiredPermission: Permission
): { authorized: boolean; error?: string } => {
  if (!user) {
    return { authorized: false, error: "Usuário não autenticado" }
  }

  if (!hasPermission(user, requiredPermission)) {
    return { authorized: false, error: "Permissão negada" }
  }

  return { authorized: true }
}

// Função para validar permissão em tempo de execução
export const requirePermission = (
  user: UserWithPermissions | null,
  permission: Permission,
  errorMessage = "Acesso negado"
): void => {
  if (!hasPermission(user, permission)) {
    throw new Error(errorMessage)
  }
}

// Exportar tudo em um objeto para fácil importação
export const Permissions = {
  UserRole,
  Permission,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
  createUserWithPermissions,
  usePermissions,
  ProtectedRoute,
  validateApiPermission,
  requirePermission,
}
