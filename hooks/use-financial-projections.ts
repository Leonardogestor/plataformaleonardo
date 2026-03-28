"use client"

import { useState, useEffect, useCallback } from "react"
import { useGlobalDate } from "@/contexts/global-date-context"
import { MonthlyProjection, FinancialField, calcularMes, getValorMes } from "@/types/financial"

interface UseFinancialProjectionsReturn {
  projections: MonthlyProjection[]
  currentProjection: MonthlyProjection | null
  loading: boolean
  error: string | null
  updateField: (
    month: number,
    year: number,
    field: "receita" | "despesas" | "percentualInvestimento",
    value: number,
    isManual: boolean
  ) => void
  generateProjections: (startMonth: number, startYear: number, monthsAhead: number) => void
  recalculateAll: () => void
}

const DEFAULT_PERCENTUAL = 0.2 // 20%

export function useFinancialProjections(): UseFinancialProjectionsReturn {
  const { month, year } = useGlobalDate()
  const [projections, setProjections] = useState<MonthlyProjection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🧠 GERAR PROJEÇÕES AUTOMÁTICAS
  const generateProjections = useCallback(
    (startMonth: number, startYear: number, monthsAhead: number) => {
      setLoading(true)
      setError(null)

      try {
        const newProjections: MonthlyProjection[] = []
        let previousProjection: MonthlyProjection | undefined

        for (let i = 0; i < monthsAhead; i++) {
          const currentMonth = ((startMonth - 1 + i) % 12) + 1
          const currentYear = startYear + Math.floor((startMonth - 1 + i) / 12)

          // Criar projeção base (automática por padrão)
          const baseProjection: MonthlyProjection = {
            month: currentMonth,
            year: currentYear,
            receita: { value: 0, isManual: false },
            despesas: { value: 0, isManual: false },
            percentualInvestimento: { value: DEFAULT_PERCENTUAL, isManual: false },
            investimento: 0,
            resultado: 0,
            savingsRate: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // 🧠 APLICAR LÓGICA HÍBRIDA - apenas se houver dados anteriores
          if (
            previousProjection &&
            (previousProjection.receita.value > 0 || previousProjection.despesas.value > 0)
          ) {
            const calculatedProjection = calcularMes(
              baseProjection,
              previousProjection,
              DEFAULT_PERCENTUAL
            )
            newProjections.push(calculatedProjection)
          } else {
            // Manter valores zerados se não houver dados anteriores
            newProjections.push(baseProjection)
          }
          previousProjection = newProjections[newProjections.length - 1]
        }

        setProjections(newProjections)
      } catch (err) {
        setError("Erro ao gerar projeções")
        console.error("Error generating projections:", err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // 🧠 ATUALIZAR CAMPO ESPECÍFICO
  const updateField = useCallback(
    (
      targetMonth: number,
      targetYear: number,
      field: "receita" | "despesas" | "percentualInvestimento",
      value: number,
      isManual: boolean
    ) => {
      setProjections((prev) => {
        const updated = [...prev]
        const targetIndex = updated.findIndex(
          (p) => p.month === targetMonth && p.year === targetYear
        )

        if (targetIndex === -1) return prev

        // Atualizar campo específico
        const targetProjection = updated[targetIndex]
        if (!targetProjection) return prev

        updated[targetIndex] = {
          ...targetProjection,
          [field]: { value, isManual },
          updatedAt: new Date(),
        } as MonthlyProjection

        // 🔄 EFEITO CASCATA - recalcular meses seguintes
        for (let i = targetIndex + 1; i < updated.length; i++) {
          const previous = updated[i - 1]
          const current = updated[i]

          if (!previous || !current) continue

          // Recalcular apenas campos não-manuais
          const recalculated = calcularMes(current, previous, DEFAULT_PERCENTUAL)
          updated[i] = recalculated
        }

        return updated
      })
    },
    []
  )

  // 🧠 RECALCULAR TODAS AS PROJEÇÕES
  const recalculateAll = useCallback(() => {
    if (projections.length === 0) return

    const recalculated: MonthlyProjection[] = []
    let previous: MonthlyProjection | undefined

    for (const projection of projections) {
      const result = calcularMes(projection, previous || undefined, DEFAULT_PERCENTUAL)
      recalculated.push(result)
      previous = result
    }

    setProjections(recalculated)
  }, [projections])

  // 🧠 BUSCAR PROJEÇÃO ATUAL
  const currentProjection = projections.find((p) => p.month === month && p.year === year) || null

  // 🔄 CARREGAR PROJEÇÕES DO STORAGE/API
  useEffect(() => {
    // Tentar carregar do localStorage primeiro
    const stored = localStorage.getItem("financial-projections")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Validar estrutura dos dados
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjections(parsed)
        } else {
          generateProjections(month, year, 6)
        }
      } catch (err) {
        console.error("Error loading projections:", err)
        generateProjections(month, year, 6)
      }
    } else {
      // Gerar projeções iniciais (6 meses para frente)
      generateProjections(month, year, 6)
    }
  }, [month, year, generateProjections])

  // SALVAR PROJEÇÕES NO STORAGE
  useEffect(() => {
    if (projections.length > 0) {
      try {
        localStorage.setItem("financial-projections", JSON.stringify(projections))
      } catch (err) {
        console.error("Error saving projections:", err)
      }
    }
  }, [projections])

  return {
    projections,
    currentProjection,
    loading,
    error,
    updateField,
    generateProjections,
    recalculateAll,
  }
}

// 🧠 HELPER PARA VERIFICAR SE CAMPO É MANUAL
export function isFieldManual(
  projection: MonthlyProjection | null,
  field: "receita" | "despesas" | "percentualInvestimento"
): boolean {
  if (!projection) return false
  return projection[field].isManual
}

// 🧠 HELPER PARA OBTER VALOR FORMATADO
export function getFieldValue(
  projection: MonthlyProjection | null,
  field: "receita" | "despesas" | "percentualInvestimento"
): number {
  if (!projection) return 0
  return projection[field].value
}

// 🧠 HELPER PARA SIMULAR EFEITO CASCATA
export function simulateCascadeEffect(
  projections: MonthlyProjection[],
  changedIndex: number
): MonthlyProjection[] {
  const result = [...projections]

  for (let i = changedIndex + 1; i < result.length; i++) {
    const previous = result[i - 1]
    const current = result[i]
    if (previous && current) {
      result[i] = calcularMes(current, previous, DEFAULT_PERCENTUAL)
    }
  }

  return result
}
