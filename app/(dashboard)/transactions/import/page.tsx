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
  const [step, setStep] = useState<"upload" | "preview" | "review" | "confirm">("upload")
  const [reviewData, setReviewData] = useState<any[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const ofxExcelInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (data: ParsedRow[], fileHeaders: string[]) => {
    setCsvData(data)
    setHeaders(fileHeaders)
    setImportSource("csv")

    // Processamento automático com IA
    setIsParsing(true)
    try {
      const response = await fetch("/api/transactions/import/auto-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: fileHeaders, rows: data }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Falha no processamento automático")
      }

      setReviewData(result.transactions)
      setStep("review")

      toast({
        title: "Processamento Automático Concluído!",
        description: `${result.transactions.length} transações processadas com ${result.confidence.toFixed(1)}% de confiança`,
      })

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Avisos",
          description: `${result.errors.length} linhas não puderam ser processadas`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro no processamento",
        description:
          error instanceof Error ? error.message : "Não foi possível processar o arquivo",
        variant: "destructive",
      })
      setStep("preview") // Fallback para preview manual
    } finally {
      setIsParsing(false)
    }
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
          date: t.date?.slice(0, 10)
            ? `${t.date.slice(0, 10)}T12:00:00.000Z`
            : new Date().toISOString(),
        }))
        setReviewData(withIds)
        setImportSource("ofx")
        setStep("review")
        toast({ title: `${withIds.length} transações extraídas do OFX` })
      } else if (
        data.format === "xlsx" &&
        Array.isArray(data.headers) &&
        Array.isArray(data.rows)
      ) {
        // Processamento automático para Excel também
        try {
          const autoMapResponse = await fetch("/api/transactions/import/auto-map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ headers: data.headers, rows: data.rows }),
          })

          const autoMapResult = await autoMapResponse.json()
          if (autoMapResponse.ok) {
            setReviewData(autoMapResult.transactions)
            setStep("review")
            toast({
              title: "Excel processado automaticamente!",
              description: `${autoMapResult.transactions.length} transações processadas`,
            })
          } else {
            setHeaders(data.headers)
            setCsvData(data.rows)
            setImportSource("xlsx")
            setStep("preview")
            toast({ title: "Planilha carregada. Faça o mapeamento das colunas." })
          }
        } catch (error) {
          setHeaders(data.headers)
          setCsvData(data.rows)
          setImportSource("xlsx")
          setStep("preview")
          toast({ title: "Planilha carregada. Faça o mapeamento das colunas." })
        }
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

      // Validação básica antes de enviar
      const validationErrors: string[] = []
      console.log("Dados das transações para validação:", mappedTransactions.slice(0, 3))

      mappedTransactions.forEach((transaction, index) => {
        console.log(`Validando linha ${index + 1}:`, transaction)

        // Validação de tipo
        if (!transaction.type) {
          validationErrors.push(`Linha ${index + 1}: Tipo é obrigatório (vazio)`)
        } else if (!["INCOME", "EXPENSE", "TRANSFER"].includes(transaction.type)) {
          validationErrors.push(
            `Linha ${index + 1}: Tipo inválido "${transaction.type}". Use: INCOME, EXPENSE ou TRANSFER`
          )
        }

        // Validação de categoria
        if (!transaction.category || transaction.category.trim() === "") {
          validationErrors.push(`Linha ${index + 1}: Categoria é obrigatória (vazia)`)
        }

        // Validação de descrição
        if (!transaction.description || transaction.description.trim() === "") {
          validationErrors.push(`Linha ${index + 1}: Descrição é obrigatória (vazia)`)
        }

        // Validação de valor
        if (transaction.amount === undefined || transaction.amount === null) {
          validationErrors.push(`Linha ${index + 1}: Valor é obrigatório (nulo/indefinido)`)
        } else if (isNaN(transaction.amount)) {
          validationErrors.push(
            `Linha ${index + 1}: Valor deve ser um número válido (recebeu: ${transaction.amount})`
          )
        } else if (transaction.amount <= 0) {
          validationErrors.push(
            `Linha ${index + 1}: Valor deve ser positivo (recebeu: ${transaction.amount})`
          )
        }

        // Validação de data
        if (!transaction.date) {
          validationErrors.push(`Linha ${index + 1}: Data é obrigatória (vazia)`)
        } else {
          const dateObj = new Date(transaction.date)
          if (isNaN(dateObj.getTime())) {
            validationErrors.push(
              `Linha ${index + 1}: Data inválida (recebeu: "${transaction.date}")`
            )
          }
        }
      })

      if (validationErrors.length > 0) {
        throw new Error(`Erros de validação:\n${validationErrors.join("\n")}`)
      }

      console.log("Enviando transações para API:", mappedTransactions)

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: mappedTransactions }),
      })
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Importação concluída!",
          description: `${result.results.success} transações importadas com sucesso. ${result.results.failed} falharam. ${result.results.duplicates || 0} duplicatas ignoradas.`,
        })
        window.dispatchEvent(new CustomEvent("transaction-updated"))
        router.push("/transactions")
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Erro na importação:", errorData)
        throw new Error(errorData.message || errorData.error || "Erro desconhecido")
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Não foi possível importar as transações"
      toast({
        title: "Erro na Importação",
        description: errorMessage,
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
            step === "review" || step === "confirm"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          3
        </div>
        <span
          className={
            step === "review" || step === "confirm" ? "font-medium" : "text-muted-foreground"
          }
        >
          Revisão
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
          onContinue={async () => {
            // Tentar processamento automático mesmo no preview
            setIsParsing(true)
            try {
              const response = await fetch("/api/transactions/import/auto-map", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ headers, rows: csvData }),
              })

              const result = await response.json()
              if (response.ok) {
                setReviewData(result.transactions)
                setStep("review")
                toast({
                  title: "Processamento Automático!",
                  description: `${result.transactions.length} transações processadas`,
                })
              } else {
                toast({
                  title: "Não foi possível processar automaticamente",
                  description: "Verifique o formato dos dados",
                  variant: "destructive",
                })
              }
            } catch (error) {
              toast({
                title: "Erro no processamento",
                description: "Tente novamente",
                variant: "destructive",
              })
            } finally {
              setIsParsing(false)
            }
          }}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "review" && (
        <ReviewImport
          transactions={reviewData}
          onConfirm={handleReviewConfirm}
          onBack={() => setStep("preview")}
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
