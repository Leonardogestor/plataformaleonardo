"use client"

import { PeriodHeader } from "@/components/global/period-header"
import { StrategicDashboard } from "@/components/dashboard/strategic-dashboard"
import { FinancialSummaryNew } from "@/components/dashboard/financial-summary-new"
import { FinancialTabs } from "@/components/dashboard/financial-tabs"
import { ProjectionsManager } from "@/components/dashboard/projections-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  Brain,
  TrendingUp,
} from "lucide-react"
import { useGlobalDate } from "@/contexts/global-date-context"
import { useFinancialData } from "@/hooks/use-financial-data-react-query"
import dynamic from "next/dynamic"

const DocumentUploadDialog = dynamic(
  () =>
    import("@/components/documents/document-upload-dialog").then((mod) => ({
      default: mod.DocumentUploadDialog,
    })),
  { ssr: false }
)

const BalanceSummary = dynamic(
  () =>
    import("@/components/dashboard/financial-summary").then((mod) => ({
      default: mod.BalanceSummary,
    })),
  { ssr: false }
)

export default function DashboardPage() {
  const { formatDateShort } = useGlobalDate()
  const { isLoading, error } = useFinancialData()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dados referentes a: {formatDateShort()}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Visão estratégica das suas finanças
            </p>
          </div>
          <div className="animate-pulse">
            <div className="h-9 w-64 bg-muted rounded-lg"></div>
          </div>
        </div>

        <StrategicDashboard />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-32"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-32"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PeriodHeader />
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-destructive font-medium">Erro ao carregar dados</p>
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar os dados financeiros. Tente novamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PeriodHeader />

      {/* New Financial Summary */}
      <FinancialSummaryNew />

      {/* Strategic Dashboard - Main Focus */}
      <StrategicDashboard />

      {/* Detailed Financial Tabs */}
      <Tabs defaultValue="atual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="atual">Dados Atuais</TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projeções
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atual">
          <FinancialTabs />
        </TabsContent>

        <TabsContent value="projections">
          <ProjectionsManager />
        </TabsContent>
      </Tabs>

      {/* Connected Data - Maintained */}
      <Card className="border-border/60 bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Dados conectados
          </CardTitle>
          <CardDescription>
            Envie PDFs ou planilhas Excel para uma visão completa das suas finanças.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <DocumentUploadDialog />
        </CardContent>
      </Card>
    </div>
  )
}
