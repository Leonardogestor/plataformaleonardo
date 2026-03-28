/**
 * BLINDAGEM - Validação de Dados
 * Funções utilitárias para validar e sanitizar dados
 */

// Validação de email
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

// Validação de CPF
export const isValidCPF = (cpf: string): boolean => {
  if (!cpf || typeof cpf !== 'string') return false
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) return false
  
  // Algoritmo de validação de CPF
  let sum = 0
  let remainder = 0
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

// Validação de valores monetários
export const isValidCurrency = (value: string | number): boolean => {
  if (value === null || value === undefined) return false
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value
  return !isNaN(numValue) && numValue >= 0 && numValue <= 999999999.99
}

// Sanitização de valores monetários
export const sanitizeCurrency = (value: string | number): number => {
  if (!value || value === '') return 0
  const cleanValue = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value.toString()
  const numValue = parseFloat(cleanValue)
  return isNaN(numValue) ? 0 : Math.max(0, numValue)
}

// Validação de datas
export const isValidDate = (dateString: string): boolean => {
  if (!dateString || typeof dateString !== 'string') return false
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100
}

// Validação de telefone
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 11
}

// Validação de senhas
export const isValidPassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') return false
  return password.length >= 6 && password.length <= 128
}

// Validação de nomes
export const isValidName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false
  const cleanName = name.trim()
  return cleanName.length >= 2 && cleanName.length <= 100 && /^[a-zA-ZÀ-ú\s]+$/.test(cleanName)
}

// Validação de valores numéricos positivos
export const isValidPositiveNumber = (value: any): boolean => {
  if (value === null || value === undefined) return false
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(numValue) && numValue > 0
}

// Sanitização de strings
export const sanitizeString = (value: any): string => {
  if (!value || value === '') return ''
  return String(value).trim().substring(0, 500)
}

// Validação de objetos
export const isValidObject = (obj: any): boolean => {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

// Validação de arrays
export const isValidArray = (arr: any): boolean => {
  return Array.isArray(arr) && arr.length >= 0
}

// Validação de IDs (UUID ou número)
export const isValidId = (id: any): boolean => {
  if (id === null || id === undefined) return false
  if (typeof id === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id) || /^\d+$/.test(id)
  }
  return typeof id === 'number' && id > 0 && Number.isInteger(id)
}

// Validação de categorias
export const isValidCategory = (category: string): boolean => {
  if (!category || typeof category !== 'string') return false
  const validCategories = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Outros']
  return validCategories.includes(category.trim())
}

// Validação de tipos de conta
export const isValidAccountType = (type: string): boolean => {
  if (!type || typeof type !== 'string') return false
  const validTypes = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'OTHER']
  return validTypes.includes(type.toUpperCase())
}

// Validação de tipos de transação
export const isValidTransactionType = (type: string): boolean => {
  if (!type || typeof type !== 'string') return false
  const validTypes = ['INCOME', 'EXPENSE', 'TRANSFER']
  return validTypes.includes(type.toUpperCase())
}

// Função principal de validação
export const validateData = (data: any, schema: Record<string, (value: any) => boolean>): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  for (const [key, validator] of Object.entries(schema)) {
    const value = data[key]
    if (!validator(value)) {
      errors.push(`Campo ${key} inválido`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
