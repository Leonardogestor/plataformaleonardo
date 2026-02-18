"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { DashboardStats } from "@/components/dashboard/stats"
import { NetWorthChart } from "@/components/dashboard/net-worth-chart"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { InsightCard } from "@/components/dashboard/insight-card"
import { ProjectionsCard } from "@/components/dashboard/projections-card"
import { GoalsProgress } from "@/components/dashboard/goals-progress"
import { CardsSummary } from "@/components/dashboard/cards-summary"
import { InvestmentsSummary } from "@/components/dashboard/investments-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, FileText, ChevronRight, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

const ConnectBankDialog = dynamic(
  () =>
    import("@/components/accounts/connect-bank-dialog").then((mod) => ({
      default: mod.ConnectBankDialog,
    })),
  { ssr: false }
)

interface DashboardData {
  metrics: { netWorth: number; monthIncome: number; monthExpense: number; cashFlow: number; savingsRate: number }
  monthlyData: { month: string; income: number; expense: number; netWorth: number }[]
  recentTransactions: unknown[]
  insights: string[]
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [investments, setInvestments] = useState<InvestmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch("/api/dashboard").then((res) => (res.ok ? res.json() : Promise.reject(new Error("Dashboard")))),
      fetch("/api/goals").then((res) => (res.ok ? res.json() : [])).then((list: unknown) => {
        const arr = Array.isArray(list) ? list : []
        return arr.map((g: unknown) => {
          const x = g as { id: string; name: string; targetAmount: unknown; currentAmount: unknown }
          return { id: x.id, name: x.name, targetAmount: Number(x.targetAmount), currentAmount: Number(x.currentAmount) }
        })
      }).catch(() => []),
      fetch("/api/cards").then((res) => (res.ok ? res.json() : [])).then((list: { id: string; name: string; limit: unknown }[]) =>
        list.map((c) => ({ id: c.id, name: c.name, limit: Number(c.limit), currentBalance: 0 }))
      ).catch(() => []),
      fetch("/api/investments").then((res) => (res.ok ? res.json() : [])).then((list: { id: string; type: string; currentValue: unknown }[]) =>
        list.map((i) => ({ id: i.id, type: i.type, currentValue: Number(i.currentValue) }))
      ).catch(() => []),
    ])
      .then(([dashboard, goalsList, cardsList, investmentsList]) => {
        setData(dashboard)
        setGoals(Array.isArray(goalsList) ? goalsList : [])
        setCards(Array.isArray(cardsList) ? cardsList : [])
        setInvestments(Array.isArray(investmentsList) ? investmentsList : [])
      })
      .catch(() => setError("Não foi possível carregar o dashboard."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const onConnected = () => loadDashboard()
    window.addEventListener("open-finance:connected", onConnected)
    return () => window.removeEventListener("open-finance:connected", onConnected)
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{error ?? "Dados não disponíveis."}</p>
      </div>
    )
  }

  const { metrics, monthlyData, recentTransactions, insights } = data
  const evolutionData = monthlyData.map((m) => ({ month: m.month, netWorth: m.netWorth }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Relatório Geral de Finanças
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Passado, presente e futuro da sua vida financeira.
        </p>
      </div>

      <Tabs defaultValue="presente" className="w-full">
        <TabsList className="inline-flex h-9 rounded-lg bg-muted/80 p-1">
          <TabsTrigger value="passado" className="rounded-md px-4">Passado</TabsTrigger>
          <TabsTrigger value="presente" className="rounded-md px-4">Presente</TabsTrigger>
          <TabsTrigger value="futuro" className="rounded-md px-4">Futuro</TabsTrigger>
        </TabsList>

        <TabsContent value="passado" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Evolução patrimonial</CardTitle>
              <CardDescription>Sua trajetória nos últimos meses.</CardDescription>
            </CardHeader>
            <CardContent>
              <NetWorthChart
                evolutionData={evolutionData.length ? evolutionData : undefined}
                initialBalance={0}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presente" className="mt-6 space-y-6">
          <DashboardStats
            netWorth={metrics.netWorth}
            monthIncome={metrics.monthIncome}
            monthExpense={metrics.monthExpense}
            cashFlow={metrics.cashFlow}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <CashFlowChart
              monthIncome={metrics.monthIncome}
              monthExpense={metrics.monthExpense}
              monthlyData={monthlyData}
            />
            <ProjectionsCard />
          </div>
          {insights.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold">Insights</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((text, i) => (
                  <InsightCard key={i} text={text} />
                ))}
              </div>
            </div>
          )}
          <RecentTransactions
            transactions={
              recentTransactions as {
                id: string
                date: string | Date
                description: string
                category?: string | null
                type: string
                amount: number
              }[]
            }
          />
          <GoalsProgress goals={goals} />
          <div className="grid gap-4 md:grid-cols-2">
            <CardsSummary cards={cards} />
            <InvestmentsSummary investments={investments} />
          </div>
        </TabsContent>

        <TabsContent value="futuro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Projeções</CardTitle>
              <CardDescription>Cenários de patrimônio e impacto de parcelados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simule cenários e prazos na página de projeções.
              </p>
              <Button asChild>
                <Link href="/projections" className="inline-flex items-center gap-2">
                  Abrir projeções <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-border/60 bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Dados conectados
          </CardTitle>
          <CardDescription>
            Conecte suas contas bancárias e envie PDFs para uma visão completa das suas finanças.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ConnectBankDialog />
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents" className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Enviar PDF
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
