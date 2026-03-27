// Enhanced editable model with trust tracking
export interface TrustEditableValue<T> {
  originalValue: T
  overrideValue?: T
  isUserModified: boolean
  lastEdited?: Date
  editCount: number
  anomalyFlag?: boolean
}

// Helper functions for trust editable values
export function createTrustEditable<T>(value: T): TrustEditableValue<T> {
  return {
    originalValue: value,
    isUserModified: false,
    editCount: 0,
  }
}

export function getTrustFinalValue<T>(editable: TrustEditableValue<T>): T {
  return editable.overrideValue ?? editable.originalValue
}

export function trustOverrideValue<T>(
  editable: TrustEditableValue<T>,
  newValue: T
): TrustEditableValue<T> {
  const isAnomaly =
    typeof editable.originalValue === "number" && typeof newValue === "number"
      ? detectAnomaly(editable.originalValue, newValue)
      : false

  return {
    ...editable,
    overrideValue: newValue,
    isUserModified: true,
    lastEdited: new Date(),
    editCount: editable.editCount + 1,
    anomalyFlag: isAnomaly,
  }
}

export function trustRevertToOriginal<T>(editable: TrustEditableValue<T>): TrustEditableValue<T> {
  return {
    ...editable,
    overrideValue: undefined,
    isUserModified: false,
    lastEdited: new Date(),
    anomalyFlag: false,
  }
}

// Anomaly detection
export function detectAnomaly(original: number, override: number): boolean {
  if (original === 0) return override > 1000 // Zero original case
  if (override === 0) return false // Allow zero override
  const ratio = Math.abs(override / original)
  return ratio > 3 // More than 3x difference
}

// Trust metrics
export interface TrustMetrics {
  overrideRatio: number
  anomalyCount: number
  totalFields: number
  modifiedFields: number
  confidenceScore: number
  trustLevel: "high" | "medium" | "low"
}

export function calculateTrustMetrics(editableData: any): TrustMetrics {
  let totalFields = 0
  let modifiedFields = 0
  let anomalyCount = 0

  function countEditableFields(obj: any) {
    for (const key in obj) {
      const value = obj[key]

      if (typeof value === "object" && value !== null) {
        if ("originalValue" in value) {
          totalFields++
          if (value.isUserModified) {
            modifiedFields++
          }
          if (value.anomalyFlag) {
            anomalyCount++
          }
        } else {
          countEditableFields(value)
        }
      }
    }
  }

  countEditableFields(editableData)

  const overrideRatio = totalFields > 0 ? modifiedFields / totalFields : 0
  const anomalyPenalty = anomalyCount > 0 ? anomalyCount * 0.1 : 0
  const confidenceScore = Math.max(0, 1 - overrideRatio - anomalyPenalty)

  let trustLevel: "high" | "medium" | "low" = "medium"
  if (confidenceScore > 0.8) trustLevel = "high"
  else if (confidenceScore <= 0.5) trustLevel = "low"

  return {
    overrideRatio,
    anomalyCount,
    totalFields,
    modifiedFields,
    confidenceScore,
    trustLevel,
  }
}

// Enhanced transaction with trust tracking
export interface TrustEditableTransaction {
  id: string
  amount: TrustEditableValue<number>
  category: TrustEditableValue<string>
  type: TrustEditableValue<"income" | "expense" | "investment" | "investment_withdraw">
  date: TrustEditableValue<string>
  description: TrustEditableValue<string>
  status: TrustEditableValue<"green" | "yellow" | "red">
  userId: string
  createdAt: Date
  updatedAt: Date
}

// Enhanced strategy params with trust tracking
export interface TrustEditableStrategyParams {
  targetSavingsRate: TrustEditableValue<number>
  retirementAge: TrustEditableValue<number>
  expectedReturn: TrustEditableValue<number>
  emergencyReserveMonths: TrustEditableValue<number>
  riskTolerance: TrustEditableValue<"conservative" | "moderate" | "aggressive">
}

// Enhanced validation with anomaly detection
export const trustValidationRules = {
  amount: [
    {
      validate: (value: number, original?: number) => {
        if (original && detectAnomaly(original, value)) {
          return false
        }
        return value >= 0 && value <= 10000000
      },
      message: "Valor inválido ou muito diferente do original",
    },
    {
      validate: (value: number) => value >= 0,
      message: "Valor não pode ser negativo",
    },
  ],
  category: [
    {
      validate: (value: string) => value.trim().length > 0,
      message: "Categoria não pode ser vazia",
    },
    {
      validate: (value: string) => value.length <= 50,
      message: "Categoria muito longa",
    },
  ],
  description: [
    {
      validate: (value: string) => value.trim().length > 0,
      message: "Descrição não pode ser vazia",
    },
    {
      validate: (value: string) => value.length <= 200,
      message: "Descrição muito longa",
    },
  ],
  savingsRate: [
    {
      validate: (value: number, original?: number) => {
        if (original && detectAnomaly(original, value)) {
          return false
        }
        return value >= 0 && value <= 1
      },
      message: "Taxa de poupança inválida ou muito diferente da original",
    },
  ],
  retirementAge: [
    {
      validate: (value: number, original?: number) => {
        if (original && detectAnomaly(original, value)) {
          return false
        }
        return value >= 50 && value <= 80
      },
      message: "Idade de aposentadoria inválida ou muito diferente da original",
    },
  ],
  expectedReturn: [
    {
      validate: (value: number, original?: number) => {
        if (original && detectAnomaly(original, value)) {
          return false
        }
        return value >= 0 && value <= 0.3
      },
      message: "Retorno esperado inválido ou muito diferente da original",
    },
  ],
}
