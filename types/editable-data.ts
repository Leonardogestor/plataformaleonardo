// Override model for editable financial data
export interface EditableValue<T> {
  originalValue: T
  overrideValue?: T
  isEdited: boolean
  lastEdited?: Date
}

// Helper to create editable values
export function createEditable<T>(value: T): EditableValue<T> {
  return {
    originalValue: value,
    isEdited: false
  }
}

// Helper to get final value
export function getFinalValue<T>(editable: EditableValue<T>): T {
  return editable.overrideValue ?? editable.originalValue
}

// Helper to override value
export function overrideValue<T>(editable: EditableValue<T>, newValue: T): EditableValue<T> {
  return {
    ...editable,
    overrideValue: newValue,
    isEdited: true,
    lastEdited: new Date()
  }
}

// Helper to revert to original
export function revertToOriginal<T>(editable: EditableValue<T>): EditableValue<T> {
  return {
    ...editable,
    overrideValue: undefined,
    isEdited: false,
    lastEdited: new Date()
  }
}

// Transaction with editable fields
export interface EditableTransaction {
  id: string
  amount: EditableValue<number>
  category: EditableValue<string>
  type: EditableValue<'income' | 'expense' | 'investment' | 'investment_withdraw'>
  date: EditableValue<string>
  description: EditableValue<string>
  status: EditableValue<'green' | 'yellow' | 'red'>
  userId: string
  createdAt: Date
  updatedAt: Date
}

// Income source with editable fields
export interface EditableIncomeSource {
  id: string
  name: EditableValue<string>
  amount: EditableValue<number>
  type: EditableValue<'recurring' | 'one-time'>
  category: EditableValue<string>
  isActive: EditableValue<boolean>
  userId: string
}

// Strategy parameters with editable fields
export interface EditableStrategyParams {
  targetSavingsRate: EditableValue<number>
  retirementAge: EditableValue<number>
  expectedReturn: EditableValue<number>
  emergencyReserveMonths: EditableValue<number>
  riskTolerance: EditableValue<'conservative' | 'moderate' | 'aggressive'>
}

// Change history for audit trail
export interface ChangeHistory {
  id: string
  entityType: 'transaction' | 'income' | 'strategy' | 'category'
  entityId: string
  field: string
  oldValue: any
  newValue: any
  timestamp: Date
  userId: string
  reason?: string
}

// Validation rules
export interface ValidationRule<T> {
  validate: (value: T) => boolean
  message: string
}

export const validationRules = {
  amount: [
    {
      validate: (value: number) => value >= 0,
      message: "Valor não pode ser negativo"
    },
    {
      validate: (value: number) => value <= 10000000,
      message: "Valor muito alto para transação pessoal"
    }
  ],
  category: [
    {
      validate: (value: string) => value.trim().length > 0,
      message: "Categoria não pode ser vazia"
    },
    {
      validate: (value: string) => value.length <= 50,
      message: "Categoria muito longa"
    }
  ],
  description: [
    {
      validate: (value: string) => value.trim().length > 0,
      message: "Descrição não pode ser vazia"
    },
    {
      validate: (value: string) => value.length <= 200,
      message: "Descrição muito longa"
    }
  ],
  savingsRate: [
    {
      validate: (value: number) => value >= 0 && value <= 1,
      message: "Taxa de poupança deve estar entre 0% e 100%"
    }
  ],
  retirementAge: [
    {
      validate: (value: number) => value >= 50 && value <= 80,
      message: "Idade de aposentadoria deve estar entre 50 e 80 anos"
    }
  ],
  expectedReturn: [
    {
      validate: (value: number) => value >= 0 && value <= 0.30,
      message: "Retorno esperado deve estar entre 0% e 30% ao ano"
    }
  ]
}
