"use client"

import { useState, useEffect, useCallback } from "react"
import { useDashboard } from "@/contexts/dashboard-context"

interface FinancialData {
  receitas: number
  despesas: number
  investimentos: number
  resultado: number
  saldo_anterior: number
  saldo_final: number
  transactions: Transaction[]
  investments: Investment[]
}

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  type: "income" | "expense" | "investment" | "investment_withdraw"
  amount: number
  status: "green" | "yellow" | "red"
}

interface Investment {
  id: string
  date: string
  asset: string
  type: string
  amount: number
  category: string
}

export function useFinancialData() {
  const { month, year } = useDashboard()
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [transactionsRes, investmentsRes, balanceRes] = await Promise.all([
        fetch(`/api/transactions?month=${month}&year=${year}`).then((res) =>
          res.ok ? res.json() : []
        ),
        fetch(`/api/investments?month=${month}&year=${year}`).then((res) =>
          res.ok ? res.json() : []
        ),
        fetch(`/api/balance?month=${month}&year=${year}`).then((res) =>
          res.ok ? res.json() : { saldo_anterior: 0 }
        ),
      ])

      // Process transactions according to business rules
      const receitas = transactionsRes
        .filter((t: Transaction) => t.amount > 0 && t.type !== "investment_withdraw")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

      const despesas = transactionsRes
        .filter((t: Transaction) => t.amount < 0 && t.type !== "investment")
        .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0)

      const investimentos = transactionsRes
        .filter((t: Transaction) => t.type === "investment" || t.type === "investment_withdraw")
        .reduce((sum: number, t: Transaction) => {
          if (t.type === "investment") return sum - Math.abs(t.amount)
          if (t.type === "investment_withdraw") return sum + t.amount
          return sum
        }, 0)

      const resultado = receitas - despesas + investimentos
      const saldo_final = balanceRes.saldo_anterior + resultado

      setData({
        receitas,
        despesas,
        investimentos,
        resultado,
        saldo_anterior: balanceRes.saldo_anterior,
        saldo_final,
        transactions: transactionsRes,
        investments: investmentsRes,
      })
    } catch (err) {
      setError("Não foi possível carregar os dados financeiros.")
      console.error("Financial data error:", err)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    refetch: loadData,
  }
}
