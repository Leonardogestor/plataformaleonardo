"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Upload, FileText as FileTextIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  confidence?: number
}

interface AIParserResult {
  transactions: ParsedTransaction[]
  summary: {
    totalProcessed: number
    successful: number
    confidence: number
    notes?: string
  }
}

export function AITransactionParserDemo() {
  const [inputData, setInputData] = useState("")
  const [result, setResult] = useState<AIParserResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const sampleData = {
    pdf: `EXTRATO BANCO DO BRASIL
Data Histórico Valor
15/03/2024 Supermercado ABC -125,50
15/03/2024 Salário Mensal 5.000,00
16/03/2024 Uber Viagem -45,80
16/03/2024 Netflix -39,90
17/03/2024 Transferência TED -1.200,00
18/03/2024 Farmácia São João -89,90`,

    excel: `Data,Descrição,Valor,Tipo
15/03/2024,Supermercado ABC,-125,50,DESPESA
15/03/2024,Salário Mensal,5000,RECEITA
16/03/2024,Uber Viagem,-45,80,DESPESA
16/03/2024,Netflix,-39,90,DESPESA
17/03/2024,Transferência TED,-1200,TRANSFERENCIA`,

    csv: `15/03/2024;Supermercado ABC;125,50;DÉBITO
15/03/2024;Salário Mensal;5.000,00;CRÉDITO
16/03/2024;Uber Viagem;45,80;DÉBITO
16/03/2024;Netflix;39,90;DÉBITO
17/03/2024;Farmácia São João;89,90;DÉBITO`,

    text: `15/03 Pagamento Uber 45.80
16/03 Recebimento salario 5000.00 
17/03 Compra mercado 125.50
18/03 Netflix mensalidade 39.90
19/03 Farmacia droga raia 89.90`,

    ocr: `EXTRATO BANCO 00 BRASIL
1S/03/2024 SUPERMERCAD0 ABC -l25,5O
1S/03/2024 SAI.AR|0 MEN5AL 5.0OO,OO
16/03/2024 U6ER VIAGEM -45,8O
16/03/2024 NETFLIX -39,9O
17/03/2024 TRANSFERENCIA TED -l.2OO,OO
18/03/2024 FARMACIA SÃO J0ÃO -89,9O`,
  }

  const handleParse = async (sourceType: "pdf" | "excel" | "csv" | "text") => {
    if (!inputData.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira alguns dados para analisar",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/parse-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: inputData,
          options: {
            sourceType,
            confidence: true,
            existingCategories: [
              "ALIMENTAÇÃO",
              "TRANSPORTE",
              "ENTRETENIMENTO",
              "SAÚDE",
              "EDUCAÇÃO",
              "MORADIA",
              "DROGARIA",
              "VESTUÁRIO",
              "SERVIÇOS",
              "IMPOSTOS",
              "OUTROS",
              "RENDA",
            ],
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to parse transactions")
      }

      const data: AIParserResult = await response.json()
      setResult(data)

      toast({
        title: "Análise concluída!",
        description: `${data.summary.successful} transações processadas com ${Math.round(data.summary.confidence * 100)}% de confiança`,
      })
    } catch (error) {
      console.error("Parsing error:", error)
      toast({
        title: "Erro na análise",
        description: "Não foi possível processar os dados",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSample = (type: keyof typeof sampleData) => {
    setInputData(sampleData[type])
    setResult(null)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500"
    if (confidence >= 0.6) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return "bg-green-500"
    if (quality >= 0.6) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return "N/A"
    return `${Math.round(confidence * 100)}%`
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Transaction Parser Demo
          </CardTitle>
          <CardDescription>
            Teste o poder da IA para processar dados financeiros desestruturados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="input" className="w-full">
            <TabsList>
              <TabsTrigger value="input">Dados de Entrada</TabsTrigger>
              <TabsTrigger value="result">Resultado</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample("pdf")}
                  className="flex items-center gap-1"
                >
                  <FileTextIcon className="h-3 w-3" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample("excel")}
                  className="flex items-center gap-1"
                >
                  <Table className="h-3 w-3" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample("csv")}
                  className="flex items-center gap-1"
                >
                  <Upload className="h-3 w-3" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample("text")}
                  className="flex items-center gap-1"
                >
                  <FileTextIcon className="h-3 w-3" />
                  Texto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample("ocr")}
                  className="flex items-center gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <FileTextIcon className="h-3 w-3" />
                  OCR
                </Button>
              </div>

              <Textarea
                placeholder="Cole aqui os dados financeiros que deseja analisar..."
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => handleParse("text")}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {isLoading ? "Analisando..." : "Analisar com IA"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="result" className="space-y-4">
              {result ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resumo da Análise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.summary.totalProcessed}</div>
                          <div className="text-sm text-muted-foreground">Processadas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {result.summary.successful}
                          </div>
                          <div className="text-sm text-muted-foreground">Sucesso</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {Math.round(result.summary.confidence * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Confiança</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {Math.round((result.summary.confidence || 0) * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Qualidade</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {result.transactions
                              .reduce((sum, t) => (t.type === "INCOME" ? sum + t.amount : sum), 0)
                              .toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Receitas</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transações Detectadas</CardTitle>
                      <CardDescription>
                        {result.transactions.length} transações encontradas e processadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Confiança</TableHead>
                              <TableHead>Qualidade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.transactions.map((transaction, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{transaction.date}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {transaction.description}
                                </TableCell>
                                <TableCell>R$ {transaction.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      transaction.type === "INCOME"
                                        ? "default"
                                        : transaction.type === "EXPENSE"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {transaction.type === "INCOME"
                                      ? "Receita"
                                      : transaction.type === "EXPENSE"
                                        ? "Despesa"
                                        : "Transferência"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{transaction.category}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${getConfidenceColor(
                                        transaction.confidence || 0
                                      )}`}
                                    />
                                    <span className="text-sm">
                                      {getConfidenceText(transaction.confidence || 0)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${getQualityColor(
                                        transaction.confidence || 0
                                      )}`}
                                    />
                                    <span className="text-sm">
                                      {getConfidenceText(transaction.confidence || 0)}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <div className="text-center text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum resultado ainda. Analise alguns dados para ver os resultados.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
