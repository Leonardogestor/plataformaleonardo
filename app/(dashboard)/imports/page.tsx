"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ImportsPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [processedData, setProcessedData] = useState<any[]>([])

  // Load existing documents on page mount
  useEffect(() => {
    loadDocuments()
  }, [])

  // Poll for updates every 5 seconds if there are processing documents
  useEffect(() => {
    const hasProcessing = processedData.some((doc) => doc.status === "PROCESSING")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      loadDocuments()
    }, 5000)

    return () => clearInterval(interval)
  }, [processedData])

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setProcessedData(data.documents || [])
        console.log("📊 Documentos carregados:", data)
      }
    } catch (error) {
      console.error("Error loading documents:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (!selectedBank || !selectedMonth || !selectedYear || files.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione arquivos",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("name", `Extrato ${selectedBank} - ${selectedMonth}/${selectedYear}`)

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao fazer upload")
      }

      const result = await response.json()

      toast({
        title: "Upload concluído",
        description: `${result.total || files.length} arquivo(s) processados com sucesso`,
      })

      // Show processed data immediately
      if (result.documents && result.documents.length > 0) {
        setProcessedData(result.documents)
        console.log("📄 Upload result:", result)
      }

      // Refresh documents list
      await loadDocuments()

      setFiles([])
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Erro no upload",
        description:
          error instanceof Error ? error.message : "Ocorreu um erro ao processar os arquivos",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importação de Documentos</h1>
          <p className="text-muted-foreground">
            Importe extratos bancários e documentos financeiros
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
          <CardDescription>Selecione os arquivos PDF ou Excel para importar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bank">Banco</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="itau">Itaú</SelectItem>
                  <SelectItem value="bradesco">Bradesco</SelectItem>
                  <SelectItem value="santander">Santander</SelectItem>
                  <SelectItem value="bb">Banco do Brasil</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="month">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Março</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Maio</SelectItem>
                  <SelectItem value="06">Junho</SelectItem>
                  <SelectItem value="07">Julho</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="files">Arquivos</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos selecionados:</Label>
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Processando..." : "Importar Arquivos"}
          </Button>
        </CardContent>
      </Card>

      {processedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum documento encontrado</p>
          <p className="text-sm">Faça upload de arquivos PDF para começar</p>
        </div>
      )}

      {processedData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos Processados ({processedData.length})
                </CardTitle>
                <CardDescription>Resultados do processamento dos seus arquivos</CardDescription>
              </div>
              <Button onClick={loadDocuments} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedData.map((doc, index) => (
                <div key={doc.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doc.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : doc.status === "PROCESSING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {doc.status === "COMPLETED"
                        ? "✅ Concluído"
                        : doc.status === "PROCESSING"
                          ? "⏳ Processando"
                          : "❌ Falhou"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tamanho:</span>
                      <p className="font-medium">
                        {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <p className="font-medium">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("pt-BR")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <p className="font-medium text-xs font-mono">{doc.id?.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Texto extraído:</span>
                      <p className="font-medium">
                        {doc.extractedText ? `${doc.extractedText.length} caracteres` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* 🔥 FORÇADO: Informações de processamento */}
                  {doc.processingInfo && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div>
                          <span className="text-blue-700 font-medium">Transações processadas:</span>
                          <p className="font-bold text-blue-900">
                            {doc.processingInfo.transactionsProcessed || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Tempo de processamento:</span>
                          <p className="font-bold text-blue-900">
                            {doc.processingInfo.processingTime || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Última atualização:</span>
                          <p className="font-bold text-blue-900">
                            {doc.processingInfo.lastUpdate
                              ? new Date(doc.processingInfo.lastUpdate).toLocaleTimeString("pt-BR")
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {doc.errorMessage && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>❌ Erro:</strong> {doc.errorMessage}
                    </div>
                  )}

                  {doc.extractedText && (
                    <div className="mb-3 p-3 bg-gray-50 border rounded text-sm">
                      <strong>📄 Preview do texto extraído:</strong>
                      <div className="mt-2 p-2 bg-white border rounded text-xs font-mono max-h-32 overflow-y-auto">
                        {doc.extractedText.slice(0, 300)}
                        {doc.extractedText.length > 300 ? "..." : ""}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    {doc.status === "COMPLETED" && (
                      <>
                        <Button size="sm" variant="outline">
                          📊 Ver Transações
                        </Button>
                        <Button size="sm" variant="outline">
                          📥 Exportar
                        </Button>
                      </>
                    )}
                    {doc.status === "FAILED" && (
                      <Button size="sm" variant="outline">
                        🔄 Reprocessar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 🔥 FORÇADO: Estatísticas gerais */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">📊 Estatísticas Gerais</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {processedData.filter((d) => d.status === "COMPLETED").length}
                  </div>
                  <div className="text-muted-foreground">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {processedData.filter((d) => d.status === "PROCESSING").length}
                  </div>
                  <div className="text-muted-foreground">Processando</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {processedData.filter((d) => d.status === "FAILED").length}
                  </div>
                  <div className="text-muted-foreground">Falharam</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {processedData.filter((d) => d.extractedText).length}
                  </div>
                  <div className="text-muted-foreground">Com texto</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Formatos suportados: PDF, Excel (XLSX), CSV</li>
            <li>• Tamanho máximo por arquivo: 10MB</li>
            <li>• Múltiplos arquivos podem ser selecionados</li>
            <li>• O processamento é feito automaticamente após o upload</li>
            <li>• Você será notificado quando o processamento for concluído</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
