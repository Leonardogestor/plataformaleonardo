"use client"

import { useState, useEffect } from 'react'
import { useDashboard } from '@/contexts/dashboard-context'

interface DashboardData {
  metrics: {
    netWorth: number
    monthIncome: number
    monthExpense: number
    cashFlow: number
    savingsRate: number
  }
  monthlyData: { month: string; income: number; expense: number; netWorth: number }[]
  recentTransactions: unknown[]
  insights: string[]
  risco_consolidado?: 'baixo' | 'moderado' | 'alto'
  tendencia_patrimonial?: 'ascendente' | 'estável' | 'descendente'
  impacto_longo_prazo?: string | null
  decisao_recomendada?: string | null
  independencia_financeira?: {
    patrimonioAtual: number
    despesaAnual: number
    patrimonioNecessario: number
    percentual: number
    mensagem: string
  } | null
}

interface GoalItem {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
}

interface CardItem {
  id: string
  name: string
  limit: number
  currentBalance?: number
}

interface InvestmentItem {
  id: string
  type: string
  currentValue: number
}

export function useDashboardData() {
  const { month, year } = useDashboard()
  const [data, setData] = useState<DashboardData | null>(null)
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [investments, setInvestments] = useState<InvestmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [dashboardRes, goalsRes, cardsRes, investmentsRes] = await Promise.all([
        fetch(`/api/dashboard?month=${month}&year=${year}`).then(res => 
          res.ok ? res.json() : Promise.reject(new Error('Dashboard'))
        ),
        fetch('/api/goals').then(res => 
          res.ok ? res.json() : []
        ).then((list: unknown[]) => {
          const arr = Array.isArray(list) ? list : []
          return arr.map((g: unknown) => {
            const x = g as { id: string; name: string; targetAmount: unknown; currentAmount: unknown }
            return { 
              id: x.id, 
              name: x.name, 
              targetAmount: Number(x.targetAmount), 
              currentAmount: Number(x.currentAmount) 
            }
          })
        }).catch(() => []),
        fetch('/api/cards').then(res => 
          res.ok ? res.json() : []
        ).then((list: { id: string; name: string; limit: unknown }[]) =>
          list.map((c) => ({ 
            id: c.id, 
            name: c.name, 
            limit: Number(c.limit), 
            currentBalance: 0 
          }))
        ).catch(() => []),
        fetch('/api/investments').then(res => 
          res.ok ? res.json() : []
        ).then((list: { id: string; type: string; currentValue: unknown }[]) =>
          list.map((i) => ({ 
            id: i.id, 
            type: i.type, 
            currentValue: Number(i.currentValue) 
          }))
        ).catch(() => []),
      ])

      setData(dashboardRes)
      setGoals(Array.isArray(goalsRes) ? goalsRes : [])
      setCards(Array.isArray(cardsRes) ? cardsRes : [])
      setInvestments(Array.isArray(investmentsRes) ? investmentsRes : [])
    } catch (err) {
      setError('Não foi possível carregar os dados do dashboard.')
      console.error('Dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load data when month/year changes
  useEffect(() => {
    loadData()
  }, [month, year])

  // Initial load
  useEffect(() => {
    loadData()
  }, [])

  return {
    data,
    goals,
    cards,
    investments,
    loading,
    error,
    refetch: loadData,
  }
}
