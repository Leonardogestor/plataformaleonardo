"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useGlobalDate } from "@/contexts/global-date-context"
import { useRealTimeUpdates } from "./use-real-time-updates"
import {
  Transaction,
  FinancialCalculations,
  calculateFinancialMetrics,
  classifyFarol,
} from "@/types/financial"

// API fetchers com tratamento de erro melhorado
const fetchTransactions = async (month: number, year: number): Promise<Transaction[]> => {
  try {
    const response = await fetch(`/api/transactions?month=${month}&year=${year}`)
    if (!response.ok) {
      console.error(`Failed to fetch transactions: ${response.status}`)
      return []
    }
    const data = await response.json()

    // Verificar se data.transactions existe e é um array
    if (data && data.transactions && Array.isArray(data.transactions)) {
      return data.transactions
    }

    // Se for um array direto, retornar
    if (Array.isArray(data)) {
      return data
    }

    console.warn("Unexpected API response format:", data)
    return []
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
}

const fetchPreviousMonthTransactions = async (
  month: number,
  year: number
): Promise<Transaction[]> => {
  try {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const response = await fetch(`/api/transactions?month=${prevMonth}&year=${prevYear}`)
    if (!response.ok) {
      console.error(`Failed to fetch previous transactions: ${response.status}`)
      return []
    }
    const data = await response.json()

    if (data && data.transactions && Array.isArray(data.transactions)) {
      return data.transactions
    }

    if (Array.isArray(data)) {
      return data
    }

    console.warn("Unexpected API response format for previous month:", data)
    return []
  } catch (error) {
    console.error("Error fetching previous transactions:", error)
    return []
  }
}

const fetchBalance = async (month: number, year: number): Promise<{ saldo_anterior: number }> => {
  try {
    const response = await fetch(`/api/balance?month=${month}&year=${year}`)
    if (!response.ok) {
      console.error(`Failed to fetch balance: ${response.status}`)
      return { saldo_anterior: 0 }
    }
    const data = await response.json()
    return data || { saldo_anterior: 0 }
  } catch (error) {
    console.error("Error fetching balance:", error)
    return { saldo_anterior: 0 }
  }
}

const fetchInvestments = async (month: number, year: number): Promise<any[]> => {
  try {
    const response = await fetch(`/api/investments?month=${month}&year=${year}`)
    if (!response.ok) {
      console.error(`Failed to fetch investments: ${response.status}`)
      return []
    }
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Error fetching investments:", error)
    return []
  }
}

// Main hook for financial data with React Query
export function useFinancialDataSafe() {
  const { month, year } = useGlobalDate()
  const queryClient = useQueryClient()

  // 🔥 Atualizações em tempo real
  useRealTimeUpdates()

  // Fetch all data in parallel
  const transactionsQuery = useQuery({
    queryKey: ["transactions", month, year],
    queryFn: () => fetchTransactions(month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  })

  const previousTransactionsQuery = useQuery({
    queryKey: ["transactions", month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year],
    queryFn: () => fetchPreviousMonthTransactions(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })

  const balanceQuery = useQuery({
    queryKey: ["balance", month, year],
    queryFn: () => fetchBalance(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })

  const investmentsQuery = useQuery({
    queryKey: ["investments", month, year],
    queryFn: () => fetchInvestments(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })

  // Calculate financial metrics when transactions are loaded
  const calculations = transactionsQuery.data
    ? calculateFinancialMetrics(transactionsQuery.data)
    : null

  const previousCalculations = previousTransactionsQuery.data
    ? calculateFinancialMetrics(previousTransactionsQuery.data)
    : null

  // Add farol classification to transactions com verificação
  const transactionsWithFarol = transactionsQuery.data
    ? transactionsQuery.data.map((transaction) => {
        try {
          return {
            ...transaction,
            farol: classifyFarol(calculations?.savingsRate || 0),
          }
        } catch (error) {
          console.error("Error classifying transaction:", error)
          return {
            ...transaction,
            farol: "red" as const,
          }
        }
      })
    : []

  // Calculate final balance com verificação
  const finalBalance =
    calculations && balanceQuery.data
      ? balanceQuery.data.saldo_anterior + calculations.resultado
      : null

  const isLoading =
    transactionsQuery.isLoading ||
    previousTransactionsQuery.isLoading ||
    balanceQuery.isLoading ||
    investmentsQuery.isLoading

  const error =
    transactionsQuery.error ||
    previousTransactionsQuery.error ||
    balanceQuery.error ||
    investmentsQuery.error

  return {
    transactions: transactionsWithFarol,
    investments: investmentsQuery.data || [],
    calculations,
    previousCalculations,
    finalBalance,
    previousBalance: balanceQuery.data?.saldo_anterior || 0,
    isLoading,
    error,
    refetch: () => {
      transactionsQuery.refetch()
      previousTransactionsQuery.refetch()
      balanceQuery.refetch()
      investmentsQuery.refetch()
    },
    // Função para forçar atualização completa
    forceRefresh: () => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["balance"] })
      queryClient.invalidateQueries({ queryKey: ["investments"] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })

      // Refetch all data
      transactionsQuery.refetch()
      previousTransactionsQuery.refetch()
      balanceQuery.refetch()
      investmentsQuery.refetch()
    },
  }
}

// Individual hooks for specific data
export function useTransactionsSafe() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["transactions", month, year],
    queryFn: () => fetchTransactions(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}

export function useBalanceSafe() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["balance", month, year],
    queryFn: () => fetchBalance(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}

export function useInvestmentsSafe() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["investments", month, year],
    queryFn: () => fetchInvestments(month, year),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}
