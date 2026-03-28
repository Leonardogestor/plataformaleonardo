"use client"

import { useQuery } from "@tanstack/react-query"
import { useGlobalDate } from "@/contexts/global-date-context"
import {
  Transaction,
  FinancialCalculations,
  calculateFinancialMetrics,
  classifyFarol,
} from "@/types/financial"

// API fetchers
const fetchTransactions = async (month: number, year: number): Promise<Transaction[]> => {
  const response = await fetch(`/api/transactions?month=${month}&year=${year}`)
  if (!response.ok) throw new Error("Failed to fetch transactions")
  return response.json()
}

const fetchPreviousMonthTransactions = async (
  month: number,
  year: number
): Promise<Transaction[]> => {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const response = await fetch(`/api/transactions?month=${prevMonth}&year=${prevYear}`)
  if (!response.ok) throw new Error("Failed to fetch previous transactions")
  return response.json()
}

const fetchBalance = async (month: number, year: number): Promise<{ saldo_anterior: number }> => {
  const response = await fetch(`/api/balance?month=${month}&year=${year}`)
  if (!response.ok) throw new Error("Failed to fetch balance")
  return response.json()
}

const fetchInvestments = async (month: number, year: number): Promise<any[]> => {
  const response = await fetch(`/api/investments?month=${month}&year=${year}`)
  if (!response.ok) throw new Error("Failed to fetch investments")
  return response.json()
}

// Main hook for financial data with React Query
export function useFinancialData() {
  const { month, year } = useGlobalDate()

  // Fetch all data in parallel
  const transactionsQuery = useQuery({
    queryKey: ["transactions", month, year],
    queryFn: () => fetchTransactions(month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const previousTransactionsQuery = useQuery({
    queryKey: ["transactions", month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year],
    queryFn: () => fetchPreviousMonthTransactions(month, year),
    staleTime: 1000 * 60 * 5,
  })

  const balanceQuery = useQuery({
    queryKey: ["balance", month, year],
    queryFn: () => fetchBalance(month, year),
    staleTime: 1000 * 60 * 5,
  })

  const investmentsQuery = useQuery({
    queryKey: ["investments", month, year],
    queryFn: () => fetchInvestments(month, year),
    staleTime: 1000 * 60 * 5,
  })

  // Calculate financial metrics when transactions are loaded
  const calculations = transactionsQuery.data
    ? calculateFinancialMetrics(transactionsQuery.data)
    : null

  const previousCalculations = previousTransactionsQuery.data
    ? calculateFinancialMetrics(previousTransactionsQuery.data)
    : null

  // Add farol classification to transactions
  const transactionsWithFarol =
    transactionsQuery.data?.map((transaction) => ({
      ...transaction,
      farol: classifyFarol(calculations?.savingsRate || 0),
    })) || []

  // Calculate final balance
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
  }
}

// Individual hooks for specific data
export function useTransactions() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["transactions", month, year],
    queryFn: () => fetchTransactions(month, year),
    staleTime: 1000 * 60 * 5,
  })
}

export function useBalance() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["balance", month, year],
    queryFn: () => fetchBalance(month, year),
    staleTime: 1000 * 60 * 5,
  })
}

export function useInvestments() {
  const { month, year } = useGlobalDate()

  return useQuery({
    queryKey: ["investments", month, year],
    queryFn: () => fetchInvestments(month, year),
    staleTime: 1000 * 60 * 5,
  })
}
