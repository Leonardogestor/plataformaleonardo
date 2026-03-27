"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useFinancialData } from "./use-financial-data-react-query"
import { useRobustProfileDetection } from "./use-robust-profile-detection"
import {
  TrustEditableTransaction,
  TrustEditableValue,
  createTrustEditable,
  getTrustFinalValue,
  trustOverrideValue,
  trustRevertToOriginal,
  calculateTrustMetrics,
  trustValidationRules,
  TrustEditableStrategyParams,
} from "@/types/trust-data"

interface AutosaveEditableData {
  transactions: TrustEditableTransaction[]
  strategyParams: TrustEditableStrategyParams
  trustMetrics: {
    score: number
    level: "high" | "medium" | "low"
    overrideRatio: number
    anomalyCount: number
  }
  lastSaveTime: Date | null
  isSaving: boolean
  pendingChanges: number
}

export function useAutosaveEditableData() {
  const { calculations, transactions, isLoading } = useFinancialData()
  const profileData = useRobustProfileDetection()

  const [editableData, setEditableData] = useState<AutosaveEditableData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)

  // Debounce timer for autosave
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef(0)

  // Initialize editable data when raw data loads
  useEffect(() => {
    if (isLoading || !transactions) return

    const editableTransactions: TrustEditableTransaction[] = transactions.map((t) => ({
      id: t.id,
      amount: createTrustEditable(t.amount),
      category: createTrustEditable(t.category),
      type: createTrustEditable(t.type),
      date: createTrustEditable(t.date),
      description: createTrustEditable(t.description),
      status: createTrustEditable(t.status),
      userId: t.userId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))

    // Initialize strategy params based on profile
    const targetSavingsRate = profileData?.profile === "variable" ? 0.3 : 0.25
    const emergencyReserveMonths = profileData?.profile === "variable" ? 12 : 6

    setEditableData({
      transactions: editableTransactions,
      strategyParams: {
        targetSavingsRate: createTrustEditable(targetSavingsRate),
        retirementAge: createTrustEditable(60),
        expectedReturn: createTrustEditable(0.07),
        emergencyReserveMonths: createTrustEditable(emergencyReserveMonths),
        riskTolerance: createTrustEditable<"conservative" | "moderate" | "aggressive">("moderate"),
      },
      trustMetrics: {
        score: 1.0,
        level: "high",
        overrideRatio: 0,
        anomalyCount: 0,
      },
      lastSaveTime: null,
      isSaving: false,
      pendingChanges: 0,
    })
  }, [transactions, profileData, isLoading])

  // Helper to validate field value with anomaly detection
  const validateField = useCallback(
    (field: string, value: any, originalValue?: any): string | null => {
      const rules = trustValidationRules[field as keyof typeof trustValidationRules]
      if (!rules) return null

      for (const rule of rules) {
        if (!(rule.validate as any)(value, originalValue)) {
          return rule.message
        }
      }
      return null
    },
    []
  )

  // Autosave function with debouncing
  const triggerAutosave = useCallback(async () => {
    if (!editableData || editableData.pendingChanges === 0) return

    setIsSaving(true)

    try {
      // Collect all changed transactions
      const changedTransactions = editableData.transactions.filter((t) =>
        Object.values(t).some(
          (field) =>
            typeof field === "object" &&
            field !== null &&
            "isUserModified" in field &&
            field.isUserModified
        )
      )

      // Save to backend
      const savePromises = changedTransactions.map(async (transaction) => {
        const payload = {
          amount: getTrustFinalValue(transaction.amount),
          category: getTrustFinalValue(transaction.category),
          type: getTrustFinalValue(transaction.type),
          date: getTrustFinalValue(transaction.date),
          description: getTrustFinalValue(transaction.description),
          status: getTrustFinalValue(transaction.status),
        }

        const response = await fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`Failed to save transaction ${transaction.id}`)
        }

        return response.json()
      })

      await Promise.all(savePromises)

      // Update save time and clear pending changes
      const now = new Date()
      setLastSaveTime(now)

      setEditableData((prev) =>
        prev
          ? {
              ...prev,
              lastSaveTime: now,
              pendingChanges: 0,
              isSaving: false,
            }
          : null
      )

      // Show success toast (would be implemented with toast system)
      console.log("✅ Alterações salvas automaticamente")

      // Invalidate React Query cache to refresh data
      window.dispatchEvent(new Event("financial-data-updated"))
    } catch (error) {
      console.error("Failed to save changes:", error)
      setIsSaving(false)
      throw error
    }
  }, [editableData])

  // Edit transaction field with autosave trigger
  const editTransaction = useCallback(
    (transactionId: string, field: keyof TrustEditableTransaction, value: any) => {
      if (!editableData) return

      setEditableData((prev) => {
        if (!prev) return prev

        const updatedTransactions = prev.transactions.map((t) => {
          if (t.id === transactionId) {
            const fieldValue = t[field] as TrustEditableValue<any>
            const originalValue = fieldValue.originalValue

            // Validate the value with anomaly detection
            const validationError = validateField(field, value, originalValue)
            if (validationError) {
              console.warn("Validation error:", validationError)
              return t // Don't apply invalid changes
            }

            const newEditableValue = trustOverrideValue(fieldValue, value)

            return {
              ...t,
              [field]: newEditableValue,
            }
          }
          return t
        })

        // Calculate new trust metrics
        const trustMetrics = calculateTrustMetrics({ transactions: updatedTransactions })

        return {
          ...prev,
          transactions: updatedTransactions,
          trustMetrics: {
            score: trustMetrics.confidenceScore,
            level: trustMetrics.trustLevel,
            overrideRatio: trustMetrics.overrideRatio,
            anomalyCount: trustMetrics.anomalyCount,
          },
          pendingChanges: prev.pendingChanges + 1,
        }
      })

      // Trigger autosave with debounce
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }

      autosaveTimerRef.current = setTimeout(() => {
        triggerAutosave()
      }, 800) // 800ms debounce

      pendingChangesRef.current++
    },
    [editableData, validateField, triggerAutosave]
  )

  // Edit strategy parameter with autosave
  const editStrategyParam = useCallback(
    (param: keyof TrustEditableStrategyParams, value: any) => {
      if (!editableData) return

      setEditableData((prev) => {
        if (!prev) return prev

        const fieldValue = prev.strategyParams[param] as TrustEditableValue<any>
        const originalValue = fieldValue.originalValue

        // Validate the value
        const validationError = validateField(param, value, originalValue)
        if (validationError) {
          console.warn("Validation error:", validationError)
          return prev
        }

        const newEditableValue = trustOverrideValue(fieldValue, value)

        return {
          ...prev,
          strategyParams: {
            ...prev.strategyParams,
            [param]: newEditableValue,
          },
          pendingChanges: prev.pendingChanges + 1,
        }
      })

      // Trigger autosave with debounce
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }

      autosaveTimerRef.current = setTimeout(() => {
        triggerAutosave()
      }, 800)

      pendingChangesRef.current++
    },
    [editableData, validateField, triggerAutosave]
  )

  // Revert transaction field
  const revertTransaction = useCallback(
    (transactionId: string, field: keyof TrustEditableTransaction) => {
      if (!editableData) return

      setEditableData((prev) => {
        if (!prev) return prev

        const updatedTransactions = prev.transactions.map((t) => {
          if (t.id === transactionId) {
            const fieldValue = t[field] as TrustEditableValue<any>
            const revertedValue = trustRevertToOriginal(fieldValue)

            return {
              ...t,
              [field]: revertedValue,
            }
          }
          return t
        })

        // Recalculate trust metrics
        const trustMetrics = calculateTrustMetrics({ transactions: updatedTransactions })

        return {
          ...prev,
          transactions: updatedTransactions,
          trustMetrics: {
            score: trustMetrics.confidenceScore,
            level: trustMetrics.trustLevel,
            overrideRatio: trustMetrics.overrideRatio,
            anomalyCount: trustMetrics.anomalyCount,
          },
          pendingChanges: prev.pendingChanges + 1,
        }
      })

      // Trigger autosave
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }

      autosaveTimerRef.current = setTimeout(() => {
        triggerAutosave()
      }, 800)

      pendingChangesRef.current++
    },
    [editableData, triggerAutosave]
  )

  // Force save now
  const forceSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    await triggerAutosave()
  }, [triggerAutosave])

  // Get effective calculations with edited values
  const effectiveCalculations = useMemo(() => {
    if (!editableData || !calculations) return calculations

    // Recalculate with edited values
    const editedTransactions = editableData.transactions.map((t) => ({
      ...t,
      amount: getTrustFinalValue(t.amount),
      type: getTrustFinalValue(t.type),
      category: getTrustFinalValue(t.category),
      date: getTrustFinalValue(t.date),
      description: getTrustFinalValue(t.description),
      status: getTrustFinalValue(t.status),
    }))

    // Use profile-aware effective income
    const effectiveIncome = profileData?.incomeAnalysis.avg6m || calculations.receitas

    const receitas = editedTransactions
      .filter((t) => (getTrustFinalValue as any)(t.type) === "income")
      .reduce((sum, t) => sum + (getTrustFinalValue as any)(t.amount), 0)

    const despesas = editedTransactions
      .filter((t) => (getTrustFinalValue as any)(t.type) === "expense")
      .reduce((sum, t) => sum + (getTrustFinalValue as any)(t.amount), 0)

    const investimentos = editedTransactions
      .filter((t) =>
        ["investment", "investment_withdraw"].includes((getTrustFinalValue as any)(t.type))
      )
      .reduce((sum, t) => {
        const type = (getTrustFinalValue as any)(t.type)
        const amount = (getTrustFinalValue as any)(t.amount)
        if (type === "investment") return sum - Math.abs(amount)
        if (type === "investment_withdraw") return sum + Math.abs(amount)
        return sum
      }, 0)

    const resultado = receitas + despesas + investimentos
    const savingsRate = effectiveIncome > 0 ? resultado / effectiveIncome : 0

    return {
      ...calculations,
      receitas,
      despesas,
      investimentos,
      resultado,
      savingsRate,
      effectiveIncome,
    }
  }, [editableData, calculations, profileData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  return {
    editableData,
    effectiveCalculations,
    isSaving,
    lastSaveTime,
    trustMetrics: editableData?.trustMetrics,
    pendingChanges: editableData?.pendingChanges || 0,
    editTransaction,
    editStrategyParam,
    revertTransaction,
    forceSave,
    validateField,
  }
}
