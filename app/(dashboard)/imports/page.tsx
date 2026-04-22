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
import { Upload, FileText, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ImportsPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [processedData, setProcessedData] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setProcessedData(Array.isArray(data) ? data : data.documents || [])
      }
    } catch (error) {
      console.error("Erro ao carregar documentos:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Arquivo obrigatorio",
        description: "Selecione pelo menos um arquivo",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))
      if (selectedBank) formData.append("bank", selectedBank)
      if (selectedMonth) formData.append("month", selectedMonth)
      if (selectedYear) formData.append("year", selectedYear)

      const response = await fetch("/api/documents", { method: "POST", body: formData })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao fazer upload")
      }

      const result = await response.json()
      toast({
        title: "Upload concluido",
        description: result.message || "Arquivo processado com sucesso",
      })

      if (result.documents?.length > 0) setProcessedData(result.documents)
      await loadDocuments()
      setFiles([])
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este documento?")) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Erro ao excluir")
      setProcessedData((prev) => prev.filter((doc) => doc.id !== id))
      toast({ title: "Documento excluido com sucesso" })
    } catch {
      toast({ title: "Erro ao excluir documento", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Excluir todos os ${processedData.length} documentos?`)) return
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setProcessedData([])
      toast({ title: "Todos os documentos foram excluidos" })
    } catch {
      toast({ title: "Erro ao excluir documentos", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importacao de Documentos</h1>
          <p className="text-muted-foreground">
            Importe extratos bancarios e documentos financeiros
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
              <Label>Banco (opcional)</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="itau">Itau</SelectItem>
                  <SelectItem value="bradesco">Bradesco</SelectItem>
                  <SelectItem value="santander">Santander</SelectItem>
                  <SelectItem value="bb">Banco do Brasil</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mes (opcional)</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Marco</SelectItem>
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
              <Label>Ano (opcional)</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Arquivos</Label>
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
            <div className="space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Processando..." : "Importar Arquivos"}
          </Button>
        </CardContent>
      </Card>

      {processedData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum documento encontrado</p>
          <p className="text-sm">Faca upload de arquivos PDF para comecar</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos Processados ({processedData.length})</CardTitle>
              <Button
                onClick={handleDeleteAll}
                variant="outline"
                size="sm"
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedData.map((doc, index) => (
                <div key={doc.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${doc.status === "COMPLETED" ? "bg-green-100 text-green-800" : doc.status === "PROCESSING" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                    >
                      {doc.status === "COMPLETED"
                        ? "Concluido"
                        : doc.status === "PROCESSING"
                          ? "Processando"
                          : "Falhou"}
                    </span>
                  </div>
                  {doc.errorMessage && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Erro: {doc.errorMessage}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingId === doc.id ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
