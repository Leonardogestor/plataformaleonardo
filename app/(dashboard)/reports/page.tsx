"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, FileText, FileSpreadsheet } from "lucide-react"
import { MonthlyReportView } from "@/components/reports/monthly-report-view"
import { AnnualReportView } from "@/components/reports/annual-report-view"
import { ReportsSkeleton } from "@/components/ui/loading-skeletons"
import { useToast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear + 2 - i) // 2026, 2025, 2024, 2023, 2022
  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        type: reportType,
        year: selectedYear.toString(),
        ...(reportType === "monthly" && { month: selectedMonth.toString() }),
      })

      const response = await fetch(`/api/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [reportType, selectedMonth, selectedYear, toast])
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        type: "report",
        reportType,
        format,
        year: selectedYear.toString(),
        ...(reportType === "monthly" && { month: selectedMonth.toString() }),
      })

      const response = await fetch(`/api/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download =
          reportType === "monthly"
            ? `relatorio_mensal_${selectedMonth}_${selectedYear}.${format === "excel" ? "xlsx" : format}`
            : `relatorio_anual_${selectedYear}.${format === "excel" ? "xlsx" : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Exportação concluída!",
          description: `Relatório exportado como ${format.toUpperCase()}`,
        })
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="mb-2">
        <h2 className="text-4xl font-bold tracking-tight mb-1">Relatório Executivo</h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Uma visão estratégica e consultiva das suas finanças. Entenda rapidamente o que aconteceu,
          o que mudou e o que isso significa para suas decisões.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período do Relatório
          </CardTitle>
          <CardDescription>
            Escolha o período para análise executiva e exporte para PDF ou Excel. Nenhuma edição é
            permitida nesta tela.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Tipo:</label>
            <Select
              value={reportType}
              onValueChange={(value: "monthly" | "annual") => setReportType(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportType === "monthly" && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mês:</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Ano:</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={isExporting || !reportData}
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            disabled={isExporting || !reportData}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <ReportsSkeleton />
      ) : reportData ? (
        <div className="space-y-6">
          {reportType === "monthly" ? (
            <MonthlyReportView data={reportData} />
          ) : (
            <AnnualReportView data={reportData} />
          )}
        </div>
      ) : null}
    </div>
  )
}
