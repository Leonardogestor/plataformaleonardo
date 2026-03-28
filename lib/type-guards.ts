/**
 * BLINDAGEM - Type Guards e Null Checks
 * Funções para validação de tipos e prevenção de null/undefined
 */

// Type guards básicos
export const isString = (value: unknown): value is string => {
  return typeof value === "string"
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value)
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean"
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value)
}

export const isFunction = (value: unknown): value is Function => {
  return typeof value === "function"
}

export const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime())
}

export const isNull = (value: unknown): value is null => {
  return value === null
}

export const isUndefined = (value: unknown): value is undefined => {
  return value === undefined
}

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return value === null || value === undefined
}

// Type guards específicos da aplicação
export const isValidUser = (
  user: unknown
): user is {
  id: string
  email: string
  name: string
  role: string
} => {
  if (!isObject(user)) return false

  const u = user as any
  return (
    isString(u.id) &&
    isString(u.email) &&
    isString(u.name) &&
    isString(u.role) &&
    u.id.length > 0 &&
    u.email.length > 0 &&
    u.name.length > 0
  )
}

export const isValidAccount = (
  account: unknown
): account is {
  id: string
  name: string
  type: string
  balance: number
  institution: string
} => {
  if (!isObject(account)) return false

  const a = account as any
  return (
    isString(a.id) &&
    isString(a.name) &&
    isString(a.type) &&
    isNumber(a.balance) &&
    isString(a.institution) &&
    a.id.length > 0 &&
    a.name.length > 0 &&
    a.type.length > 0 &&
    a.institution.length > 0
  )
}

export const isValidTransaction = (
  transaction: unknown
): transaction is {
  id: string
  description: string
  amount: number
  type: string
  category: string
  date: string
} => {
  if (!isObject(transaction)) return false

  const t = transaction as any
  return (
    isString(t.id) &&
    isString(t.description) &&
    isNumber(t.amount) &&
    isString(t.type) &&
    isString(t.category) &&
    isString(t.date) &&
    t.id.length > 0 &&
    t.description.length > 0 &&
    t.type.length > 0 &&
    t.category.length > 0 &&
    t.date.length > 0
  )
}

export const isValidFinancialData = (
  data: unknown
): data is {
  receitas: number
  despesas: number
  investimentos: number
  resultado: number
  savingsRate: number
} => {
  if (!isObject(data)) return false

  const d = data as any
  return (
    isNumber(d.receitas) &&
    isNumber(d.despesas) &&
    isNumber(d.investimentos) &&
    isNumber(d.resultado) &&
    isNumber(d.savingsRate) &&
    !isNaN(d.receitas) &&
    !isNaN(d.despesas) &&
    !isNaN(d.investimentos) &&
    !isNaN(d.resultado) &&
    !isNaN(d.savingsRate)
  )
}

// Funções de null checking com fallbacks
export const safeString = (value: unknown, fallback = ""): string => {
  return isString(value) ? value : fallback
}

export const safeNumber = (value: unknown, fallback = 0): number => {
  return isNumber(value) ? value : fallback
}

export const safeBoolean = (value: unknown, fallback = false): boolean => {
  return isBoolean(value) ? value : fallback
}

export const safeArray = <T>(value: unknown, fallback = []): T[] => {
  return isArray(value) ? (value as T[]) : fallback
}

export const safeObject = <T extends Record<string, unknown>>(
  value: unknown,
  fallback: T = {} as T
): T => {
  return isObject(value) ? (value as T) : fallback
}

export const safeDate = (value: unknown, fallback = new Date()): Date => {
  return isDate(value) ? value : fallback
}

// Funções para acesso seguro a propriedades de objetos
export const safeGet = <T>(obj: unknown, path: string, fallback?: T): T | undefined => {
  if (!isObject(obj)) return fallback

  const keys = path.split(".")
  let current: any = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return fallback
    }
    current = current[key]
  }

  return current !== undefined ? current : fallback
}

// Função para verificar se um objeto está vazio
export const isEmpty = (value: unknown): boolean => {
  if (isNullOrUndefined(value)) return true
  if (isString(value)) return value.trim().length === 0
  if (isArray(value)) return value.length === 0
  if (isObject(value)) return Object.keys(value).length === 0
  return false
}

// Função para validar arrays de objetos
export const isValidArrayOf = <T>(
  arr: unknown,
  validator: (item: unknown) => item is T
): arr is T[] => {
  if (!isArray(arr)) return false
  return arr.every(validator)
}

// Função para validar strings específicas
export const isValidEmail = (email: unknown): email is string => {
  if (!isString(email)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export const isValidCurrency = (value: unknown): value is number => {
  if (!isString(value) && !isNumber(value)) return false
  const numValue = isString(value) ? parseFloat(value.replace(/[^\d.-]/g, "")) : value
  return isNumber(numValue) && numValue >= 0 && numValue <= 999999999.99
}

// Função para validar IDs
export const isValidId = (id: unknown): id is string => {
  if (!isString(id)) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) || /^\d+$/.test(id)
}

// Função para validar status HTTP
export const isValidHttpStatus = (status: unknown): status is number => {
  return isNumber(status) && status >= 100 && status < 600
}

// Função para validar resposta de API
export const isValidApiResponse = (
  response: unknown
): response is {
  data?: unknown
  error?: string
  status?: number
} => {
  if (!isObject(response)) return false

  const r = response as any
  return (
    (r.data !== undefined || r.error !== undefined) &&
    (r.status === undefined || isValidHttpStatus(r.status))
  )
}

// Função para validar parâmetros de URL
export const isValidUrlParams = (params: unknown): params is Record<string, string> => {
  if (!isObject(params)) return false

  return Object.entries(params).every(
    ([key, value]) => isString(key) && key.length > 0 && isString(value)
  )
}

// Função para validar configurações
export const isValidConfig = (
  config: unknown
): config is {
  apiUrl: string
  maxRetries: number
  timeout: number
} => {
  if (!isObject(config)) return false

  const c = config as any
  return (
    isString(c.apiUrl) &&
    c.apiUrl.length > 0 &&
    isNumber(c.maxRetries) &&
    c.maxRetries > 0 &&
    isNumber(c.timeout) &&
    c.timeout > 0
  )
}

// Função principal de validação de tipos
export const validateType = <T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  errorMessage?: string
): T => {
  if (!validator(value)) {
    throw new Error(errorMessage || `Invalid type: ${typeof value}`)
  }
  return value
}

// Função para validação múltipla
export const validateMultiple = <T>(
  value: unknown,
  validators: Array<(value: unknown) => boolean>
): boolean => {
  return validators.every((validator) => validator(value))
}

// Exportar tudo em um objeto para fácil importação
export const TypeGuards = {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isDate,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isValidUser,
  isValidAccount,
  isValidTransaction,
  isValidFinancialData,
  safeString,
  safeNumber,
  safeBoolean,
  safeArray,
  safeObject,
  safeDate,
  safeGet,
  isEmpty,
  isValidArrayOf,
  isValidEmail,
  isValidCurrency,
  isValidId,
  isValidHttpStatus,
  isValidApiResponse,
  isValidUrlParams,
  isValidConfig,
  validateType,
  validateMultiple,
}
