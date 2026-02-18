"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Upload, FileSpreadsheet, FileUp, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CsvUpload } from "@/components/transactions/csv-upload"
import { CsvPreview } from "@/components/transactions/csv-preview"
import { CsvMapping } from "@/components/transactions/csv-mapping"

// Função utilitária para aplicar o mapeamento do usuário aos dados do CSV
function applyMapping(data: ParsedRow[], mapping: Record<string, string>) {
  return data.map((row) => {
    const mapped: any = {}
    Object.entries(mapping).forEach(([field, csvCol]) => {
      if (csvCol && row[csvCol] !== undefined) {
        mapped[field] = row[csvCol]
      }
    })
    return mapped
  })
}
import { ReviewImport } from "@/components/transactions/review-import"

interface ParsedRow {
  [key: string]: string
}

type ImportSource = "csv" | "ofx" | "xlsx" | null

export default function ImportTransactionsPage() {
  const [csvData, setCsvData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importSource, setImportSource] = useState<ImportSource>(null)

  const [isImporting, setIsImporting] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "mapping" | "review" | "confirm">(
    "upload"
  )
  const [reviewData, setReviewData] = useState<any[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const ofxExcelInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (data: ParsedRow[], fileHeaders: string[]) => {
    setCsvData(data)
    setHeaders(fileHeaders)
    setImportSource("csv")
    setStep("preview")
  }

  const handleOfxExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith(".ofx") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast({
        title: "Formato inválido",
        description: "Use arquivo .ofx, .xlsx ou .xls",
        variant: "destructive",
      })
      return
    }
    setIsParsing(true)
    e.target.value = ""
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/transactions/import/parse", {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar arquivo")
      }
      if (data.format === "ofx" && Array.isArray(data.transactions)) {
        const withIds = data.transactions.map((t: any, i: number) => ({
          id: `ofx-${i}`,
          type: t.type,
          category: t.category || "Importado",
          amount: String(t.amount),
          description: t.description,
          date: t.date?.slice(0, 10) ? `${t.date.slice(0, 10)}T12:00:00.000Z` : new Date().toISOString(),
        }))
        setReviewData(withIds)
        setImportSource("ofx")
        setStep("review")
        toast({ title: `${withIds.length} transações extraídas do OFX` })
      } else if (data.format === "xlsx" && Array.isArray(data.headers) && Array.isArray(data.rows)) {
        setHeaders(data.headers)
        setCsvData(data.rows)
        setImportSource("xlsx")
        setStep("preview")
        toast({ title: "Planilha carregada. Faça o mapeamento das colunas." })
      } else {
        throw new Error("Resposta inválida do servidor")
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível processar o arquivo",
        variant: "destructive",
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleReviewConfirm = (data: any[]) => {
    setReviewData(data)
    setStep("confirm")
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      // Remove id temporário antes de enviar
      const mappedTransactions = reviewData.map(({ id, ...rest }) => ({
        ...rest,
        amount: parseFloat(rest.amount || "0"),
      }))
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: mappedTransactions }),
      })
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Importação concluída!",
          description: `${result.results.success} transações importadas com sucesso. ${result.results.failed} falharam.`,
        })
        window.dispatchEvent(new CustomEvent("transaction-updated"))
        router.push("/transactions")
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível importar as transações",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Transações</h1>
          <p className="text-muted-foreground">
            Importe de CSV, OFX (extrato bancário) ou Excel (XLS/XLSX)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          1
        </div>
        <span className={step === "upload" ? "font-medium" : "text-muted-foreground"}>Upload</span>
        <div className="h-px w-12 bg-border" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "preview" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          2
        </div>
        <span className={step === "preview" ? "font-medium" : "text-muted-foreground"}>
          Preview
        </span>
        <div className="h-px w-12 bg-border" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "mapping" || step === "confirm"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          3
        </div>
        <span
          className={
            step === "mapping" || step === "confirm" ? "font-medium" : "text-muted-foreground"
          }
        >
          Mapeamento
        </span>
        <div className="h-px w-12 bg-border" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "confirm" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          4
        </div>
        <span className={step === "confirm" ? "font-medium" : "text-muted-foreground"}>
          Confirmar
        </span>
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <CsvUpload onUpload={handleFileUpload} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                OFX ou Excel
              </CardTitle>
              <CardDescription>
                Extrato bancário (.ofx) ou planilha (.xlsx, .xls). OFX vai direto para revisão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  ref={ofxExcelInputRef}
                  type="file"
                  accept=".ofx,.xlsx,.xls"
                  className="hidden"
                  onChange={handleOfxExcelUpload}
                  disabled={isParsing}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isParsing}
                  onClick={() => ofxExcelInputRef.current?.click()}
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar OFX ou Excel
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {isParsing ? "Processando..." : "Selecione o arquivo"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <CsvPreview
          data={csvData}
          onContinue={() => setStep("mapping")}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "mapping" && (
        <CsvMapping
          headers={headers}
          data={csvData}
          onBack={() => setStep("preview")}
          onMapping={(mapping) => {
            setReviewData(applyMapping(csvData, mapping))
            setStep("review")
          }}
        />
      )}

      {step === "review" && (
        <ReviewImport
          transactions={reviewData}
          onConfirm={handleReviewConfirm}
          onBack={() => setStep(importSource === "ofx" ? "upload" : "mapping")}
        />
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Confirmar Importação
            </CardTitle>
            <CardDescription>
              Revise e confirme a importação das transações editadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">{reviewData.length} transações serão importadas</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("review")}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={isImporting} className="flex-1">
                {isImporting ? (
                  "Importando..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar {reviewData.length} Transações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
